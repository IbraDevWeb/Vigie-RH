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

describe("assessment validation — current right to work", () => {
  it("accepts an unknown authorization scope so the engine can review it", () => {
    const result = validateAssessmentInput(base);

    expect(result.workAuthorizationGrantedForContract).toBeNull();
    expect(result.action).toBe("can_work");
  });

  it("rejects a current-right check modeled as a new contract", () => {
    expect(() => validateAssessmentInput({
      ...base,
      newContract: true,
    })).toThrow(ValidationError);
  });

  it("requires the current document expiry date when a foreign document is supplied", () => {
    expect(() => validateAssessmentInput({
      ...base,
      permitValidUntil: undefined,
    })).toThrowError(/date de fin de validité du document actuel/i);
  });

  it("requires annual hours for a student title", () => {
    expect(() => validateAssessmentInput({
      ...base,
      permitType: "student",
      studentHoursPlanned: undefined,
    })).toThrowError(/volume annuel de travail actuel ou prévu/i);
  });

  it("requires apprenticeship qualification above 964 student hours", () => {
    expect(() => validateAssessmentInput({
      ...base,
      permitType: "student",
      studentHoursPlanned: 1_100,
      isApprenticeship: null,
    })).toThrowError(/contrat d'apprentissage/i);
  });

  it("requires apprenticeship validation when that exception is invoked", () => {
    expect(() => validateAssessmentInput({
      ...base,
      permitType: "student",
      studentHoursPlanned: 1_100,
      isApprenticeship: true,
      apprenticeshipValidated: null,
    })).toThrowError(/validé par le service compétent/i);
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
