import { describe, expect, it } from "vitest";
import { getComplianceOverview } from "./get-compliance-overview";
import type { ActorContext } from "./authorization";
import { assessCase } from "@/domain/legal/engine";
import { validateAssessmentInput } from "@/domain/legal/validation";
import type { AssessmentStatus } from "@/domain/legal/types";
import type { EmployeeDocumentRecord } from "@/domain/employee/document-record";
import type { EmployeeRecord } from "@/domain/employee/record";
import type { ComplianceTaskRecord } from "@/domain/compliance/task-record";
import { InMemoryAssessmentRepository } from "@/infrastructure/repositories/in-memory-assessment-repository";
import { InMemoryComplianceTaskStore } from "@/infrastructure/repositories/in-memory-compliance-task-store";
import { InMemoryEmployeeDocumentStore } from "@/infrastructure/repositories/in-memory-employee-document-store";
import { InMemoryEmployeeStore } from "@/infrastructure/repositories/in-memory-employee-store";
import type { AssessmentRecord } from "@/infrastructure/repositories/assessment-repository";

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

function document(overrides: Partial<EmployeeDocumentRecord> = {}): EmployeeDocumentRecord {
  return {
    id: "00000000-0000-4000-8000-000000000020",
    organizationId,
    employeeId: employee.id,
    documentType: "residence_permit",
    label: "Titre de séjour",
    storageKey: null,
    issuedAt: "2026-01-01",
    validUntil: "2026-12-01",
    isCurrent: true,
    extractedFields: {},
    extractionConfidence: null,
    confirmedByUserId: null,
    confirmedAt: null,
    createdAt: "2026-09-01T08:00:00.000Z",
    ...overrides,
  };
}

function task(overrides: Partial<ComplianceTaskRecord> = {}): ComplianceTaskRecord {
  return {
    id: "00000000-0000-4000-8000-000000000030",
    organizationId,
    employeeId: employee.id,
    assessmentId: null,
    title: "Vérifier le renouvellement",
    dueAt: "2026-09-20T08:00:00.000Z",
    status: "todo",
    severity: "warning",
    assignedToUserId: null,
    createdAt: "2026-09-01T08:00:00.000Z",
    completedAt: null,
    ...overrides,
  };
}

function assessment(status: AssessmentStatus, createdAt = "2026-09-05T08:00:00.000Z"): AssessmentRecord {
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
    id: `00000000-0000-4000-8000-${status === "blocked" ? "000000000041" : "000000000040"}`,
    organizationId,
    employeeId: employee.id,
    createdByUserId: actor.userId,
    inputSnapshot: input,
    resultSnapshot: {
      ...result,
      status,
      statusLabel: status,
    },
    ruleVersions: result.appliedRules,
    createdAt,
  };
}

async function stores() {
  const employees = new InMemoryEmployeeStore();
  const documents = new InMemoryEmployeeDocumentStore();
  const assessments = new InMemoryAssessmentRepository();
  const tasks = new InMemoryComplianceTaskStore();
  await employees.create(employee);
  return { employees, documents, assessments, tasks };
}

describe("getComplianceOverview", () => {
  it("uses only explicitly current documents for expiry signals", async () => {
    const source = await stores();
    await source.documents.create(document({ validUntil: "2026-10-15", isCurrent: true }));
    await source.documents.create(document({
      id: "00000000-0000-4000-8000-000000000021",
      validUntil: "2026-01-01",
      isCurrent: false,
      label: "Ancien titre",
    }));
    await source.assessments.save(assessment("clear"));

    const overview = await getComplianceOverview(
      source.employees,
      source.documents,
      source.assessments,
      source.tasks,
      actor,
      new Date("2026-09-11T12:00:00.000Z"),
    );

    expect(overview.counts.expiredCurrentDocuments).toBe(0);
    expect(overview.counts.currentDocumentsExpiringWithin90Days).toBe(1);
    expect(overview.employees[0]?.currentDocumentCount).toBe(1);
    expect(overview.employees[0]?.attentionLevel).toBe("attention");
  });

  it("keeps a dossier unknown when no assessment exists and no stronger signal applies", async () => {
    const source = await stores();

    const overview = await getComplianceOverview(
      source.employees,
      source.documents,
      source.assessments,
      source.tasks,
      actor,
      new Date("2026-09-11T12:00:00.000Z"),
    );

    expect(overview.counts.employeesWithoutAssessment).toBe(1);
    expect(overview.employees[0]?.attentionLevel).toBe("unknown");
    expect(overview.disclaimer).toContain("ne constitue pas");
  });

  it("surfaces blocked assessments and expired current documents as urgent", async () => {
    const source = await stores();
    await source.assessments.save(assessment("blocked"));
    await source.documents.create(document({ validUntil: "2026-09-10" }));

    const overview = await getComplianceOverview(
      source.employees,
      source.documents,
      source.assessments,
      source.tasks,
      actor,
      new Date("2026-09-11T12:00:00.000Z"),
    );

    expect(overview.employees[0]?.attentionLevel).toBe("urgent");
    expect(overview.counts.expiredCurrentDocuments).toBe(1);
    expect(overview.priorities[0]).toMatchObject({
      kind: "document_expiry",
      urgency: "overdue",
      employeeId: employee.id,
    });
  });

  it("aggregates open tasks and ignores completed tasks", async () => {
    const source = await stores();
    await source.assessments.save(assessment("clear"));
    await source.tasks.create(task({ severity: "critical", dueAt: "2026-09-10T08:00:00.000Z" }));
    await source.tasks.create(task({
      id: "00000000-0000-4000-8000-000000000031",
      status: "done",
      severity: "critical",
      dueAt: "2026-09-09T08:00:00.000Z",
      completedAt: "2026-09-09T09:00:00.000Z",
    }));

    const overview = await getComplianceOverview(
      source.employees,
      source.documents,
      source.assessments,
      source.tasks,
      actor,
      new Date("2026-09-11T12:00:00.000Z"),
    );

    expect(overview.counts.openTasks).toBe(1);
    expect(overview.counts.criticalOpenTasks).toBe(1);
    expect(overview.counts.overdueOpenTasks).toBe(1);
    expect(overview.employees[0]?.attentionLevel).toBe("urgent");
    expect(overview.priorities[0]).toMatchObject({ kind: "task", urgency: "overdue" });
  });

  it("returns no_open_signal only when a real assessment exists and no open signal remains", async () => {
    const source = await stores();
    await source.assessments.save(assessment("clear"));
    await source.documents.create(document({ validUntil: "2027-12-01" }));

    const overview = await getComplianceOverview(
      source.employees,
      source.documents,
      source.assessments,
      source.tasks,
      actor,
      new Date("2026-09-11T12:00:00.000Z"),
    );

    expect(overview.employees[0]?.attentionLevel).toBe("no_open_signal");
    expect(overview.priorities).toEqual([]);
  });

  it("does not aggregate another organization's records", async () => {
    const source = await stores();
    await source.assessments.save(assessment("clear"));
    await source.documents.create(document());
    await source.tasks.create(task());

    const overview = await getComplianceOverview(
      source.employees,
      source.documents,
      source.assessments,
      source.tasks,
      { ...actor, organizationId: "00000000-0000-4000-8000-000000000099" },
      new Date("2026-09-11T12:00:00.000Z"),
    );

    expect(overview.counts.employees).toBe(0);
    expect(overview.counts.openTasks).toBe(0);
    expect(overview.priorities).toEqual([]);
  });
});
