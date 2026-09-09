import type { ActorContext } from "@/application/authorization";
import { createForeignWorkerAssessment, type CreateAssessmentOutput } from "./create-foreign-worker-assessment";
import { AssessmentEmployeeNotFoundError } from "./employee-assessment-errors";
import type { AssessmentInput } from "@/domain/legal/types";
import type { AssessmentRepository } from "@/infrastructure/repositories/assessment-repository";
import type { EmployeeStore } from "@/infrastructure/repositories/employee-store";

export async function createEmployeeAssessment(
  employeeId: string,
  input: Partial<AssessmentInput>,
  employeeStore: EmployeeStore,
  assessmentRepository: AssessmentRepository,
  actor: ActorContext,
): Promise<CreateAssessmentOutput> {
  const employee = await employeeStore.findById(employeeId, actor.organizationId);
  if (!employee) throw new AssessmentEmployeeNotFoundError(employeeId);

  return createForeignWorkerAssessment(input, assessmentRepository, actor, { employeeId });
}
