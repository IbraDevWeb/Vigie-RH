import { randomUUID } from "node:crypto";
import { assertPermission, type ActorContext } from "@/application/authorization";
import { AssessmentTaskGenerationRequiresEmployeeError, ComplianceTaskAssessmentNotFoundError } from "./compliance-task-errors";
import type { ComplianceTaskRecord, ComplianceTaskSeverity } from "@/domain/compliance/task-record";
import type { ChecklistItem } from "@/domain/legal/types";
import type { AssessmentRepository } from "@/infrastructure/repositories/assessment-repository";
import type { ComplianceTaskStore } from "@/infrastructure/repositories/compliance-task-store";

export interface AssessmentTaskGenerationResult {
  assessmentId: string;
  employeeId: string;
  created: ComplianceTaskRecord[];
  existingSourceKeys: string[];
}

function severityForChecklistItem(item: ChecklistItem): ComplianceTaskSeverity {
  if (item.status === "blocked") return "critical";
  if (item.status === "attention") return "warning";
  return "info";
}

function normalizedDeadline(value: string | null): string | null {
  if (!value) return null;
  const candidate = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00.000Z`
    : value;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function makeTask(
  assessmentId: string,
  employeeId: string,
  organizationId: string,
  sourceKey: string,
  title: string,
  severity: ComplianceTaskSeverity,
  dueAt: string | null,
  createdAt: string,
): ComplianceTaskRecord {
  return {
    id: randomUUID(),
    organizationId,
    employeeId,
    assessmentId,
    sourceKey,
    title,
    dueAt,
    status: "todo",
    severity,
    assignedToUserId: null,
    createdAt,
    completedAt: null,
  };
}

export async function generateAssessmentComplianceTasks(
  assessmentId: string,
  assessmentRepository: AssessmentRepository,
  taskStore: ComplianceTaskStore,
  actor: ActorContext,
  now = new Date(),
): Promise<AssessmentTaskGenerationResult> {
  assertPermission(actor, "task:write");

  const assessment = await assessmentRepository.findById(assessmentId, actor.organizationId);
  if (!assessment) throw new ComplianceTaskAssessmentNotFoundError(assessmentId);
  if (!assessment.employeeId) throw new AssessmentTaskGenerationRequiresEmployeeError(assessmentId);

  const createdAt = now.toISOString();
  const candidates = new Map<string, ComplianceTaskRecord>();

  for (const item of assessment.resultSnapshot.checklist) {
    if (item.status === "done") continue;
    const title = item.label.trim();
    if (!title) continue;

    const sourceKey = `checklist:${item.id}`;
    if (candidates.has(sourceKey)) continue;

    candidates.set(sourceKey, makeTask(
      assessment.id,
      assessment.employeeId,
      actor.organizationId,
      sourceKey,
      title,
      severityForChecklistItem(item),
      null,
      createdAt,
    ));
  }

  const deadline = normalizedDeadline(assessment.resultSnapshot.nextDeadline);
  if (deadline) {
    const sourceKey = "result:next-deadline";
    candidates.set(sourceKey, makeTask(
      assessment.id,
      assessment.employeeId,
      actor.organizationId,
      sourceKey,
      "Traiter la prochaine échéance juridique du dossier",
      assessment.resultSnapshot.status === "blocked" ? "critical" : "warning",
      deadline,
      createdAt,
    ));
  }

  const created: ComplianceTaskRecord[] = [];
  const existingSourceKeys: string[] = [];

  for (const task of candidates.values()) {
    const inserted = await taskStore.createIfAbsent(task);
    if (inserted) created.push(task);
    else existingSourceKeys.push(task.sourceKey!);
  }

  return {
    assessmentId: assessment.id,
    employeeId: assessment.employeeId,
    created,
    existingSourceKeys,
  };
}
