import type { LegalRule } from "../types";
import { baseRules } from "./base.rules";
import { permitRules } from "./permit.rules";
import { employmentRules } from "./employment.rules";
import { studentFormalityRules } from "./student-formality.rules";
import { renewalRules } from "./renewal.rules";
import { actionRules } from "./action.rules";

export const legalRules: LegalRule[] = [
  ...baseRules,
  ...permitRules,
  ...employmentRules,
  ...studentFormalityRules,
  ...renewalRules,
  ...actionRules,
].sort((a, b) => b.priority - a.priority);
