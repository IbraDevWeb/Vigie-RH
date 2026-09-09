import { describe, expect, it } from "vitest";
import { ValidationError, validateAssessmentInput } from "./validation";
import type { AssessmentInput } from "./types";

const validModification: AssessmentInput = {
  action: "modify",
  nationalityGroup: "third_country",
  location: "france",
  permitType: "employee",
  permitValidUntil: "2027-08-31",
  contractType: "cdi",
  newContract: false,
  modificationEffectiveDate: "2026-10-01",
  employerChanged: false,
  occupationChanged: true,
  regionChanged: false,
  salaryChanged: false,
  workingTimeChanged: false,
  currentOccupation: "Technicien support",
  occupation: "Administrateur systèmes",
  currentRegion: "Île-de-France",
  region: "Île-de-France",
  workAuthorizationGrantedForModification: null,
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

describe("assessment input validation — modification", () => {
  it("accepts a structurally complete modification", () => {
    const parsed = validateAssessmentInput(validModification);
    expect(parsed.action).toBe("modify");
    expect(parsed.occupationChanged).toBe(true);
    expect(parsed.workAuthorizationGrantedForModification).toBeNull();
  });

  it("requires an effective date", () => {
    const issues = issuesFor({ ...validModification, modificationEffectiveDate: undefined });
    expect(issues).toContain("La date d'effet envisagée de la modification est obligatoire.");
  });

  it("requires at least one declared modification", () => {
    const issues = issuesFor({
      ...validModification,
      occupationChanged: false,
      employerChanged: false,
      regionChanged: false,
      salaryChanged: false,
      workingTimeChanged: false,
      newContract: false,
    });

    expect(issues).toContain("Indiquez au moins une modification : nouveau contrat, employeur, poste, région, rémunération ou temps de travail.");
  });

  it("requires the proposed occupation when the occupation changes", () => {
    const issues = issuesFor({ ...validModification, occupation: undefined });
    expect(issues).toContain("Le poste après modification est obligatoire lorsqu'un nouveau poste ou un nouveau contrat est prévu.");
  });

  it("requires the proposed region when an employee authorization may have a geographic scope", () => {
    const issues = issuesFor({
      ...validModification,
      occupationChanged: false,
      regionChanged: true,
      region: undefined,
    });

    expect(issues).toContain("La région après modification est obligatoire pour contrôler le périmètre géographique de l'autorisation.");
  });

  it("requires the proposed remuneration when salary changes", () => {
    const issues = issuesFor({
      ...validModification,
      occupationChanged: false,
      salaryChanged: true,
      salaryGrossMonthly: undefined,
    });

    expect(issues).toContain("La rémunération brute mensuelle après modification est obligatoire lorsqu'elle change.");
  });

  it("keeps an unknown modification authorization for fail-closed evaluation", () => {
    const parsed = validateAssessmentInput({
      ...validModification,
      workAuthorizationGrantedForModification: null,
    });

    expect(parsed.workAuthorizationGrantedForModification).toBeNull();
  });

  it("requires proposed annual hours for a student modification", () => {
    const issues = issuesFor({
      ...validModification,
      permitType: "student",
      occupationChanged: false,
      workingTimeChanged: true,
      studentHoursPlanned: undefined,
    });

    expect(issues).toContain("Le volume annuel de travail après modification est obligatoire pour un titre étudiant.");
  });

  it("requires the new contract type and proposed job when a new contract is declared", () => {
    const issues = issuesFor({
      ...validModification,
      newContract: true,
      occupationChanged: false,
      contractType: "none",
      occupation: undefined,
      salaryGrossMonthly: 3_000,
    });

    expect(issues).toContain("Le type du nouveau contrat est obligatoire lorsqu'un nouveau contrat est prévu.");
    expect(issues).toContain("Le poste après modification est obligatoire lorsqu'un nouveau poste ou un nouveau contrat est prévu.");
  });
});
