import type { AssessmentInput } from "./types";

export class ValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Entrée invalide");
  }
}

export function validateAssessmentInput(input: Partial<AssessmentInput>): AssessmentInput {
  const issues: string[] = [];
  if (!input.action) issues.push("L'action est obligatoire.");
  if (!input.nationalityGroup) issues.push("Le groupe de nationalité est obligatoire.");
  if (!input.location) issues.push("La localisation du salarié est obligatoire.");
  if (!input.permitType) issues.push("Le type de document est obligatoire.");
  if (!input.contractType) issues.push("Le type de contrat est obligatoire.");

  if (issues.length) throw new ValidationError(issues);

  return {
    action: input.action!,
    nationalityGroup: input.nationalityGroup!,
    location: input.location!,
    permitType: input.permitType!,
    permitValidUntil: input.permitValidUntil,
    contractType: input.contractType!,
    newContract: Boolean(input.newContract),
    region: input.region,
    occupation: input.occupation,
    salaryGrossMonthly: input.salaryGrossMonthly,
    studentHoursPlanned: input.studentHoursPlanned,
    jobInShortageList: input.jobInShortageList,
    offerPublishedThreeWeeks: input.offerPublishedThreeWeeks,
    temporaryDocumentAllowsWork: input.temporaryDocumentAllowsWork ?? null,
  };
}
