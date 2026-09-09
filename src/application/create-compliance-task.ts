import { randomUUID } from "node:crypto";
import { assertPermission, type ActorContext } from "@/application/authorization";
import type { ComplianceTaskRecord, CreateComplianceTaskInput } from "@/domain/compliance/task-record";
import { validateCreateComplianceTaskInput } from "@/domain/compliance/task-validation";
import type { AssessmentRepository } from "@/infrastructure/repositories/assessment-repository";
import type { ComplianceTaskStore } from "@/infrastructure/repositories/compliance-task-store";
import type { EmployeeStore } from "@/infrastructure/repositories/employee-store";
import {
  ComplianceTaskAssessmentNotFoundError,
  ComplianceTaskEmployeeNotFoundError,
} from "./compliance-task-errors";

export async function createComplianceTask(
  input: CreateComplianceTaskInput,
  taskStore: ComplianceTaskStore,
  employeeStore: EmployeeStore,
  assessmentRepository: AssessmentRepository,
  actor: ActorContext,
  now = new Date(),
): Promise<ComplianceTaskRecord> {
  assertPermission(actor, "task:write");
  const validated = validateCreateComplianceTaskInput(input);

  if (validated.employeeId) {
    const employee = await employeeStore.findById(validated.employeeId, actor.organizationId);
    if (!employee) throw new ComplianceTaskEmployeeNotFoundError(validated.employeeId);
  }

  if (validated.assessmentId) {
    const assessment = await assessmentRepository.findById(validated.assessmentId, actor.organizationId);
    if (!assessment) throw new ComplianceTaskAssessmentNotFoundError(validated.assessmentId);
  }

  const record: ComplianceTaskRecord = {
    id: randomUUID(),
    organizationId: actor.organizationId,
    employeeId: validated.employeeId ?? null,
    assessmentId: validated.assessmentId ?? null,
    title: validated.title,
    dueAt: validated.dueAt ? new Date(validated.dueAt).toISOString() : null,
    status: "todo",
    severity: validated.severity ?? "info",
    assignedToUserId: null,
    createdAt: now.toISOString(),
    completedAt: null,
  };

  await taskStore.create(record);
  return record;
}
