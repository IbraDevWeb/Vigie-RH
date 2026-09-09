import { describe, expect, it } from "vitest";
import { createForeignWorkerAssessment } from "./create-foreign-worker-assessment";
import { getForeignWorkerAssessment } from "./get-foreign-worker-assessment";
import type { ActorContext } from "./authorization";
import { InMemoryAssessmentRepository } from "@/infrastructure/repositories/in-memory-assessment-repository";

const owner: ActorContext = {
  userId: "00000000-0000-4000-8000-000000000002",
  organizationId: "00000000-0000-4000-8000-000000000001",
  role: "owner",
};

const input = {
  action: "can_work" as const,
  nationalityGroup: "eu_eea_swiss" as const,
  location: "france" as const,
  permitType: "none" as const,
  contractType: "cdi" as const,
  newContract: false,
};

describe("getForeignWorkerAssessment", () => {
  it("allows a read-only member of the same organization to read an assessment", async () => {
    const repository = new InMemoryAssessmentRepository();
    const created = await createForeignWorkerAssessment(input, repository, owner);

    const record = await getForeignWorkerAssessment(created.assessmentId, repository, {
      ...owner,
      role: "readonly",
    });

    expect(record?.id).toBe(created.assessmentId);
  });

  it("does not return an assessment from another organization", async () => {
    const repository = new InMemoryAssessmentRepository();
    const created = await createForeignWorkerAssessment(input, repository, owner);

    const record = await getForeignWorkerAssessment(created.assessmentId, repository, {
      ...owner,
      organizationId: "00000000-0000-4000-8000-000000000099",
      role: "readonly",
    });

    expect(record).toBeNull();
  });
});
