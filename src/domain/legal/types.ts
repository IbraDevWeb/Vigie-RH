export type ActionType = "hire" | "renew" | "modify" | "terminate" | "can_work";
export type NationalityGroup = "france" | "eu_eea_swiss" | "third_country" | "algeria";
export type LocationStatus = "france" | "abroad";
export type PermitType =
  | "none"
  | "employee"
  | "temporary_worker"
  | "student"
  | "private_family"
  | "resident"
  | "talent"
  | "receipt"
  | "extension_attestation"
  | "other";
export type ContractType = "cdi" | "cdd" | "none";
export type Answer = "yes" | "no" | "review" | "not_applicable";
export type Severity = "success" | "info" | "warning" | "danger";
export type AssessmentStatus = "clear" | "conditional" | "blocked" | "review_required";

export interface LegalSource {
  id: string;
  title: string;
  authority: "legifrance" | "service-public" | "ministere";
  url: string;
  effectiveFrom?: string;
  lastReviewed: string;
  note?: string;
}

export interface AssessmentInput {
  action: ActionType;
  nationalityGroup: NationalityGroup;
  location: LocationStatus;
  permitType: PermitType;
  permitValidUntil?: string;
  plannedStartDate?: string;
  contractType: ContractType;
  newContract: boolean;
  region?: string;
  occupation?: string;
  salaryGrossMonthly?: number;
  studentHoursPlanned?: number;
  isApprenticeship?: boolean | null;
  apprenticeshipValidated?: boolean | null;
  jobInShortageList?: boolean | null;
  offerPublishedThreeWeeks?: boolean | null;
  noValidCandidateReceived?: boolean | null;
  temporaryDocumentAllowsWork?: boolean | null;
}

export interface Finding {
  id: string;
  title: string;
  detail: string;
  severity: Severity;
  sourceIds: string[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  status: "done" | "todo" | "attention" | "blocked";
  sourceIds?: string[];
}

export interface AppliedRuleReference {
  ruleId: string;
  version: number;
  effectiveFrom: string;
  lastReviewed: string;
  sourceIds: string[];
}

export interface AssessmentResult {
  status: AssessmentStatus;
  statusLabel: string;
  summary: string;
  canWorkNow: boolean | null;
  workAuthorization: Answer;
  employerVerification: Answer;
  employmentSituation: Answer;
  shortageOccupation: Answer;
  nextDeadline: string | null;
  confidence: "high" | "medium" | "low";
  findings: Finding[];
  checklist: ChecklistItem[];
  sourceIds: string[];
  appliedRules: AppliedRuleReference[];
  generatedAt: string;
  disclaimer: string;
}

export interface RuleContext {
  input: AssessmentInput;
  today: Date;
}

export interface RuleOutput {
  findings?: Finding[];
  checklist?: ChecklistItem[];
  sourceIds?: string[];
  patches?: Partial<Pick<AssessmentResult,
    | "canWorkNow"
    | "workAuthorization"
    | "employerVerification"
    | "employmentSituation"
    | "shortageOccupation"
    | "nextDeadline"
    | "confidence"
  >>;
  forceStatus?: AssessmentStatus;
}

export interface LegalRule {
  id: string;
  version: number;
  description: string;
  effectiveFrom: string;
  lastReviewed: string;
  sourceIds: string[];
  priority: number;
  applies: (context: RuleContext) => boolean;
  evaluate: (context: RuleContext) => RuleOutput;
}
