import { describe, expect, it } from "vitest";
import { assessCase } from "./engine";
import type { AssessmentInput } from "./types";

const now = new Date("2026-09-09T10:00:00Z");

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
  terminationReason: "authorization_refused_or_withdrawn",
  protectedEmployee: false,
  workedWhileUnauthorized: false,
};

describe("legal rule engine — termination workflow", () => {
  it("forbids continued work when the current document is expired", () => {
    const result = assessCase({
      ...base,
      permitValidUntil: "2026-09-01",
      terminationReason: "document_expired",
      terminationLossDate: "2026-09-02",
      workAuthorizationGrantedForContract: true,
    }, now);

    expect(result.status).toBe("review_required");
    expect(result.canWorkNow).toBe(false);
    expect(result.findings.some((finding) => finding.id === "termination-loss-established")).toBe(true);
    expect(result.sourceIds).toContain("ct-l8251-1");
  });

  it("forbids continued work when the current authorization does not cover the activity", () => {
    const result = assessCase({
      ...base,
      terminationReason: "activity_not_covered",
      workAuthorizationGrantedForContract: false,
    }, now);

    expect(result.status).toBe("review_required");
    expect(result.canWorkNow).toBe(false);
  });

  it("does not treat a covered current employee activity as a proven loss of right", () => {
    const result = assessCase({
      ...base,
      workAuthorizationGrantedForContract: true,
    }, now);

    expect(result.status).toBe("review_required");
    expect(result.canWorkNow).toBe(true);
    expect(result.findings.some((finding) => finding.id === "termination-right-still-established")).toBe(true);
  });

  it("keeps an unknown employee authorization scope in review", () => {
    const result = assessCase(base, now);

    expect(result.status).toBe("review_required");
    expect(result.canWorkNow).toBeNull();
    expect(result.findings.some((finding) => finding.id === "termination-right-uncertain")).toBe(true);
  });

  it("recognizes a valid resident card as still establishing work rights in the modeled scope", () => {
    const result = assessCase({
      ...base,
      permitType: "resident",
      permitValidUntil: "2030-09-30",
      workAuthorizationGrantedForContract: null,
    }, now);

    expect(result.status).toBe("review_required");
    expect(result.canWorkNow).toBe(true);
  });

  it("flags the special protected-employee procedure", () => {
    const result = assessCase({
      ...base,
      workAuthorizationGrantedForContract: false,
      protectedEmployee: true,
    }, now);

    expect(result.findings.some((finding) => finding.id === "protected-employee-special-procedure")).toBe(true);
    expect(result.sourceIds).toContain("ct-l2421-1");
  });

  it("flags the statutory compensation review after declared unauthorized work", () => {
    const result = assessCase({
      ...base,
      permitValidUntil: "2026-09-01",
      workAuthorizationGrantedForContract: false,
      workedWhileUnauthorized: true,
    }, now);

    expect(result.findings.some((finding) => finding.id === "illegal-employment-compensation")).toBe(true);
    expect(result.sourceIds).toContain("ct-l8252-2");
  });

  it("keeps a temporary document with uncertain work mention in review", () => {
    const result = assessCase({
      ...base,
      permitType: "receipt",
      permitValidUntil: "2026-12-31",
      temporaryDocumentAllowsWork: null,
      workAuthorizationGrantedForContract: null,
    }, now);

    expect(result.status).toBe("review_required");
    expect(result.canWorkNow).toBeNull();
  });

  it("does not invent an immigration termination basis for an EU national", () => {
    const result = assessCase({
      ...base,
      nationalityGroup: "eu_eea_swiss",
      permitType: "none",
      permitValidUntil: undefined,
      workAuthorizationGrantedForContract: null,
      protectedEmployee: null,
    }, now);

    expect(result.status).toBe("review_required");
    expect(result.canWorkNow).toBe(true);
    expect(result.findings.some((finding) => finding.id === "termination-basis-not-applicable")).toBe(true);
  });
});
