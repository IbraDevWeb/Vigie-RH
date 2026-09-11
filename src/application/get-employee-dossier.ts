import { assertPermission, type ActorContext } from "@/application/authorization";
import type { EmployeeDossier } from "@/domain/employee/dossier";
import type { AssessmentRepository } from "@/infrastructure/repositories/assessment-repository";
import type { ComplianceTaskStore } from "@/infrastructure/repositories/compliance-task-store";
import type { EmployeeDocumentStore } from "@/infrastructure/repositories/employee-document-store";
import type { EmployeeStore } from "@/infrastructure/repositories/employee-store";

const OPEN_TASK_STATUSES = new Set(["todo", "doing"]);

function minString(values: Array<string | null>): string | null {
  const defined = values.filter((value): value is string => value !== null);
  return defined.length === 0 ? null : defined.sort()[0];
}

export async function getEmployeeDossier(
  employeeId: string,
  employeeStore: EmployeeStore,
  documentStore: EmployeeDocumentStore,
  assessmentRepository: AssessmentRepository,
  taskStore: ComplianceTaskStore,
  actor: ActorContext,
  now = new Date(),
): Promise<EmployeeDossier | null> {
  assertPermission(actor, "employee:read");
  assertPermission(actor, "document:read");
  assertPermission(actor, "assessment:read");
  assertPermission(actor, "task:read");

  const employee = await employeeStore.findById(employeeId, actor.organizationId);
  if (!employee) return null;

  const [documents, assessments, tasks] = await Promise.all([
    documentStore.listByEmployee(employeeId, actor.organizationId),
    assessmentRepository.listByEmployee(employeeId, actor.organizationId),
    taskStore.listByOrganization(actor.organizationId, { employeeId }),
  ]);

  const currentDocuments = documents
    .filter((document) => document.isCurrent)
    .sort((a, b) => (a.validUntil ?? "9999-12-31").localeCompare(b.validUntil ?? "9999-12-31"));
  const historicalDocuments = documents
    .filter((document) => !document.isCurrent)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sortedAssessments = [...assessments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const openTasks = tasks
    .filter((task) => OPEN_TASK_STATUSES.has(task.status))
    .sort((a, b) => (a.dueAt ?? "9999-12-31T23:59:59.999Z").localeCompare(b.dueAt ?? "9999-12-31T23:59:59.999Z"));
  const closedTasks = tasks
    .filter((task) => !OPEN_TASK_STATUSES.has(task.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    employee,
    currentDocuments,
    historicalDocuments,
    assessments: sortedAssessments,
    latestAssessment: sortedAssessments[0] ?? null,
    openTasks,
    closedTasks,
    nextDocumentExpiry: minString(currentDocuments.map((document) => document.validUntil)),
    nextTaskDueAt: minString(openTasks.map((task) => task.dueAt)),
    generatedAt: now.toISOString(),
  };
}
