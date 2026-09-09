import { describe, expect, it } from "vitest";
import { ValidationError, validateAssessmentInput } from "./validation";
import type { AssessmentInput } from "./types";

const base: AssessmentInput = {
  action: "can_work",
  nationalityGroup: "third_country",
  location: "france",
  permitType: "employee",
  permitValidUntil: "2027-09-30",
  contractType: "cdi",
  newContract: false,
  occupation: "Technicien de maintenance",
  region: "Île-de-France",
  workAuthorizationGrantedForContract: null,
};

function expectValidationIssue(input: Partial<AssessmentInput>, pattern: RegExp) {
  try {
    validateAssessmentInput(input);
    throw new Error("La validation aurait dû échouer.");
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    const validationError = error as ValidationError;
    expect(validationError.issues.some((issue) => pattern.test(issue))).toBe(true);
  }
}

describe("assessment validation — current right to work", () => {
  it("accepts an unknown authorization scope so the engine can review it", () => {
    const result = validateAssessmentInput(base);

    expect(result.workAuthorizationGrantedForContract).toBeNull();
    expect(result.action).toBe("can_work");
  });

  it("rejects a current-right check modeled as a new contract", () => {
    expectValidationIssue({
      ...base,
      newContract: true,
    }, /situation actuelle/i);
  });

  it("requires the current document expiry date when a foreign document is supplied", () => {
    expectValidationIssue({
      ...base,
      permitValidUntil: undefined,
    }, /date de fin de validité du document actuel/i);
  });

  it("requires annual hours for a student title", () => {
    expectValidationIssue({
      ...base,
      permitType: "student",
      studentHoursPlanned: undefined,
    }, /volume annuel de travail actuel ou prévu/i);
  });

  it("requires apprenticeship qualification above 964 student hours", () => {
    expectValidationIssue({
      ...base,
      permitType: "student",
      studentHoursPlanned: 1_100,
      isApprenticeship: null,
    }, /contrat d'apprentissage/i);
  });

  it("requires apprenticeship validation when that exception is invoked", () => {
    expectValidationIssue({
      ...base,
      permitType: "student",
      studentHoursPlanned: 1_100,
      isApprenticeship: true,
      apprenticeshipValidated: null,
    }, /validé par le service compétent/i);
  });

  it("allows no permit to reach the engine without inventing an expiry date", () => {
    const result = validateAssessmentInput({
      ...base,
      permitType: "none",
      permitValidUntil: undefined,
      contractType: "none",
    });

    expect(result.permitType).toBe("none");
  });
});
