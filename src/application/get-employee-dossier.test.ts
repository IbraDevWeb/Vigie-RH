import { describe, expect, it } from "vitest";
import { getEmployeeDossier } from "./get-employee-dossier";
import type { ActorContext } from "./authorization";
import { assessCase } from "@/domain/legal/engine";
import { validateAssessmentInput } from "@/domain/legal/validation";
import type { EmployeeRecord } from "@/domain/employee/record";
import type { EmployeeDocumentRecord } from "@/domain/employee/document-record";
import type { ComplianceTaskRecord } from "@/domain/compliance/task-record";
import type { AssessmentRecord } from "@/infrastructure/repositories/assessment-repository";
import { InMemoryAssessmentRepository } from "@/infrastructure/repositories/in-memory-assessment-repository";
import { InMemoryComplianceTaskStore } from "@/infrastructure/repositories/in-memory-compliance-task-store";
import { InMemoryEmployeeDocumentStore } from "@/infrastructure/repositories/in-memory-employee-document-store";
import { InMemoryEmployeeStore } from "@/infrastructure/repositories/in-memory-employee-store";

const organizationId = "00000000-0000-4000-8000-000000000001";
const actor: ActorContext = {
  userId: "00000000-0000-4000-8000-000000000002",
  organizationId,
  role: "readonly",
};
const employee: EmployeeRecord = {
  id: "00000000-0000-4000-8000-000000000010",
  organizationId,
  firstName: "Nora",
  lastName: "Martin",
  nationalityCode: "DZ",
  roleTitle: "Analyste",
  workSite: "Paris",
  contractType: "CDI",
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-01T08:00:00.000Z",
};

function document(id: string, isCurrent: boolean, validUntil: string | null): EmployeeDocumentRecord {
  return {
    id,
    organizationId,
    employeeId: employee.id,
    documentType: "residence_permit",
    label: isCurrent ? "Titre actuel" : "Ancien titre",
    storageKey: null,
    issuedAt: null,
    validUntil,
    isCurrent,
    extractedFields: {},
    extractionConfidence: null,
    confirmedByUserId: null,
    confirmedAt: null,
    createdAt: isCurrent ? "2026-09-02T08:00:00.000Z" : "2025-09-02T08:00:00.000Z",
  };
}

function task(id: string, status: ComplianceTaskRecord["status"], dueAt: string | null): ComplianceTaskRecord {
  return {
    id,
    organizationId,
    employeeId: employee.id,
    assessmentId: null,
    sourceKey: null,
    title: status === "done" ? "Contrôle terminé" : "Contrôle à faire",
    dueAt,
    status,
    severity: "warning",
    assignedToUserId: null,
    createdAt: "2026-09-03T08:00:00.000Z",
    completedAt: status === "done" ? "2026-09-04T08:00:00.000Z" : null,
  };
}

function assessment(id: string, createdAt: string): AssessmentRecord {
  const input = validateAssessmentInput({
    action: "can_work",
    nationalityGroup: "eu_eea_swiss",
    location: "france",
    permitType: "none",
    contractType: "cdi",
    newContract: false,
  });
  const result = assessCase(input, new Date(createdAt));
  return {
    id,
    organizationId,
    employeeId: employee.id,
    createdByUserId: actor.userId,
    inputSnapshot: input,
    resultSnapshot: result,
    ruleVersions: result.appliedRules,
    createdAt,
  };
}

describe("getEmployeeDossier", () => {
  it("aggregates only the requested tenant-scoped employee dossier", async () => {
    const employees = new InMemoryEmployeeStore();
    const documents = new InMemoryEmployeeDocumentStore();
    const assessments = new InMemoryAssessmentRepository();
    const tasks = new InMemoryComplianceTaskStore();
    await employees.create(employee);
    await documents.create(document("00000000-0000-4000-8000-000000000020", true, "2026-11-01"));
    await documents.create(document("00000000-0000-4000-8000-000000000021", false, "2025-11-01"));
    await assessments.save(assessment("00000000-0000-4000-8000-000000000030", "2026-09-05T08:00:00.000Z"));
    await assessments.save(assessment("00000000-0000-4000-8000-000000000031", "2026-09-10T08:00:00.000Z"));
    await tasks.create(task("00000000-0000-4000-8000-000000000040", "todo", "2026-09-20T08:00:00.000Z"));
    await tasks.create(task("00000000-0000-4000-8000-000000000041", "done", "2026-09-15T08:00:00.000Z"));

    const dossier = await getEmployeeDossier(
      employee.id,
      employees,
      documents,
      assessments,
      tasks,
      actor,
      new Date("2026-09-11T12:00:00.000Z"),
    );

    expect(dossier?.employee).toEqual(employee);
    expect(dossier?.currentDocuments).toHaveLength(1);
    expect(dossier?.historicalDocuments).toHaveLength(1);
    expect(dossier?.assessments.map((item) => item.id)).toEqual([
      "00000000-0000-4000-8000-000000000031",
      "00000000-0000-4000-8000-000000000030",
    ]);
    expect(dossier?.latestAssessment?.id).toBe("00000000-0000-4000-8000-000000000031");
    expect(dossier?.openTasks).toHaveLength(1);
    expect(dossier?.closedTasks).toHaveLength(1);
    expect(dossier?.nextDocumentExpiry).toBe("2026-11-01");
    expect(dossier?.nextTaskDueAt).toBe("2026-09-20T08:00:00.000Z");
  });

  it("returns null instead of exposing another organization's employee", async () => {
    const employees = new InMemoryEmployeeStore();
    await employees.create(employee);

    const dossier = await getEmployeeDossier(
      employee.id,
      employees,
      new InMemoryEmployeeDocumentStore(),
      new InMemoryAssessmentRepository(),
      new InMemoryComplianceTaskStore(),
      { ...actor, organizationId: "00000000-0000-4000-8000-000000000099" },
    );

    expect(dossier).toBeNull();
  });
});
