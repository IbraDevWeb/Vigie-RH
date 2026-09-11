import { assertPermission, type ActorContext } from "@/application/authorization";
import type {
  ComplianceOverview,
  EmployeeComplianceOverview,
  OperationalAttentionLevel,
  OperationalPriority,
  OperationalPriorityUrgency,
} from "@/domain/compliance/overview";
import type { ComplianceTaskRecord } from "@/domain/compliance/task-record";
import type { EmployeeDocumentRecord } from "@/domain/employee/document-record";
import type { EmployeeRecord } from "@/domain/employee/record";
import type { AssessmentRecord, AssessmentRepository } from "@/infrastructure/repositories/assessment-repository";
import type { ComplianceTaskStore } from "@/infrastructure/repositories/compliance-task-store";
import type { EmployeeDocumentStore } from "@/infrastructure/repositories/employee-document-store";
import type { EmployeeStore } from "@/infrastructure/repositories/employee-store";

const OPEN_TASK_STATUSES = new Set(["todo", "doing"]);
const PRIORITY_LIMIT = 20;

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addUtcDays(value: Date, days: number): string {
  const copy = new Date(value);
  copy.setUTCDate(copy.getUTCDate() + days);
  return isoDate(copy);
}

function minString(values: Array<string | null>): string | null {
  const defined = values.filter((value): value is string => value !== null);
  return defined.length === 0 ? null : defined.sort()[0];
}

function employeeName(employee: EmployeeRecord | undefined): string | null {
  return employee ? `${employee.firstName} ${employee.lastName}` : null;
}

