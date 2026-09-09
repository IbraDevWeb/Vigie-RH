import { describe, expect, it } from "vitest";
import { assessCase } from "./engine";
import type { AssessmentInput } from "./types";

const now = new Date("2026-09-09T10:00:00Z");

const base: AssessmentInput = {
  action: "renew",
  nationalityGroup: "third_country",
  location: "france",
  permitType: "resident",
  permitValidUntil: "2026-12-31",
  contractType: "cdi",
  newContract: false,
  renewalFiled: false,
  renewalProofType: "none",
  renewalProofAllowsWork: null,
  workAuthorizationRenewalFiled: null,
};

describe("legal rule engine — renewal", () => {
  it("keeps work possible while a valid resident card is still current but flags an unfiled renewal", () => {
    const result = assessCase(base, now);

    expect(result.status).toBe("conditional");
    expect(result.canWorkNow).toBe(true);
    expect(result.workAuthorization).toBe("no");
    expect(result.findings.some((finding) => finding.id === "renewal-not-filed")).toBe(true);
  });

  it("blocks work after expiry when the only evidence is a submission attestation and resident continuity does not apply", () => {
    const result = assessCase({
      ...base,
      permitValidUntil: "2026-08-31",
      renewalFiled: true,
      renewalFiledAt: "2026-09-02",
      renewalProofType: "submission_attestation",
    }, now);

    expect(result.status).toBe("blocked");
    expect(result.canWorkNow).toBe(false);
    expect(result.findings.some((finding) => finding.id === "submission-attestation-no-work")).toBe(true);
  });

  it("allows continued work with a valid renewal extension attestation for a modeled work-authorizing title", () => {
    const result = assessCase({
      ...base,
      permitValidUntil: "2026-08-31",
      renewalFiled: true,
      renewalFiledAt: "2026-08-15",
      renewalProofType: "extension_attestation",
      renewalProofValidUntil: "2026-11-30",
    }, now);

    expect(result.status).toBe("conditional");
    expect(result.canWorkNow).toBe(true);
    expect(result.nextDeadline).toBe("2026-11-30");
    expect(result.sourceIds).toContain("ceseda-r431-15-2");
  });

  it("requires review when a renewal receipt's work mention is unknown", () => {
    const result = assessCase({
      ...base,
      permitValidUntil: "2026-08-31",
      renewalFiled: true,
      renewalFiledAt: "2026-08-15",
      renewalProofType: "receipt",
      renewalProofValidUntil: "2026-11-30",
      renewalProofAllowsWork: null,
    }, now);

    expect(result.status).toBe("review_required");
    expect(result.canWorkNow).toBe(false);
  });

  it("applies the modeled three-month resident-card continuation when renewal was filed before expiry", () => {
    const result = assessCase({
      ...base,
      permitValidUntil: "2026-07-31",
      renewalFiled: true,
      renewalFiledAt: "2026-07-20",
      renewalProofType: "none",
    }, now);

    expect(result.status).toBe("conditional");
    expect(result.canWorkNow).toBe(true);
    expect(result.sourceIds).toContain("ceseda-l433-3");
  });

  it("blocks a resident-card renewal after the three-month continuation has ended without another valid proof", () => {
    const result = assessCase({
      ...base,
      permitValidUntil: "2026-05-31",
      renewalFiled: true,
      renewalFiledAt: "2026-05-20",
      renewalProofType: "none",
    }, now);

    expect(result.status).toBe("blocked");
    expect(result.canWorkNow).toBe(false);
  });

  it("clears the title-renewal workflow when a new valid resident card has been received", () => {
    const result = assessCase({
      ...base,
      permitValidUntil: "2026-08-31",
      renewalFiled: true,
      renewalFiledAt: "2026-08-15",
      renewalProofType: "new_permit",
      renewalProofValidUntil: "2036-08-31",
    }, now);

    expect(result.status).toBe("clear");
    expect(result.canWorkNow).toBe(true);
    expect(result.nextDeadline).toBe("2036-08-31");
  });

  it("keeps a current employee-title renewal conditional while the renewal is pending and the work authorization remains valid", () => {
    const result = assessCase({
      ...base,
      permitType: "employee",
      permitValidUntil: "2026-12-31",
      renewalFiled: true,
      renewalFiledAt: "2026-09-01",
      renewalProofType: "submission_attestation",
      workAuthorizationValidUntil: "2027-01-31",
      workAuthorizationRenewalFiled: null,
    }, now);

    expect(result.status).toBe("conditional");
    expect(result.canWorkNow).toBe(true);
    expect(result.workAuthorization).toBe("yes");
  });

  it("blocks an employee-title case when the associated work authorization is already expired", () => {
    const result = assessCase({
      ...base,
      permitType: "employee",
      permitValidUntil: "2026-12-31",
      renewalFiled: true,
      renewalFiledAt: "2026-09-01",
      renewalProofType: "submission_attestation",
      workAuthorizationValidUntil: "2026-08-31",
      workAuthorizationRenewalFiled: true,
    }, now);

    expect(result.status).toBe("blocked");
    expect(result.canWorkNow).toBe(false);
    expect(result.findings.some((finding) => finding.id === "work-authorization-expired")).toBe(true);
  });

  it("requires review for the Algerian special regime", () => {
    const result = assessCase({
      ...base,
      nationalityGroup: "algeria",
      permitType: "resident",
      renewalFiled: true,
      renewalFiledAt: "2026-09-01",
    }, now);

    expect(result.status).toBe("review_required");
  });
});
