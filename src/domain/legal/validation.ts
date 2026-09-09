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
  studentPrefectureDeclarationCompleted: z.boolean().nullable().optional(),
  registeredWithFranceTravail: z.boolean().nullable().optional(),
  jobInShortageList: z.boolean().nullable().optional(),
  offerPublishedThreeWeeks: z.boolean().nullable().optional(),
  noValidCandidateReceived: z.boolean().nullable().optional(),
  temporaryDocumentAllowsWork: z.boolean().nullable().optional(),
  workAuthorizationGrantedForContract: z.boolean().nullable().optional(),
  employerVerificationCompleted: z.boolean().nullable().optional(),
  renewalFiled: z.boolean().nullable().optional(),
  renewalFiledAt: dateSchema.optional(),
  renewalProofType: z.enum([
    "none",
    "submission_attestation",
    "extension_attestation",
    "receipt",
    "favorable_decision_attestation",
    "new_permit",
    "other",
  ]).optional(),
  renewalProofValidUntil: dateSchema.optional(),
  renewalProofAllowsWork: z.boolean().nullable().optional(),
  workAuthorizationValidUntil: dateSchema.optional(),
  workAuthorizationRenewalFiled: z.boolean().nullable().optional(),
  modificationEffectiveDate: dateSchema.optional(),
  employerChanged: z.boolean().nullable().optional(),
  occupationChanged: z.boolean().nullable().optional(),
  regionChanged: z.boolean().nullable().optional(),
  salaryChanged: z.boolean().nullable().optional(),
  workingTimeChanged: z.boolean().nullable().optional(),
  currentOccupation: z.string().trim().min(1).optional(),
  currentRegion: z.string().trim().min(1).optional(),
  currentSalaryGrossMonthly: z.number().finite().positive().optional(),
  workAuthorizationGrantedForModification: z.boolean().nullable().optional(),
  terminationReason: z.enum([
    "document_expired",
    "authorization_refused_or_withdrawn",
    "activity_not_covered",
    "other",
    "unknown",
  ]).optional(),
  terminationLossDate: dateSchema.optional(),
  protectedEmployee: z.boolean().nullable().optional(),
  workedWhileUnauthorized: z.boolean().nullable().optional(),
}).strict().superRefine((input, ctx) => {
  if (input.action === "hire") {
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
        message: "Indiquez si aucune candidature valable n'a été reçue après la publication de l'offre.",
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

    if (
      likelyNeedsWorkAuthorization
      && input.workAuthorizationGrantedForContract !== true
      && typeof input.salaryGrossMonthly !== "number"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["salaryGrossMonthly"],
        message: "La rémunération brute mensuelle proposée est obligatoire lorsqu'une autorisation de travail doit être instruite.",
      });
    }
  }

  if (input.action === "renew" && ["third_country", "algeria"].includes(input.nationalityGroup)) {
    if (input.permitType === "none") {
      ctx.addIssue({
        code: "custom",
        path: ["permitType"],
        message: "Le titre actuellement renouvelé doit être identifié pour analyser un renouvellement.",
      });
    }

    if (["receipt", "extension_attestation"].includes(input.permitType)) {
      ctx.addIssue({
        code: "custom",
        path: ["permitType"],
        message: "Le récépissé ou l'attestation de prolongation doit être renseigné comme justificatif de renouvellement, pas comme titre actuellement renouvelé.",
      });
    }

    if (!input.permitValidUntil) {
      ctx.addIssue({
        code: "custom",
        path: ["permitValidUntil"],
        message: "La date de fin de validité du titre actuel est obligatoire pour analyser un renouvellement.",
      });
    }
  }

  if (input.action === "can_work") {
    if (input.newContract) {
      ctx.addIssue({
        code: "custom",
        path: ["newContract"],
        message: "Le contrôle « Peut-il travailler ? » porte sur la situation actuelle et ne doit pas être analysé comme un nouveau contrat.",
      });
    }

    if (
      ["third_country", "algeria"].includes(input.nationalityGroup)
      && input.permitType !== "none"
      && !input.permitValidUntil
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["permitValidUntil"],
        message: "La date de fin de validité du document actuel est obligatoire pour contrôler le droit au travail aujourd'hui.",
      });
    }

    if (input.permitType === "student" && typeof input.studentHoursPlanned !== "number") {
      ctx.addIssue({
        code: "custom",
        path: ["studentHoursPlanned"],
        message: "Le volume annuel de travail actuel ou prévu est obligatoire pour contrôler un titre étudiant.",
      });
    }

    if (
      input.permitType === "student"
      && typeof input.studentHoursPlanned === "number"
      && input.studentHoursPlanned > 964
      && typeof input.isApprenticeship !== "boolean"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["isApprenticeship"],
        message: "Indiquez si l'activité au-delà de 964 heures relève d'un contrat d'apprentissage.",
      });
    }

    if (
      input.permitType === "student"
      && input.isApprenticeship === true
      && typeof input.apprenticeshipValidated !== "boolean"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["apprenticeshipValidated"],
        message: "Indiquez si le contrat d'apprentissage a été validé par le service compétent.",
      });
    }
  }

  if (input.action === "terminate") {
    if (input.newContract) {
      ctx.addIssue({
        code: "custom",
        path: ["newContract"],
        message: "Le parcours « Rompre » analyse le contrat actuel et ne doit pas être renseigné comme un nouveau contrat.",
      });
    }

    if (input.contractType === "none") {
      ctx.addIssue({
        code: "custom",
        path: ["contractType"],
        message: "Le type du contrat actuel est obligatoire pour préparer une analyse de rupture.",
      });
    }

    if (!input.terminationReason) {
      ctx.addIssue({
        code: "custom",
        path: ["terminationReason"],
        message: "Le motif à l'origine du parcours de rupture doit être renseigné, même s'il reste à qualifier.",
      });
    }

    if (
      ["third_country", "algeria"].includes(input.nationalityGroup)
      && input.permitType !== "none"
      && !input.permitValidUntil
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["permitValidUntil"],
        message: "La date de fin de validité du document actuel est obligatoire pour analyser une éventuelle perte du droit au travail.",
      });
    }

    if (input.nationalityGroup === "third_country" && typeof input.protectedEmployee !== "boolean") {
      ctx.addIssue({
        code: "custom",
        path: ["protectedEmployee"],
        message: "Indiquez si le salarié bénéficie d'un statut de salarié protégé avant de poursuivre l'analyse de rupture.",
      });
    }

    if (input.permitType === "student" && typeof input.studentHoursPlanned !== "number") {
      ctx.addIssue({
        code: "custom",
        path: ["studentHoursPlanned"],
        message: "Le volume annuel de travail actuel est obligatoire pour contrôler un titre étudiant avant rupture.",
      });
    }

    if (
      input.permitType === "student"
      && typeof input.studentHoursPlanned === "number"
      && input.studentHoursPlanned > 964
      && typeof input.isApprenticeship !== "boolean"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["isApprenticeship"],
        message: "Indiquez si l'activité au-delà de 964 heures relève d'un contrat d'apprentissage.",
      });
    }

    if (
      input.permitType === "student"
      && input.isApprenticeship === true
      && typeof input.apprenticeshipValidated !== "boolean"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["apprenticeshipValidated"],
        message: "Indiquez si le contrat d'apprentissage a été validé par le service compétent.",
      });
    }
  }

  if (input.action === "modify") {
    if (!input.modificationEffectiveDate) {
      ctx.addIssue({
        code: "custom",
        path: ["modificationEffectiveDate"],
        message: "La date d'effet envisagée de la modification est obligatoire.",
      });
    }

    const changeDeclared = input.newContract
      || input.employerChanged === true
      || input.occupationChanged === true
      || input.regionChanged === true
      || input.salaryChanged === true
      || input.workingTimeChanged === true;

    if (!changeDeclared) {
      ctx.addIssue({
        code: "custom",
        path: ["newContract"],
        message: "Indiquez au moins une modification : nouveau contrat, employeur, poste, région, rémunération ou temps de travail.",
      });
    }

    if (
      ["third_country", "algeria"].includes(input.nationalityGroup)
      && input.permitType !== "none"
      && !input.permitValidUntil
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["permitValidUntil"],
        message: "La date de fin de validité du document actuel est obligatoire pour analyser une modification.",
      });
    }

    if (input.newContract && input.contractType === "none") {
      ctx.addIssue({
        code: "custom",
        path: ["contractType"],
        message: "Le type du nouveau contrat est obligatoire lorsqu'un nouveau contrat est prévu.",
      });
    }

    if ((input.occupationChanged === true || input.newContract) && !input.occupation) {
      ctx.addIssue({
        code: "custom",
        path: ["occupation"],
        message: "Le poste après modification est obligatoire lorsqu'un nouveau poste ou un nouveau contrat est prévu.",
      });
    }

    if (
      input.nationalityGroup === "third_country"
      && ["employee", "temporary_worker"].includes(input.permitType)
      && (input.regionChanged === true || input.newContract)
      && !input.region
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["region"],
        message: "La région après modification est obligatoire pour contrôler le périmètre géographique de l'autorisation.",
      });
    }

    if (input.salaryChanged === true && typeof input.salaryGrossMonthly !== "number") {
      ctx.addIssue({
        code: "custom",
        path: ["salaryGrossMonthly"],
        message: "La rémunération brute mensuelle après modification est obligatoire lorsqu'elle change.",
      });
    }

    if (input.permitType === "student" && typeof input.studentHoursPlanned !== "number") {
      ctx.addIssue({
        code: "custom",
        path: ["studentHoursPlanned"],
        message: "Le volume annuel de travail après modification est obligatoire pour un titre étudiant.",
      });
    }

    const newContractNeedsAuthorization = input.nationalityGroup === "third_country"
      && input.newContract
      && ["employee", "temporary_worker"].includes(input.permitType);

    if (
      newContractNeedsAuthorization
      && input.workAuthorizationGrantedForContract !== true
      && typeof input.salaryGrossMonthly !== "number"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["salaryGrossMonthly"],
        message: "La rémunération brute mensuelle après modification est obligatoire lorsqu'une nouvelle autorisation de travail doit être instruite.",
      });
    }
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
    studentPrefectureDeclarationCompleted: parsed.data.studentPrefectureDeclarationCompleted ?? null,
    registeredWithFranceTravail: parsed.data.registeredWithFranceTravail ?? null,
    jobInShortageList: parsed.data.jobInShortageList ?? null,
    offerPublishedThreeWeeks: parsed.data.offerPublishedThreeWeeks ?? null,
    noValidCandidateReceived: parsed.data.noValidCandidateReceived ?? null,
    temporaryDocumentAllowsWork: parsed.data.temporaryDocumentAllowsWork ?? null,
    workAuthorizationGrantedForContract: parsed.data.workAuthorizationGrantedForContract ?? null,
    employerVerificationCompleted: parsed.data.employerVerificationCompleted ?? null,
    renewalFiled: parsed.data.renewalFiled ?? null,
    renewalProofType: parsed.data.renewalProofType ?? "none",
    renewalProofAllowsWork: parsed.data.renewalProofAllowsWork ?? null,
    workAuthorizationRenewalFiled: parsed.data.workAuthorizationRenewalFiled ?? null,
    employerChanged: parsed.data.employerChanged ?? null,
    occupationChanged: parsed.data.occupationChanged ?? null,
    regionChanged: parsed.data.regionChanged ?? null,
    salaryChanged: parsed.data.salaryChanged ?? null,
    workingTimeChanged: parsed.data.workingTimeChanged ?? null,
    workAuthorizationGrantedForModification: parsed.data.workAuthorizationGrantedForModification ?? null,
    protectedEmployee: parsed.data.protectedEmployee ?? null,
    workedWhileUnauthorized: parsed.data.workedWhileUnauthorized ?? null,
  };
}
