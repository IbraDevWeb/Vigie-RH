import { randomUUID } from "node:crypto";
import { assessCase } from "@/domain/legal/engine";
import { validateAssessmentInput } from "@/domain/legal/validation";
import type { AssessmentInput, AssessmentResult } from "@/domain/legal/types";
import type { AssessmentRepository } from "@/infrastructure/repositories/assessment-repository";

export interface CreateAssessmentOutput {
  assessmentId: string;
  result: AssessmentResult;
}

export async function createForeignWorkerAssessment(
  input: Partial<AssessmentInput>,
  repository: AssessmentRepository,
): Promise<CreateAssessmentOutput> {
  const validatedInput = validateAssessmentInput(input);
  const result = assessCase(validatedInput);
  const assessmentId = randomUUID();

  await repository.save({
    id: assessmentId,
    inputSnapshot: validatedInput,
    resultSnapshot: result,
    ruleVersions: result.appliedRules,
    createdAt: result.generatedAt,
  });

  return { assessmentId, result };
}
