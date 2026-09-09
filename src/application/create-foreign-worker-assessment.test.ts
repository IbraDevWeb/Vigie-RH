import { describe, expect, it } from "vitest";
import { createForeignWorkerAssessment } from "./create-foreign-worker-assessment";
import type { ActorContext } from "./authorization";
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

const actor: ActorContext = {
  userId: "00000000-0000-4000-8000-000000000002",
  organizationId: "00000000-0000-4000-8000-000000000001",
  role: "hr",
};

describe("createForeignWorkerAssessment", () => {
  it("persists the validated input, tenant, actor and applied rule versions", async () => {
    const repository = new InMemoryAssessmentRepository();
    const created = await createForeignWorkerAssessment(input, repository, actor);
    const saved = await repository.findById(created.assessmentId, actor.organizationId);

    expect(created.assessmentId).toBeTruthy();
    expect(created.result.status).toBe("clear");
    expect(saved).not.toBeNull();
    expect(saved?.organizationId).toBe(actor.organizationId);
    expect(saved?.createdByUserId).toBe(actor.userId);
    expect(saved?.inputSnapshot.occupation).toBe(input.occupation);
    expect(saved?.resultSnapshot).toEqual(created.result);
    expect(saved?.ruleVersions).toEqual(created.result.appliedRules);
    expect(saved?.ruleVersions.length).toBeGreaterThan(0);
  });

  it("does not expose an assessment through another organization", async () => {
    const repository = new InMemoryAssessmentRepository();
    const created = await createForeignWorkerAssessment(input, repository, actor);

    const leaked = await repository.findById(
      created.assessmentId,
      "00000000-0000-4000-8000-000000000099",
    );

    expect(leaked).toBeNull();
  });

  it("rejects creation for a read-only member", async () => {
    const repository = new InMemoryAssessmentRepository();

    await expect(
      createForeignWorkerAssessment(input, repository, { ...actor, role: "readonly" }),
    ).rejects.toThrow("Permission refusée");
  });
});
