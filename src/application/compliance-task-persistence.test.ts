import { describe, expect, it } from "vitest";
import type { ActorContext } from "./authorization";
import { createComplianceTask } from "./create-compliance-task";
import { getComplianceTask } from "./get-compliance-task";
import { listComplianceTasks } from "./list-compliance-tasks";
import { updateComplianceTaskStatus } from "./update-compliance-task-status";
import { InMemoryComplianceTaskStore } from "@/infrastructure/repositories/in-memory-compliance-task-store";
import { InMemoryEmployeeStore } from "@/infrastructure/repositories/in-memory-employee-store";
import type { AssessmentRecord, AssessmentRepository } from "@/infrastructure/repositories/assessment-repository";
import type { EmployeeRecord } from "@/domain/employee/record";

const hr: ActorContext = {
  userId: "00000000-0000-4000-8000-000000000002",
  organizationId: "00000000-0000-4000-8000-000000000001",
  role: "hr",
};

const employee: EmployeeRecord = {
  id: "00000000-0000-4000-8000-000000000010",
  organizationId: hr.organizationId,
  firstName: "Nora",
  lastName: "Martin",
  nationalityCode: "FR",
  roleTitle: "RH",
  workSite: "Paris",
  contractType: "CDI",
  createdAt: "2026-09-09T18:00:00.000Z",
  updatedAt: "2026-09-09T18:00:00.000Z",
};

function assessmentRepositoryFor(id = "00000000-0000-4000-8000-000000000020"): AssessmentRepository {
  return {
    save: async () => undefined,
    findById: async (candidateId, organizationId) => {
      if (candidateId !== id || organizationId !== hr.organizationId) return null;
      return { id, organizationId } as AssessmentRecord;
    },
    listByOrganization: async () => [],
    listByEmployee: async () => [],
  };
}

async function employeeStoreWithEmployee() {
  const store = new InMemoryEmployeeStore();
  await store.create(employee);
  return store;
}

describe("compliance task persistence use-cases", () => {
  it("creates a tenant-scoped task with normalized deadline", async () => {
    const taskStore = new InMemoryComplianceTaskStore();
    const employeeStore = await employeeStoreWithEmployee();
    const assessmentId = "00000000-0000-4000-8000-000000000020";

    const task = await createComplianceTask({
      employeeId: employee.id,
      assessmentId,
      title: "Vérifier le renouvellement",
      dueAt: "2026-10-01T09:00:00+02:00",
      severity: "warning",
    }, taskStore, employeeStore, assessmentRepositoryFor(assessmentId), hr, new Date("2026-09-09T18:00:00Z"));

    expect(task.organizationId).toBe(hr.organizationId);
    expect(task.status).toBe("todo");
    expect(task.dueAt).toBe("2026-10-01T07:00:00.000Z");
    expect(task.assignedToUserId).toBeNull();
  });

  it("refuses employee and assessment references outside the current organization", async () => {
    const taskStore = new InMemoryComplianceTaskStore();
    const employeeStore = await employeeStoreWithEmployee();
    const foreign: ActorContext = {
      ...hr,
      organizationId: "00000000-0000-4000-8000-000000000099",
    };

    await expect(createComplianceTask({
      employeeId: employee.id,
      title: "Contrôle",
    }, taskStore, employeeStore, assessmentRepositoryFor(), foreign)).rejects.toThrow("Salarié introuvable");

    await expect(createComplianceTask({
      assessmentId: "00000000-0000-4000-8000-000000000020",
      title: "Contrôle",
    }, taskStore, employeeStore, assessmentRepositoryFor(), foreign)).rejects.toThrow("Assessment introuvable");
  });

  it("allows advisors to manage tasks and readonly users only to read them", async () => {
    const taskStore = new InMemoryComplianceTaskStore();
    const employeeStore = await employeeStoreWithEmployee();
    const advisor: ActorContext = { ...hr, role: "advisor" };
    const readonly: ActorContext = { ...hr, role: "readonly" };

    const task = await createComplianceTask(
      { title: "Préparer le contrôle" },
      taskStore,
      employeeStore,
      assessmentRepositoryFor(),
      advisor,
    );

    await expect(getComplianceTask(task.id, taskStore, readonly)).resolves.toEqual(task);
    await expect(updateComplianceTaskStatus(task.id, { status: "done" }, taskStore, readonly))
      .rejects.toThrow("Permission refusée");
  });

  it("sets completedAt when done and clears it when reopened", async () => {
    const taskStore = new InMemoryComplianceTaskStore();
    const employeeStore = await employeeStoreWithEmployee();
    const task = await createComplianceTask(
      { title: "Préparer le contrôle" },
      taskStore,
      employeeStore,
      assessmentRepositoryFor(),
      hr,
    );

    const done = await updateComplianceTaskStatus(
      task.id,
      { status: "done" },
      taskStore,
      hr,
      new Date("2026-09-10T08:00:00Z"),
    );
    expect(done?.completedAt).toBe("2026-09-10T08:00:00.000Z");

    const reopened = await updateComplianceTaskStatus(
      task.id,
      { status: "doing" },
      taskStore,
      hr,
      new Date("2026-09-11T08:00:00Z"),
    );
    expect(reopened?.completedAt).toBeNull();
  });

  it("filters lists without exposing another tenant", async () => {
    const taskStore = new InMemoryComplianceTaskStore();
    const employeeStore = await employeeStoreWithEmployee();
    const first = await createComplianceTask(
      { employeeId: employee.id, title: "Première" },
      taskStore,
      employeeStore,
      assessmentRepositoryFor(),
      hr,
    );
    await createComplianceTask(
      { title: "Deuxième" },
      taskStore,
      employeeStore,
      assessmentRepositoryFor(),
      hr,
    );

    await expect(listComplianceTasks(taskStore, hr, { employeeId: employee.id }))
      .resolves.toEqual([first]);
    await expect(listComplianceTasks(taskStore, { ...hr, organizationId: "00000000-0000-4000-8000-000000000099" }))
      .resolves.toEqual([]);
  });

  it("rejects malformed references and deadlines", async () => {
    const taskStore = new InMemoryComplianceTaskStore();
    const employeeStore = await employeeStoreWithEmployee();

    await expect(createComplianceTask(
      { employeeId: "not-a-uuid", title: "Contrôle" },
      taskStore,
      employeeStore,
      assessmentRepositoryFor(),
      hr,
    )).rejects.toThrow("Données de tâche invalides");

    await expect(createComplianceTask(
      { title: "Contrôle", dueAt: "2026-10-01" },
      taskStore,
      employeeStore,
      assessmentRepositoryFor(),
      hr,
    )).rejects.toThrow("Données de tâche invalides");
  });
});
