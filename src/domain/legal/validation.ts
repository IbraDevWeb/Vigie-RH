import { z } from "zod";
import type { AssessmentInput } from "./types";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La date doit être au format AAAA-MM-JJ.");

const assessmentSchema = z.object({
  action: z.enum(["hire", "renew", "modify", "terminate", "can_work"]),
  nationalityGroup: z.enum(["france", "eu_eea_swiss", "third_country", "algeria"]),
  location: z.enum(["france", "abroad"]),
  permitType: z.enum([
    "none",
    "employee",
    "temporary_worker",
    "student",
    "private_family",
    "resident",
    "talent",
    "receipt",
    "extension_attestation",
    "other",
  ]),
  permitValidUntil: dateSchema.optional(),
  plannedStartDate: dateSchema.optional(),
  contractType: z.enum(["cdi", "cdd", "none"]),
  newContract: z.boolean(),
  region: z.string().trim().min(1).optional(),
  occupation: z.string().trim().min(1).optional(),
  salaryGrossMonthly: z.number().finite().positive().optional(),
  studentHoursPlanned: z.number().finite().min(0).max(8_760).optional(),
  isApprenticeship: z.boolean().nullable().optional(),
  apprenticeshipValidated: z.boolean().nullable().optional(),
  jobInShortageList: z.boolean().nullable().optional(),
  offerPublishedThreeWeeks: z.boolean().nullable().optional(),
  noValidCandidateReceived: z.boolean().nullable().optional(),
  temporaryDocumentAllowsWork: z.boolean().nullable().optional(),
  workAuthorizationGrantedForContract: z.boolean().nullable().optional(),
  employerVerificationCompleted: z.boolean().nullable().optional(),
}).strict().superRefine((input, ctx) => {
  if (input.action !== "hire") return;

  if (!input.newContract) {
    ctx.addIssue({ code: "custom", path: ["newContract"], message: "Un recrutement doit être analysé comme un nouveau contrat." });
  }

  if (input.contractType === "none") {
    ctx.addIssue({ code: "custom", path: ["contractType"], message: "Le type de contrat envisagé est obligatoire pour un recrutement." });
  }

  if (!input.plannedStartDate) {
    ctx.addIssue({ code: "custom", path: ["plannedStartDate"], message: "La date de prise de poste envisagée est obligatoire pour un recrutement." });
  }

  if (!input.occupation) {
    ctx.addIssue({ code: "custom", path: ["occupation"], message: "Le métier ou poste envisagé est obligatoire pour un recrutement." });
  }

  if (["third_country", "algeria"].includes(input.nationalityGroup) && !input.region) {
    ctx.addIssue({ code: "custom", path: ["region"], message: "La région d'emploi est obligatoire pour analyser un recrutement de ressortissant de pays tiers." });
  }

  if (
    ["third_country", "algeria"].includes(input.nationalityGroup)
    && input.permitType !== "none"
    && !input.permitValidUntil
  ) {
    ctx.addIssue({ code: "custom", path: ["permitValidUntil"], message: "La date de fin de validité du document est obligatoire lorsqu'un document est renseigné." });
  }

  if (input.permitType === "student" && typeof input.studentHoursPlanned !== "number") {
    ctx.addIssue({ code: "custom", path: ["studentHoursPlanned"], message: "Le volume annuel de travail envisagé est obligatoire pour un titre étudiant." });
  }

  if (
    input.permitType === "student"
    && typeof input.studentHoursPlanned === "number"
    && input.studentHoursPlanned > 964
    && typeof input.isApprenticeship !== "boolean"
  ) {
    ctx.addIssue({ code: "custom", path: ["isApprenticeship"], message: "Indiquez si le contrat est un contrat d'apprentissage lorsque le volume dépasse 964 heures." });
  }

  if (input.isApprenticeship === true && typeof input.apprenticeshipValidated !== "boolean") {
    ctx.addIssue({
      code: "custom",
      path: ["apprenticeshipValidated"],
      message: "Indiquez si le contrat d'apprentissage a été validé par le service compétent.",
    });
  }

  if (input.offerPublishedThreeWeeks === true && typeof input.noValidCandidateReceived !== "boolean") {
    ctx.addIssue({
      code: "custom",
      path: ["noValidCandidateReceived"],
      message: "Indiquez si une candidature valable a été reçue après la publication de l'offre.",
    });
  }

  const likelyNeedsWorkAuthorization = input.nationalityGroup === "third_country" && (
    input.permitType === "none"
    || (["employee", "temporary_worker"].includes(input.permitType) && input.newContract)
    || (
      input.permitType === "student"
      && typeof input.studentHoursPlanned === "number"
      && input.studentHoursPlanned > 964
      && input.isApprenticeship !== true
    )
  );

  if (likelyNeedsWorkAuthorization && typeof input.salaryGrossMonthly !== "number") {
    ctx.addIssue({
      code: "custom",
      path: ["salaryGrossMonthly"],
      message: "La rémunération brute mensuelle proposée est obligatoire lorsqu'une autorisation de travail doit être instruite.",
    });
  }
});

export class ValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("Entrée invalide");
  }
}

export function validateAssessmentInput(input: Partial<AssessmentInput>): AssessmentInput {
  const parsed = assessmentSchema.safeParse(input);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues.map((issue) => issue.message));
  }

  return {
    ...parsed.data,
    isApprenticeship: parsed.data.isApprenticeship ?? null,
    apprenticeshipValidated: parsed.data.apprenticeshipValidated ?? null,
    jobInShortageList: parsed.data.jobInShortageList ?? null,
    offerPublishedThreeWeeks: parsed.data.offerPublishedThreeWeeks ?? null,
    noValidCandidateReceived: parsed.data.noValidCandidateReceived ?? null,
    temporaryDocumentAllowsWork: parsed.data.temporaryDocumentAllowsWork ?? null,
    workAuthorizationGrantedForContract: parsed.data.workAuthorizationGrantedForContract ?? null,
    employerVerificationCompleted: parsed.data.employerVerificationCompleted ?? null,
  };
}
