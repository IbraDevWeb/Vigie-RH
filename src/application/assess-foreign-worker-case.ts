import { assessCase } from "@/domain/legal/engine";
import { validateAssessmentInput } from "@/domain/legal/validation";
import type { AssessmentInput, AssessmentResult } from "@/domain/legal/types";
import type { AssessmentRecord, AssessmentRepository } from "@/infrastructure/repositories/assessment-repository";

export function assessForeignWorkerCase(input: Partial<AssessmentInput>): AssessmentResult {
  const validated = validateAssessmentInput(input);
  return assessCase(validated);
}

export async function assessAndSaveForeignWorkerCase(
  input: Partial<AssessmentInput>,
  repository: AssessmentRepository,
): Promise<AssessmentRecord> {
  const validated = validateAssessmentInput(input);
  const result = assessCase(validated);
  const record: AssessmentRecord = {
    id: crypto.randomUUID(),
    inputSnapshot: validated,
    resultSnapshot: result,
    ruleVersions: result.appliedRules,
    createdAt: result.generatedAt,
  };

  await repository.save(record);
  return record;
}
