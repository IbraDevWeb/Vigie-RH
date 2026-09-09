import { randomUUID } from "node:crypto";
import { assessForeignWorkerCase } from "./assess-foreign-worker-case";
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
  const result = assessForeignWorkerCase(input);
  const assessmentId = randomUUID();

  await repository.save({
    id: assessmentId,
    inputSnapshot: input as AssessmentInput,
    resultSnapshot: result,
    ruleVersions: result.appliedRules,
    createdAt: result.generatedAt,
  });

  return { assessmentId, result };
}
