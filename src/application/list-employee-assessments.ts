import { assertPermission, type ActorContext } from "@/application/authorization";
import { AssessmentEmployeeNotFoundError } from "./employee-assessment-errors";
import type { AssessmentRecord, AssessmentRepository } from "@/infrastructure/repositories/assessment-repository";
import type { EmployeeStore } from "@/infrastructure/repositories/employee-store";

export async function listEmployeeAssessments(
  employeeId: string,
  employeeStore: EmployeeStore,
  assessmentRepository: AssessmentRepository,
  actor: ActorContext,
): Promise<AssessmentRecord[]> {
  assertPermission(actor, "assessment:read");
  const employee = await employeeStore.findById(employeeId, actor.organizationId);
  if (!employee) throw new AssessmentEmployeeNotFoundError(employeeId);
  return assessmentRepository.listByEmployee(employeeId, actor.organizationId);
}
