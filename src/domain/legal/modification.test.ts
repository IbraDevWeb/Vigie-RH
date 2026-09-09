import { describe, expect, it } from "vitest";
import { assessCase } from "./engine";
import type { AssessmentInput } from "./types";

const now = new Date("2026-09-09T10:00:00Z");

const base: AssessmentInput = {
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
  workAuthorizationGrantedForContract: null,
};

describe("legal rule engine — modification", () => {
  it("requires review when the scope of an employee authorization is not established", () => {
    const result = assessCase(base, now);

    expect(result.status).toBe("review_required");
    expect(result.canWorkNow).toBeNull();
    expect(result.workAuthorization).toBe("review");
    expect(result.sourceIds).toContain("ct-l5221-7");
    expect(result.findings.some((finding) => finding.id === "modify-scope-review")).toBe(true);
  });

  it("clears a scope modification when an authorization covering it is declared obtained", () => {
    const result = assessCase({
      ...base,
      workAuthorizationGrantedForModification: true,
    }, now);

    expect(result.status).toBe("clear");
    expect(result.canWorkNow).toBe(true);
    expect(result.workAuthorization).toBe("yes");
    expect(result.findings.some((finding) => finding.id === "modify-scope-authorized")).toBe(true);
  });

  it("keeps a new employee contract conditional until its authorization is obtained", () => {
    const result = assessCase({
      ...base,
      newContract: true,
      workAuthorizationGrantedForContract: false,
      workAuthorizationGrantedForModification: null,
      jobInShortageList: true,
      salaryGrossMonthly: 3_000,
    }, now);

    expect(result.status).toBe("conditional");
    expect(result.canWorkNow).toBe(false);
    expect(result.workAuthorization).toBe("yes");
    expect(result.employmentSituation).toBe("yes");
    expect(result.findings.some((finding) => finding.id === "new-contract-at")).toBe(true);
  });

  it("clears a new employee contract when the corresponding authorization is declared obtained", () => {
    const result = assessCase({
      ...base,
      newContract: true,
      workAuthorizationGrantedForContract: true,
      workAuthorizationGrantedForModification: null,
      salaryGrossMonthly: 3_000,
    }, now);

    expect(result.status).toBe("clear");
    expect(result.canWorkNow).toBe(true);
    expect(result.workAuthorization).toBe("yes");
  });

  it("requires review for a remuneration-only modification in the employee permit model", () => {
    const result = assessCase({
      ...base,
      occupationChanged: false,
      currentOccupation: undefined,
      occupation: undefined,
      salaryChanged: true,
      currentSalaryGrossMonthly: 2_500,
      salaryGrossMonthly: 2_800,
    }, now);

    expect(result.status).toBe("review_required");
    expect(result.canWorkNow).toBeNull();
    expect(result.findings.some((finding) => finding.id === "modify-remuneration-time-review")).toBe(true);
  });

  it("keeps a resident permit modification clear when the permit is valid", () => {
    const result = assessCase({
      ...base,
      permitType: "resident",
      occupationChanged: true,
      workAuthorizationGrantedForModification: null,
    }, now);

    expect(result.status).toBe("clear");
    expect(result.canWorkNow).toBe(true);
    expect(result.workAuthorization).toBe("no");
  });

  it("keeps a student modification within 964 hours clear", () => {
    const result = assessCase({
      ...base,
      permitType: "student",
      occupationChanged: false,
      workingTimeChanged: true,
      studentHoursPlanned: 800,
      workAuthorizationGrantedForModification: null,
    }, now);

    expect(result.status).toBe("clear");
    expect(result.canWorkNow).toBe(true);
    expect(result.workAuthorization).toBe("no");
  });

  it("makes a student modification over 964 hours conditional until authorization is obtained", () => {
    const result = assessCase({
      ...base,
      permitType: "student",
      occupationChanged: false,
      workingTimeChanged: true,
      studentHoursPlanned: 1_100,
      isApprenticeship: false,
      workAuthorizationGrantedForModification: false,
      jobInShortageList: true,
      salaryGrossMonthly: 1_500,
    }, now);

    expect(result.status).toBe("conditional");
    expect(result.canWorkNow).toBe(false);
    expect(result.workAuthorization).toBe("yes");
    expect(result.employmentSituation).toBe("yes");
  });

  it("does not let a modification authorization override an expired permit", () => {
    const result = assessCase({
      ...base,
      permitValidUntil: "2026-09-01",
      workAuthorizationGrantedForModification: true,
    }, now);

    expect(result.status).toBe("blocked");
    expect(result.canWorkNow).toBe(false);
    expect(result.findings.some((finding) => finding.id === "expired")).toBe(true);
  });

  it("blocks a third-country modification when no work document is established", () => {
    const result = assessCase({
      ...base,
      permitType: "none",
      permitValidUntil: undefined,
    }, now);

    expect(result.status).toBe("blocked");
    expect(result.canWorkNow).toBe(false);
  });

  it("keeps generic private-and-family permit modifications in review", () => {
    const result = assessCase({
      ...base,
      permitType: "private_family",
      workAuthorizationGrantedForModification: null,
    }, now);

    expect(result.status).toBe("review_required");
  });

  it("keeps generic Talent permit modifications in review", () => {
    const result = assessCase({
      ...base,
      permitType: "talent",
      workAuthorizationGrantedForModification: null,
    }, now);

    expect(result.status).toBe("review_required");
  });

  it("keeps the Algerian special regime in review", () => {
    const result = assessCase({
      ...base,
      nationalityGroup: "algeria",
      workAuthorizationGrantedForModification: null,
    }, now);

    expect(result.status).toBe("review_required");
  });
});
