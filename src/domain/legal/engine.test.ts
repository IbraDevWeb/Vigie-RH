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
};

const now = new Date("2026-09-09T10:00:00Z");

describe("legal rule engine", () => {
  it("clears an EU national from work authorization", () => {
    const result = assessCase({ ...base, nationalityGroup: "eu_eea_swiss", permitType: "other" }, now);
    expect(result.status).toBe("clear");
    expect(result.workAuthorization).toBe("no");
    expect(result.canWorkNow).toBe(true);
  });

  it("blocks a third-country candidate with no permit", () => {
    const result = assessCase(base, now);
    expect(result.canWorkNow).toBe(false);
    expect(result.workAuthorization).toBe("yes");
  });

  it("allows the generic student case under 964 hours", () => {
    const result = assessCase({ ...base, permitType: "student", studentHoursPlanned: 700 }, now);
    expect(result.workAuthorization).toBe("no");
    expect(result.canWorkNow).toBe(true);
  });

  it("requires review for Algerian special regime", () => {
    const result = assessCase({ ...base, nationalityGroup: "algeria", permitType: "student" }, now);
    expect(result.status).toBe("review_required");
    expect(result.confidence).toBe("low");
  });

  it("blocks an expired permit without a temporary right to work", () => {
    const result = assessCase({ ...base, permitType: "employee", permitValidUntil: "2026-08-31" }, now);
    expect(result.status).toBe("blocked");
    expect(result.canWorkNow).toBe(false);
  });
});
