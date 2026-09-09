import { describe, expect, it } from "vitest";
import { ValidationError, validateAssessmentInput } from "./validation";
import type { AssessmentInput } from "./types";

const validRenewal: AssessmentInput = {
  action: "renew",
  nationalityGroup: "third_country",
  location: "france",
  permitType: "employee",
  permitValidUntil: "2026-10-31",
  contractType: "cdi",
  newContract: false,
  renewalFiled: true,
  renewalFiledAt: "2026-09-15",
  renewalProofType: "submission_attestation",
  renewalProofValidUntil: undefined,
  renewalProofAllowsWork: null,
  workAuthorizationValidUntil: "2026-10-31",
  workAuthorizationRenewalFiled: null,
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

describe("assessment input validation — renewal", () => {
  it("accepts a structurally complete renewal", () => {
    const parsed = validateAssessmentInput(validRenewal);
    expect(parsed.action).toBe("renew");
    expect(parsed.renewalFiled).toBe(true);
    expect(parsed.renewalProofType).toBe("submission_attestation");
  });

  it("requires the current title and its expiry for a foreign renewal", () => {
    const issues = issuesFor({
      ...validRenewal,
      permitType: "none",
      permitValidUntil: undefined,
    });

    expect(issues).toContain("Le titre actuellement renouvelé doit être identifié pour analyser un renouvellement.");
    expect(issues).toContain("La date de fin de validité du titre actuel est obligatoire pour analyser un renouvellement.");
  });

  it("does not accept a receipt as the title being renewed", () => {
    const issues = issuesFor({ ...validRenewal, permitType: "receipt" });
    expect(issues).toContain(
      "Le récépissé ou l'attestation de prolongation doit être renseigné comme justificatif de renouvellement, pas comme titre actuellement renouvelé.",
    );
  });

  it("does not accept an extension attestation as the title being renewed", () => {
    const issues = issuesFor({ ...validRenewal, permitType: "extension_attestation" });
    expect(issues).toContain(
      "Le récépissé ou l'attestation de prolongation doit être renseigné comme justificatif de renouvellement, pas comme titre actuellement renouvelé.",
    );
  });

  it("keeps an unknown filing fact for fail-closed evaluation", () => {
    const parsed = validateAssessmentInput({
      ...validRenewal,
      renewalFiled: null,
      renewalFiledAt: undefined,
      renewalProofType: "none",
    });

    expect(parsed.renewalFiled).toBeNull();
    expect(parsed.renewalProofType).toBe("none");
  });

  it("keeps an unknown receipt work mention instead of rejecting the form", () => {
    const parsed = validateAssessmentInput({
      ...validRenewal,
      renewalProofType: "receipt",
      renewalProofValidUntil: "2026-12-31",
      renewalProofAllowsWork: null,
    });

    expect(parsed.renewalProofAllowsWork).toBeNull();
  });

  it("keeps missing proof validity as an engine-level uncertainty", () => {
    const parsed = validateAssessmentInput({
      ...validRenewal,
      renewalProofType: "extension_attestation",
      renewalProofValidUntil: undefined,
    });

    expect(parsed.renewalProofValidUntil).toBeUndefined();
  });
});
