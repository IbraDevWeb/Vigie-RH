import { describe, expect, it } from "vitest";
import { createForeignWorkerAssessment } from "./create-foreign-worker-assessment";
import { InMemoryAssessmentRepository } from "@/infrastructure/repositories/in-memory-assessment-repository";

const input = {
  action: "hire" as const,
  nationalityGroup: "third_country" as const,
  location: "france" as const,
  permitType: "resident" as const,
  permitValidUntil: "2030-09-01",
  plannedStartDate: "2026-10-01",
  contractType: "cdi" as const,
  newContract: true,
  region: "Île-de-France",
  occupation: "Responsable administratif",
  registeredWithFranceTravail: false,
  employerVerificationCompleted: true,
};

describe("createForeignWorkerAssessment", () => {
  it("persists the validated input, legal result and applied rule versions", async () => {
    const repository = new InMemoryAssessmentRepository();
    const created = await createForeignWorkerAssessment(input, repository);
    const saved = await repository.findById(created.assessmentId);

    expect(created.assessmentId).toBeTruthy();
    expect(created.result.status).toBe("clear");
    expect(saved).not.toBeNull();
    expect(saved?.inputSnapshot.occupation).toBe(input.occupation);
    expect(saved?.resultSnapshot).toEqual(created.result);
    expect(saved?.ruleVersions).toEqual(created.result.appliedRules);
    expect(saved?.ruleVersions.length).toBeGreaterThan(0);
  });
});
