import { describe, expect, it } from "vitest";
import { assessCase } from "./engine";
import type { AssessmentInput } from "./types";

const now = new Date("2026-09-09T10:00:00Z");

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

describe("legal rule engine — current right to work", () => {
  it("clears a valid employee title when the current contract is declared covered", () => {
    const result = assessCase({
      ...base,
      workAuthorizationGrantedForContract: true,
    }, now);

    expect(result.status).toBe("clear");
    expect(result.canWorkNow).toBe(true);
    expect(result.workAuthorization).toBe("yes");
    expect(result.appliedRules.some((rule) => rule.ruleId === "can-work-employee-current-scope")).toBe(true);
  });

  it("blocks the current activity when the employee authorization is declared not to cover it", () => {
    const result = assessCase({
      ...base,
      workAuthorizationGrantedForContract: false,
    }, now);

    expect(result.status).toBe("blocked");
    expect(result.canWorkNow).toBe(false);
    expect(result.workAuthorization).toBe("yes");
  });

  it("requires review when the scope of the employee authorization is unknown", () => {
    const result = assessCase(base, now);

    expect(result.status).toBe("review_required");
    expect(result.canWorkNow).toBeNull();
    expect(result.workAuthorization).toBe("review");
  });

  it("keeps an expired employee document blocked even if the old authorization is declared covered", () => {
    const result = assessCase({
      ...base,
      permitValidUntil: "2026-09-01",
      workAuthorizationGrantedForContract: true,
    }, now);

    expect(result.status).toBe("blocked");
    expect(result.canWorkNow).toBe(false);
    expect(result.findings.some((finding) => finding.id === "expired")).toBe(true);
  });

  it("clears a valid resident card in the modeled scope", () => {
    const result = assessCase({
      ...base,
      permitType: "resident",
      permitValidUntil: "2030-09-30",
      contractType: "none",
      occupation: undefined,
      region: undefined,
      workAuthorizationGrantedForContract: null,
    }, now);

    expect(result.status).toBe("clear");
    expect(result.canWorkNow).toBe(true);
    expect(result.workAuthorization).toBe("no");
  });

  it("clears a student activity within 964 hours on a valid title", () => {
    const result = assessCase({
      ...base,
      permitType: "student",
      permitValidUntil: "2027-09-30",
      studentHoursPlanned: 700,
      workAuthorizationGrantedForContract: null,
    }, now);

    expect(result.status).toBe("clear");
    expect(result.canWorkNow).toBe(true);
    expect(result.workAuthorization).toBe("no");
  });

  it("blocks a non-apprenticeship student above 964 hours when authorization is declared absent", () => {
    const result = assessCase({
      ...base,
      permitType: "student",
      permitValidUntil: "2027-09-30",
      studentHoursPlanned: 1_100,
      isApprenticeship: false,
      workAuthorizationGrantedForContract: false,
    }, now);

    expect(result.status).toBe("blocked");
    expect(result.canWorkNow).toBe(false);
    expect(result.workAuthorization).toBe("yes");
  });

  it("preserves uncertainty above 964 student hours when authorization is unknown", () => {
    const result = assessCase({
      ...base,
      permitType: "student",
      permitValidUntil: "2027-09-30",
      studentHoursPlanned: 1_100,
      isApprenticeship: false,
      workAuthorizationGrantedForContract: null,
    }, now);

    expect(result.status).toBe("review_required");
    expect(result.canWorkNow).toBeNull();
    expect(result.workAuthorization).toBe("review");
  });

  it("keeps a temporary document in review even when a work mention is declared present", () => {
    const result = assessCase({
      ...base,
      permitType: "receipt",
      permitValidUntil: "2026-12-31",
      contractType: "none",
      occupation: undefined,
      region: undefined,
      temporaryDocumentAllowsWork: true,
      workAuthorizationGrantedForContract: null,
    }, now);

    expect(result.status).toBe("review_required");
    expect(result.canWorkNow).toBe(true);
    expect(result.workAuthorization).toBe("review");
  });

  it("keeps a generic Talent title in review", () => {
    const result = assessCase({
      ...base,
      permitType: "talent",
      permitValidUntil: "2028-09-30",
      contractType: "none",
      workAuthorizationGrantedForContract: null,
    }, now);

    expect(result.status).toBe("review_required");
    expect(result.canWorkNow).toBeNull();
  });

  it("keeps the Algerian regime in review", () => {
    const result = assessCase({
      ...base,
      nationalityGroup: "algeria",
      permitType: "other",
      permitValidUntil: "2027-09-30",
      contractType: "none",
      workAuthorizationGrantedForContract: null,
    }, now);

    expect(result.status).toBe("review_required");
    expect(result.canWorkNow).toBeNull();
  });
});
