import { describe, expect, it } from "vitest";
import { ValidationError, validateAssessmentInput } from "./validation";
import type { AssessmentInput } from "./types";

const base: AssessmentInput = {
  action: "terminate",
  nationalityGroup: "third_country",
  location: "france",
  permitType: "employee",
  permitValidUntil: "2027-09-30",
  contractType: "cdi",
  newContract: false,
  occupation: "Technicien de maintenance",
  region: "Île-de-France",
  workAuthorizationGrantedForContract: null,
  terminationReason: "unknown",
  protectedEmployee: false,
  workedWhileUnauthorized: false,
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

describe("assessment validation — termination workflow", () => {
  it("accepts a qualified current-contract termination assessment", () => {
    const result = validateAssessmentInput(base);

    expect(result.action).toBe("terminate");
    expect(result.newContract).toBe(false);
    expect(result.protectedEmployee).toBe(false);
  });

  it("rejects a termination assessment modeled as a new contract", () => {
    expect(issuesFor({ ...base, newContract: true }).join(" ")).toMatch(/contrat actuel/i);
  });

  it("requires the current contract type", () => {
    expect(issuesFor({ ...base, contractType: "none" }).join(" ")).toMatch(/type du contrat actuel/i);
  });

  it("requires an explicit termination reason", () => {
    expect(issuesFor({ ...base, terminationReason: undefined }).join(" ")).toMatch(/motif.*rupture/i);
  });

  it("requires the current document expiry date for a foreign document", () => {
    expect(issuesFor({ ...base, permitValidUntil: undefined }).join(" ")).toMatch(/date de fin de validité du document actuel/i);
  });

  it("requires the protected-employee status for a third-country worker", () => {
    expect(issuesFor({ ...base, protectedEmployee: null }).join(" ")).toMatch(/salarié protégé/i);
  });

  it("requires annual hours for a student title", () => {
    expect(issuesFor({
      ...base,
      permitType: "student",
      studentHoursPlanned: undefined,
    }).join(" ")).toMatch(/volume annuel de travail actuel/i);
  });

  it("requires apprenticeship qualification above 964 student hours", () => {
    expect(issuesFor({
      ...base,
      permitType: "student",
      studentHoursPlanned: 1_100,
      isApprenticeship: null,
    }).join(" ")).toMatch(/contrat d'apprentissage/i);
  });

  it("allows an EU national without immigration-document fields", () => {
    const result = validateAssessmentInput({
      ...base,
      nationalityGroup: "eu_eea_swiss",
      permitType: "none",
      permitValidUntil: undefined,
      protectedEmployee: null,
      workAuthorizationGrantedForContract: null,
    });

    expect(result.nationalityGroup).toBe("eu_eea_swiss");
  });
});
