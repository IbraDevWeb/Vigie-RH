import type { AppliedRuleReference, AssessmentInput, AssessmentResult } from "@/domain/legal/types";

export interface AssessmentRecord {
  id: string;
  inputSnapshot: AssessmentInput;
  resultSnapshot: AssessmentResult;
  ruleVersions: AppliedRuleReference[];
  createdAt: string;
}

export interface AssessmentRepository {
  save(record: AssessmentRecord): Promise<void>;
  findById(id: string): Promise<AssessmentRecord | null>;
}
