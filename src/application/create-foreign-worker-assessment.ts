import { randomUUID } from "node:crypto";
import { assessCase } from "@/domain/legal/engine";
import { validateAssessmentInput } from "@/domain/legal/validation";
import type { AssessmentInput, AssessmentResult } from "@/domain/legal/types";
import { assertPermission, type ActorContext } from "@/application/authorization";
import type { AssessmentRepository } from "@/infrastructure/repositories/assessment-repository";

export interface CreateAssessmentOutput {
  assessmentId: string;
  result: AssessmentResult;
}

export interface CreateAssessmentContext {
  employeeId?: string | null;
}

export async function createForeignWorkerAssessment(
  input: Partial<AssessmentInput>,
  repository: AssessmentRepository,
  actor: ActorContext,
  context: CreateAssessmentContext = {},
): Promise<CreateAssessmentOutput> {
  assertPermission(actor, "assessment:create");

  const validatedInput = validateAssessmentInput(input);
  const result = assessCase(validatedInput);
  const assessmentId = randomUUID();

  await repository.save({
    id: assessmentId,
    organizationId: actor.organizationId,
    employeeId: context.employeeId ?? null,
    createdByUserId: actor.userId,
    inputSnapshot: validatedInput,
    resultSnapshot: result,
    ruleVersions: result.appliedRules,
    createdAt: result.generatedAt,
  });

  return { assessmentId, result };
}