function latestAssessment(records: AssessmentRecord[]): AssessmentRecord | null {
  if (records.length === 0) return null;
  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

function taskUrgency(task: ComplianceTaskRecord, now: Date): OperationalPriorityUrgency {
  if (task.dueAt && new Date(task.dueAt).getTime() < now.getTime()) return "overdue";
  if (task.severity === "critical") return "critical";
  return "upcoming";
}

function attentionLevel(params: {
  latest: AssessmentRecord | null;
  currentDocuments: EmployeeDocumentRecord[];
  openTasks: ComplianceTaskRecord[];
  today: string;
  in90Days: string;
  now: Date;
}): OperationalAttentionLevel {
  const { latest, currentDocuments, openTasks, today, in90Days, now } = params;
  const hasExpiredCurrentDocument = currentDocuments.some(
    (document) => document.validUntil !== null && document.validUntil < today,
  );
  const hasCurrentDocumentExpiringSoon = currentDocuments.some(
    (document) => document.validUntil !== null
      && document.validUntil >= today
      && document.validUntil <= in90Days,
  );
  const hasOverdueTask = openTasks.some(
    (task) => task.dueAt !== null && new Date(task.dueAt).getTime() < now.getTime(),
  );
  const hasCriticalOpenTask = openTasks.some((task) => task.severity === "critical");

  if (
    hasExpiredCurrentDocument
    || latest?.resultSnapshot.status === "blocked"
    || openTasks.some(
      (task) => task.severity === "critical"
        && task.dueAt !== null
        && new Date(task.dueAt).getTime() < now.getTime(),
    )
  ) {
    return "urgent";
  }

  if (
    hasCurrentDocumentExpiringSoon
    || hasOverdueTask
    || hasCriticalOpenTask
    || latest?.resultSnapshot.status === "conditional"
    || latest?.resultSnapshot.status === "review_required"
  ) {
    return "attention";
  }

  if (!latest) return "unknown";
  return "no_open_signal";
}

export async function getComplianceOverview(
  employeeStore: EmployeeStore,
  documentStore: EmployeeDocumentStore,
  assessmentRepository: AssessmentRepository,
  taskStore: ComplianceTaskStore,
  actor: ActorContext,
  now = new Date(),
): Promise<ComplianceOverview> {
  assertPermission(actor, "employee:read");
  assertPermission(actor, "document:read");
  assertPermission(actor, "assessment:read");
  assertPermission(actor, "task:read");

  const [employees, documents, assessments, tasks] = await Promise.all([
    employeeStore.listByOrganization(actor.organizationId),
    documentStore.listByOrganization(actor.organizationId),
    assessmentRepository.listByOrganization(actor.organizationId),
    taskStore.listByOrganization(actor.organizationId),
  ]);

  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const currentDocuments = documents.filter((document) => document.isCurrent);
  const openTasks = tasks.filter((task) => OPEN_TASK_STATUSES.has(task.status));
  const today = isoDate(now);
  const in30Days = addUtcDays(now, 30);
  const in90Days = addUtcDays(now, 90);

  const employeesOverview: EmployeeComplianceOverview[] = employees.map((employee) => {
    const employeeDocuments = currentDocuments.filter((document) => document.employeeId === employee.id);
    const employeeTasks = openTasks.filter((task) => task.employeeId === employee.id);
    const employeeAssessments = assessments.filter((assessment) => assessment.employeeId === employee.id);
    const latest = latestAssessment(employeeAssessments);

    return {
      employeeId: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      roleTitle: employee.roleTitle,
      workSite: employee.workSite,
      currentDocumentCount: employeeDocuments.length,
      currentDocumentNextExpiry: minString(employeeDocuments.map((document) => document.validUntil)),
      openTaskCount: employeeTasks.length,
      criticalOpenTaskCount: employeeTasks.filter((task) => task.severity === "critical").length,
      nextTaskDueAt: minString(employeeTasks.map((task) => task.dueAt)),
      latestAssessment: latest ? {
        id: latest.id,
        status: latest.resultSnapshot.status,
        statusLabel: latest.resultSnapshot.statusLabel,
        createdAt: latest.createdAt,
        nextDeadline: latest.resultSnapshot.nextDeadline,
      } : null,
      attentionLevel: attentionLevel({
        latest,
        currentDocuments: employeeDocuments,
        openTasks: employeeTasks,
        today,
        in90Days,
        now,
      }),
    };
  });

  const taskPriorities: OperationalPriority[] = openTasks
    .filter((task) => task.dueAt !== null)
    .map((task) => ({
      kind: "task",
      id: task.id,
      employeeId: task.employeeId,
      employeeName: task.employeeId ? employeeName(employeeById.get(task.employeeId)) : null,
      title: task.title,
      dueAt: task.dueAt!,
      urgency: taskUrgency(task, now),
      taskSeverity: task.severity,
    }));

  const documentPriorities: OperationalPriority[] = currentDocuments
    .filter((document) => document.validUntil !== null && document.validUntil <= in90Days)
    .map((document) => ({
      kind: "document_expiry",
      id: document.id,
      employeeId: document.employeeId,
      employeeName: employeeName(employeeById.get(document.employeeId)),
      title: document.label,
      dueAt: document.validUntil!,
      urgency: document.validUntil! < today
        ? "overdue"
        : document.validUntil! <= in30Days
          ? "critical"
          : "upcoming",
      taskSeverity: null,
    }));

  const urgencyWeight: Record<OperationalPriorityUrgency, number> = {
    overdue: 0,
    critical: 1,
    upcoming: 2,
  };

  const priorities = [...taskPriorities, ...documentPriorities]
    .sort((a, b) => urgencyWeight[a.urgency] - urgencyWeight[b.urgency] || a.dueAt.localeCompare(b.dueAt))
    .slice(0, PRIORITY_LIMIT);

  return {
    generatedAt: now.toISOString(),
    counts: {
      employees: employees.length,
      openTasks: openTasks.length,
      criticalOpenTasks: openTasks.filter((task) => task.severity === "critical").length,
      overdueOpenTasks: openTasks.filter(
        (task) => task.dueAt !== null && new Date(task.dueAt).getTime() < now.getTime(),
      ).length,
      expiredCurrentDocuments: currentDocuments.filter(
        (document) => document.validUntil !== null && document.validUntil < today,
      ).length,
      currentDocumentsExpiringWithin90Days: currentDocuments.filter(
        (document) => document.validUntil !== null
          && document.validUntil >= today
          && document.validUntil <= in90Days,
      ).length,
      employeesWithoutAssessment: employeesOverview.filter((employee) => employee.latestAssessment === null).length,
    },
    employees: employeesOverview,
    priorities,
    disclaimer: "Vue opérationnelle dérivée des données persistées. L'absence de signal ouvert ne constitue pas, à elle seule, un verdict juridique de conformité.",
  };
}
