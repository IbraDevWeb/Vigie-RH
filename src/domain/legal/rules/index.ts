import type { LegalRule } from "../types";
import { baseRules } from "./base.rules";
import { permitRules } from "./permit.rules";
import { employmentRules } from "./employment.rules";
import { studentFormalityRules } from "./student-formality.rules";
import { renewalRules } from "./renewal.rules";
import { modificationRules } from "./modification.rules";
import { canWorkRules } from "./can-work.rules";
import { terminationRules } from "./termination.rules";
import { actionRules } from "./action.rules";

export const legalRules: LegalRule[] = [
  ...baseRules,
  ...permitRules,
  ...renewalRules,
  ...modificationRules,
  ...canWorkRules,
  ...terminationRules,
  ...employmentRules,
  ...studentFormalityRules,
  ...actionRules,
].sort((a, b) => b.priority - a.priority);
