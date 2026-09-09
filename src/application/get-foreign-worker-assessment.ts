import { assertPermission, type ActorContext } from "@/application/authorization";
import type { AssessmentRecord, AssessmentRepository } from "@/infrastructure/repositories/assessment-repository";

export async function getForeignWorkerAssessment(
  assessmentId: string,
  repository: AssessmentRepository,
  actor: ActorContext,
): Promise<AssessmentRecord | null> {
  assertPermission(actor, "assessment:read");
  return repository.findById(assessmentId, actor.organizationId);
}
