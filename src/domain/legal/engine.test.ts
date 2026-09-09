import { describe, expect, it } from "vitest";
import { assessCase } from "./engine";
import type { AssessmentInput } from "./types";

const base: AssessmentInput = {
  action: "hire",
  nationalityGroup: "third_country",
  location: "france",
  permitType: "none",
  contractType: "cdi",
  newContract: true,
  plannedStartDate: "2026-10-01",
  occupation: "Technicien de maintenance",
  region: "Île-de-France",
  salaryGrossMonthly: 2_500,
  studentPrefectureDeclarationCompleted: true,
  registeredWithFranceTravail: false,
  jobInShortageList: true,
  offerPublishedThreeWeeks: null,
  noValidCandidateReceived: null,
  employerVerificationCompleted: false,
  workAuthorizationGrantedForContract: false,
};

const now = new Date("2026-09-09T10:00:00Z");

describe("legal rule engine — recruitment", () => {
  it("clears an EU national from work authorization", () => {
    const result = assessCase({
      ...base,
      nationalityGroup: "eu_eea_swiss",
      permitType: "none",
      studentPrefectureDeclarationCompleted: null,
      registeredWithFranceTravail: null,
      employerVerificationCompleted: null,
      workAuthorizationGrantedForContract: null,
    }, now);

    expect(result.status).toBe("clear");
    expect(result.workAuthorization).toBe("no");
    expect(result.canWorkNow).toBe(true);
  });

  it("keeps a third-country hire without a work document conditional rather than globally blocked", () => {
    const result = assessCase(base, now);

    expect(result.status).toBe("conditional");
    expect(result.canWorkNow).toBe(false);
    expect(result.workAuthorization).toBe("yes");
    expect(result.employmentSituation).toBe("yes");
  });

  it("requires review when the France Travail verification exception is not qualified", () => {
    const result = assessCase({
      ...base,
      permitType: "resident",
      permitValidUntil: "2030-09-01",
      registeredWithFranceTravail: null,
      employerVerificationCompleted: null,
      workAuthorizationGrantedForContract: null,
    }, now);

    expect(result.status).toBe("review_required");
    expect(result.employerVerification).toBe("review");
  });

  it("applies the modeled France Travail exception to prefecture verification", () => {
    const result = assessCase({
      ...base,
      permitType: "resident",
      permitValidUntil: "2030-09-01",
      registeredWithFranceTravail: true,
      employerVerificationCompleted: null,
      workAuthorizationGrantedForContract: null,
      jobInShortageList: null,
    }, now);

    expect(result.status).toBe("clear");
    expect(result.employerVerification).toBe("no");
    expect(result.canWorkNow).toBe(true);
  });

  it("does not report immediate work as allowed before the required prefecture verification", () => {
    const result = assessCase({
      ...base,
      permitType: "resident",
      permitValidUntil: "2030-09-01",
      registeredWithFranceTravail: false,
      employerVerificationCompleted: false,
      workAuthorizationGrantedForContract: null,
      jobInShortageList: null,
    }, now);

    expect(result.status).toBe("conditional");
    expect(result.canWorkNow).toBe(false);
    expect(result.employerVerification).toBe("yes");
  });

  it("keeps a new employee-card contract conditional until its work authorization is obtained", () => {
    const result = assessCase({
      ...base,
      permitType: "employee",
      permitValidUntil: "2027-08-31",
      workAuthorizationGrantedForContract: false,
      employerVerificationCompleted: true,
    }, now);

    expect(result.status).toBe("conditional");
    expect(result.canWorkNow).toBe(false);
    expect(result.workAuthorization).toBe("yes");
  });

  it("clears the modeled employee-card hire when the new-contract authorization and prefecture check are completed", () => {
    const result = assessCase({
      ...base,
      permitType: "employee",
      permitValidUntil: "2027-08-31",
      workAuthorizationGrantedForContract: true,
      employerVerificationCompleted: true,
      jobInShortageList: null,
    }, now);

    expect(result.status).toBe("clear");
    expect(result.canWorkNow).toBe(true);
    expect(result.workAuthorization).toBe("yes");
    expect(result.employerVerification).toBe("yes");
    expect(result.appliedRules.some((rule) => rule.ruleId === "employee-card-new-contract")).toBe(true);
  });

  it("clears a valid resident card after the modeled employer verification is completed", () => {
    const result = assessCase({
      ...base,
      permitType: "resident",
      permitValidUntil: "2030-09-01",
      workAuthorizationGrantedForContract: null,
      employerVerificationCompleted: true,
      jobInShortageList: null,
    }, now);

    expect(result.status).toBe("clear");
    expect(result.canWorkNow).toBe(true);
    expect(result.workAuthorization).toBe("no");
  });

  it("allows the modeled student case under 964 hours when all prior hire formalities are completed", () => {
    const result = assessCase({
      ...base,
      permitType: "student",
      permitValidUntil: "2027-08-31",
      studentHoursPlanned: 700,
      studentPrefectureDeclarationCompleted: true,
      workAuthorizationGrantedForContract: null,
      employerVerificationCompleted: true,
      jobInShortageList: null,
    }, now);

    expect(result.status).toBe("clear");
    expect(result.workAuthorization).toBe("no");
    expect(result.canWorkNow).toBe(true);
    expect(result.sourceIds).toContain("ct-r5221-27");
  });

  it("keeps a student hire conditional and forbids immediate start until the nominative declaration is completed", () => {
    const result = assessCase({
      ...base,
      permitType: "student",
      permitValidUntil: "2027-08-31",
      studentHoursPlanned: 700,
      studentPrefectureDeclarationCompleted: false,
      workAuthorizationGrantedForContract: null,
      employerVerificationCompleted: true,
      jobInShortageList: null,
    }, now);

    expect(result.status).toBe("conditional");
    expect(result.canWorkNow).toBe(false);
    expect(result.checklist.find((item) => item.id === "student-prefecture-declaration")?.status).toBe("todo");
  });

  it("requires work authorization above 964 hours outside the modeled apprenticeship exception", () => {
    const result = assessCase({
      ...base,
      permitType: "student",
      permitValidUntil: "2027-08-31",
      studentHoursPlanned: 1_100,
      isApprenticeship: false,
      workAuthorizationGrantedForContract: false,
      employerVerificationCompleted: true,
    }, now);

    expect(result.status).toBe("conditional");
    expect(result.workAuthorization).toBe("yes");
    expect(result.canWorkNow).toBe(false);
  });

  it("applies the modeled validated apprenticeship exception above 964 hours", () => {
    const result = assessCase({
      ...base,
      permitType: "student",
      permitValidUntil: "2027-08-31",
      studentHoursPlanned: 1_100,
      isApprenticeship: true,
      apprenticeshipValidated: true,
      studentPrefectureDeclarationCompleted: true,
      workAuthorizationGrantedForContract: null,
      employerVerificationCompleted: true,
      jobInShortageList: null,
    }, now);

    expect(result.status).toBe("clear");
    expect(result.workAuthorization).toBe("no");
    expect(result.canWorkNow).toBe(true);
  });

  it("requires review for the Algerian special regime", () => {
    const result = assessCase({
      ...base,
      nationalityGroup: "algeria",
      permitType: "student",
      permitValidUntil: "2027-08-31",
      studentHoursPlanned: 700,
      registeredWithFranceTravail: null,
    }, now);

    expect(result.status).toBe("review_required");
    expect(result.confidence).toBe("low");
  });

  it.each(["private_family", "talent"] as const)("requires review for the generic %s category", (permitType) => {
    const result = assessCase({
      ...base,
      permitType,
      permitValidUntil: "2027-08-31",
      workAuthorizationGrantedForContract: null,
      employerVerificationCompleted: true,
    }, now);

    expect(result.status).toBe("review_required");
    expect(result.canWorkNow).toBeNull();
  });

  it("requires review when a temporary document's work mention is unknown", () => {
    const result = assessCase({
      ...base,
      permitType: "extension_attestation",
      permitValidUntil: "2026-12-31",
      temporaryDocumentAllowsWork: null,
      workAuthorizationGrantedForContract: null,
    }, now);

    expect(result.status).toBe("review_required");
    expect(result.canWorkNow).toBe(false);
  });

  it("keeps an expired document hire conditional while forbidding immediate work", () => {
    const result = assessCase({
      ...base,
      permitType: "employee",
      permitValidUntil: "2026-08-31",
      workAuthorizationGrantedForContract: true,
      employerVerificationCompleted: true,
    }, now);

    expect(result.status).toBe("conditional");
    expect(result.canWorkNow).toBe(false);
  });

  it("fails closed for a third-country recruitment from abroad", () => {
    const result = assessCase({
      ...base,
      location: "abroad",
      registeredWithFranceTravail: null,
      employerVerificationCompleted: null,
    }, now);

    expect(result.status).toBe("review_required");
    expect(result.canWorkNow).toBe(false);
    expect(result.findings.some((finding) => finding.id === "hire-abroad-review")).toBe(true);
  });

  it("keeps rule versions and sources in the result for reproducibility", () => {
    const result = assessCase({
      ...base,
      permitType: "resident",
      permitValidUntil: "2030-09-01",
      employerVerificationCompleted: true,
    }, now);

    expect(result.appliedRules.length).toBeGreaterThan(0);
    expect(result.appliedRules.every((rule) => rule.version >= 1)).toBe(true);
    expect(result.sourceIds).toContain("ct-r5221-2");
  });
});