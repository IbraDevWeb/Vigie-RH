import { describe, expect, it } from "vitest";
import type { Pool } from "pg";
import type { ComplianceTaskRecord } from "@/domain/compliance/task-record";
import { PostgresComplianceTaskStore } from "./postgres-compliance-task-store";

const record: ComplianceTaskRecord = {
  id: "00000000-0000-4000-8000-000000000030",
  organizationId: "00000000-0000-4000-8000-000000000001",
  employeeId: "00000000-0000-4000-8000-000000000010",
  assessmentId: "00000000-0000-4000-8000-000000000020",
  title: "Vérifier le renouvellement",
  dueAt: "2026-10-01T07:00:00.000Z",
  status: "todo",
  severity: "warning",
  assignedToUserId: null,
  createdAt: "2026-09-09T18:00:00.000Z",
  completedAt: null,
};

function row(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: record.id,
    organization_id: record.organizationId,
    employee_id: record.employeeId,
    assessment_id: record.assessmentId,
    title: record.title,
    due_at: record.dueAt,
    status: record.status,
    severity: record.severity,
    assigned_to: record.assignedToUserId,
    created_at: record.createdAt,
    completed_at: record.completedAt,
    ...overrides,
  };
}

describe("PostgresComplianceTaskStore", () => {
  it("sets tenant context before inserting a task", async () => {
    const calls: Array<{ text: string; values?: unknown[] }> = [];
    const client = {
      query: async (text: string, values?: unknown[]) => {
        calls.push({ text, values });
        return { rows: [] };
      },
      release: () => undefined,
    };
    const pool = { connect: async () => client } as unknown as Pool;

    await new PostgresComplianceTaskStore(pool).create(record);

    expect(calls[0]?.text).toBe("begin");
    expect(calls[1]?.values).toEqual([record.organizationId]);
    expect(calls[2]?.text).toContain("insert into compliance_tasks");
    expect(calls[2]?.values?.slice(0, 4)).toEqual([
      record.id,
      record.organizationId,
      record.employeeId,
      record.assessmentId,
    ]);
    expect(calls.at(-1)?.text).toBe("commit");
  });

  it("uses parameterized employee and status filters", async () => {
    const calls: Array<{ text: string; values?: unknown[] }> = [];
    const client = {
      query: async (text: string, values?: unknown[]) => {
        calls.push({ text, values });
        return text.includes("order by due_at") ? { rows: [row()] } : { rows: [] };
      },
      release: () => undefined,
    };
    const pool = { connect: async () => client } as unknown as Pool;

    const tasks = await new PostgresComplianceTaskStore(pool).listByOrganization(
      record.organizationId,
      { employeeId: record.employeeId ?? undefined, status: "todo" },
    );

    expect(tasks).toEqual([record]);
    const selectCall = calls.find((call) => call.text.includes("order by due_at"));
    expect(selectCall?.text).toContain("employee_id = $2");
    expect(selectCall?.text).toContain("status = $3");
    expect(selectCall?.values).toEqual([record.organizationId, record.employeeId, "todo"]);
  });

  it("updates status only inside the current organization", async () => {
    const calls: Array<{ text: string; values?: unknown[] }> = [];
    const completedAt = "2026-09-10T08:00:00.000Z";
    const client = {
      query: async (text: string, values?: unknown[]) => {
        calls.push({ text, values });
        return text.includes("update compliance_tasks")
          ? { rows: [row({ status: "done", completed_at: completedAt })] }
          : { rows: [] };
      },
      release: () => undefined,
    };
    const pool = { connect: async () => client } as unknown as Pool;

    const updated = await new PostgresComplianceTaskStore(pool).updateStatus(
      record.id,
      record.organizationId,
      "done",
      completedAt,
    );

    expect(updated?.status).toBe("done");
    expect(updated?.completedAt).toBe(completedAt);
    const updateCall = calls.find((call) => call.text.includes("update compliance_tasks"));
    expect(updateCall?.values).toEqual(["done", completedAt, record.id, record.organizationId]);
  });
});
