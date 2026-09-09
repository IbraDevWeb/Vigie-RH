import { assessCase } from "@/domain/legal/engine";
import { validateAssessmentInput } from "@/domain/legal/validation";
import type { AssessmentInput, AssessmentResult } from "@/domain/legal/types";

export function assessForeignWorkerCase(input: Partial<AssessmentInput>): AssessmentResult {
  const validated = validateAssessmentInput(input);
  return assessCase(validated);
}
