import { describe, expect, it } from "vitest";
import { ValidationError, validateAssessmentInput } from "./validation";
import type { AssessmentInput } from "./types";

const validHire: AssessmentInput = {
  action: "hire",
  nationalityGroup: "third_country",
  location: "france",
  permitType: "employee",
  permitValidUntil: "2027-08-31",
  plannedStartDate: "2026-10-01",
  contractType: "cdi",
  newContract: true,
  region: "Île-de-France",
  occupation: "Technicien de maintenance",
  salaryGrossMonthly: 2_500,
  studentHoursPlanned: undefined,
  isApprenticeship: null,
  apprenticeshipValidated: null,
  jobInShortageList: true,
  offerPublishedThreeWeeks: null,
  noValidCandidateReceived: null,
  temporaryDocumentAllowsWork: null,
  workAuthorizationGrantedForContract: false,
  employerVerificationCompleted: false,
};

function issuesFor(input: Partial<AssessmentInput>): string[] {
  try {
    validateAssessmentInput(input);
    return [];
  } catch (error) {
    if (error instanceof ValidationError) return error.issues;
    throw error;
  }
}

describe("assessment input validation — recruitment", () => {
  it("accepts a complete modeled hire", () => {
    const parsed = validateAssessmentInput(validHire);
    expect(parsed.action).toBe("hire");
    expect(parsed.workAuthorizationGrantedForContract).toBe(false);
    expect(parsed.employerVerificationCompleted).toBe(false);
  });

  it("requires a planned start date, occupation and region for a third-country hire", () => {
    const issues = issuesFor({
      ...validHire,
      plannedStartDate: undefined,
      occupation: undefined,
      region: undefined,
    });

    expect(issues).toContain("La date de prise de poste envisagée est obligatoire pour un recrutement.");
    expect(issues).toContain("Le métier ou poste envisagé est obligatoire pour un recrutement.");
    expect(issues).toContain("La région d'emploi est obligatoire pour analyser un recrutement de ressortissant de pays tiers.");
  });

  it("requires the document validity date when a foreign document is supplied", () => {
    const issues = issuesFor({ ...validHire, permitValidUntil: undefined });
    expect(issues).toContain("La date de fin de validité du document est obligatoire lorsqu'un document est renseigné.");
  });

  it("requires salary data while a work authorization still has to be instructed", () => {
    const issues = issuesFor({
      ...validHire,
      salaryGrossMonthly: undefined,
      workAuthorizationGrantedForContract: false,
    });
    expect(issues).toContain("La rémunération brute mensuelle proposée est obligatoire lorsqu'une autorisation de travail doit être instruite.");
  });

  it("does not require salary again when the contract-specific work authorization is already granted", () => {
    const parsed = validateAssessmentInput({
      ...validHire,
      salaryGrossMonthly: undefined,
      workAuthorizationGrantedForContract: true,
    });
    expect(parsed.workAuthorizationGrantedForContract).toBe(true);
  });

  it("requires annual hours for a student hire", () => {
    const issues = issuesFor({
      ...validHire,
      permitType: "student",
      studentHoursPlanned: undefined,
      salaryGrossMonthly: undefined,
      workAuthorizationGrantedForContract: null,
    });
    expect(issues).toContain("Le volume annuel de travail envisagé est obligatoire pour un titre étudiant.");
  });

  it("requires apprenticeship qualification above 964 hours", () => {
    const issues = issuesFor({
      ...validHire,
      permitType: "student",
      studentHoursPlanned: 1_100,
      isApprenticeship: null,
    });
    expect(issues).toContain("Indiquez si le contrat est un contrat d'apprentissage lorsque le volume dépasse 964 heures.");
  });

  it("requires the apprenticeship validation fact when the exception is invoked", () => {
    const issues = issuesFor({
      ...validHire,
      permitType: "student",
      studentHoursPlanned: 1_100,
      isApprenticeship: true,
      apprenticeshipValidated: null,
      salaryGrossMonthly: undefined,
      workAuthorizationGrantedForContract: null,
    });
    expect(issues).toContain("Indiquez si le contrat d'apprentissage a été validé par le service compétent.");
  });

  it("requires the market-test outcome when a three-week publication is declared", () => {
    const issues = issuesFor({
      ...validHire,
      jobInShortageList: false,
      offerPublishedThreeWeeks: true,
      noValidCandidateReceived: null,
    });
    expect(issues).toContain("Indiquez si une candidature valable a été reçue après la publication de l'offre.");
  });
});
