import { describe, expect, it } from "vitest";
import type { ActorContext } from "./authorization";
import { createEmployeeAssessment } from "./create-employee-assessment";
import { listEmployeeAssessments } from "./list-employee-assessments";
import { InMemoryAssessmentRepository } from "@/infrastructure/repositories/in-memory-assessment-repository";
import { InMemoryEmployeeStore } from "@/infrastructure/repositories/in-memory-employee-store";
import type { EmployeeRecord } from "@/domain/employee/record";

const actor: ActorContext = {
  userId: "00000000-0000-4000-8000-000000000002",
  organizationId: "00000000-0000-4000-8000-000000000001",
  role: "hr",
};

const employee: EmployeeRecord = {
  id: "00000000-0000-4000-8000-000000000010",
  organizationId: actor.organizationId,
  firstName: "Nora",
  lastName: "Martin",
  nationalityCode: "FR",
  roleTitle: "RH",
  workSite: "Paris",
  contractType: "CDI",
  createdAt: "2026-09-09T18:00:00.000Z",
  updatedAt: "2026-09-09T18:00:00.000Z",
};

const assessmentInput = {
  action: "can_work" as const,
  nationalityGroup: "eu_eea_swiss" as const,
  location: "france" as const,
  permitType: "none" as const,
  contractType: "cdi" as const,
  newContract: false,
};

async function employeeStore() {
  const store = new InMemoryEmployeeStore();
  await store.create(employee);
  return store;
}

describe("employee-linked assessments", () => {
  it("persists and lists an assessment under the employee dossier", async () => {
    const employees = await employeeStore();
    const assessments = new InMemoryAssessmentRepository();

    const created = await createEmployeeAssessment(
      employee.id,
      assessmentInput,
      employees,
      assessments,
      actor,
    );
    const saved = await assessments.findById(created.assessmentId, actor.organizationId);

    expect(saved?.employeeId).toBe(employee.id);
    await expect(listEmployeeAssessments(employee.id, employees, assessments, actor))
      .resolves.toEqual([saved]);
  });

  it("does not attach an assessment to a foreign-tenant employee", async () => {
    const employees = await employeeStore();
    const assessments = new InMemoryAssessmentRepository();
    const foreignActor: ActorContext = {
      ...actor,
      organizationId: "00000000-0000-4000-8000-000000000099",
    };

    await expect(createEmployeeAssessment(
      employee.id,
      assessmentInput,
      employees,
      assessments,
      foreignActor,
    )).rejects.toThrow("Salarié introuvable");
  });

  it("allows readonly members to read history but not create an assessment", async () => {
    const employees = await employeeStore();
    const assessments = new InMemoryAssessmentRepository();
    await createEmployeeAssessment(employee.id, assessmentInput, employees, assessments, actor);
    const readonly: ActorContext = { ...actor, role: "readonly" };

    await expect(listEmployeeAssessments(employee.id, employees, assessments, readonly))
      .resolves.toHaveLength(1);
    await expect(createEmployeeAssessment(
      employee.id,
      assessmentInput,
      employees,
      assessments,
      readonly,
    )).rejects.toThrow("Permission refusée");
  });
});
