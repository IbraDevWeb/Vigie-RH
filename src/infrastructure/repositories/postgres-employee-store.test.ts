import { describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { PostgresEmployeeStore } from "./postgres-employee-store";
import type { EmployeeRecord } from "@/domain/employee/record";

const record: EmployeeRecord = {
  id: "00000000-0000-4000-8000-000000000010",
  organizationId: "00000000-0000-4000-8000-000000000001",
  firstName: "Nora",
  lastName: "Martin",
  nationalityCode: "FR",
  roleTitle: "RH",
  workSite: "Paris",
  contractType: "CDI",
  createdAt: "2026-09-09T18:00:00.000Z",
  updatedAt: "2026-09-09T18:00:00.000Z",
};

function row() {
  return {
    id: record.id,
    organization_id: record.organizationId,
    first_name: record.firstName,
    last_name: record.lastName,
    nationality_code: record.nationalityCode,
    role_title: record.roleTitle,
    work_site: record.workSite,
    contract_type: record.contractType,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

describe("PostgresEmployeeStore", () => {
  it("sets tenant context before inserting a record", async () => {
    const calls: Array<{ text: string; values?: unknown[] }> = [];
    const client = {
      query: async (text: string, values?: unknown[]) => {
        calls.push({ text, values });
        return { rows: [] };
      },
      release: () => undefined,
    };
    const pool = { connect: async () => client } as unknown as Pool;

    await new PostgresEmployeeStore(pool).create(record);

    expect(calls[0]?.text).toBe("begin");
    expect(calls[1]?.values).toEqual([record.organizationId]);
    expect(calls[2]?.text).toContain("insert into employees");
    expect(calls[2]?.values?.[1]).toBe(record.organizationId);
    expect(calls.at(-1)?.text).toBe("commit");
  });

  it("filters an individual lookup by id and organization", async () => {
    const calls: Array<{ text: string; values?: unknown[] }> = [];
    const client = {
      query: async (text: string, values?: unknown[]) => {
        calls.push({ text, values });
        return text.includes("where id = $1") ? { rows: [row()] } : { rows: [] };
      },
      release: () => undefined,
    };
    const pool = { connect: async () => client } as unknown as Pool;

    const found = await new PostgresEmployeeStore(pool).findById(record.id, record.organizationId);

    expect(found).toEqual(record);
    const selectCall = calls.find((call) => call.text.includes("where id = $1"));
    expect(selectCall?.values).toEqual([record.id, record.organizationId]);
  });

  it("filters listings by organization", async () => {
    const calls: Array<{ text: string; values?: unknown[] }> = [];
    const client = {
      query: async (text: string, values?: unknown[]) => {
        calls.push({ text, values });
        return text.includes("order by last_name") ? { rows: [row()] } : { rows: [] };
      },
      release: () => undefined,
    };
    const pool = { connect: async () => client } as unknown as Pool;

    const employees = await new PostgresEmployeeStore(pool).listByOrganization(record.organizationId);

    expect(employees).toEqual([record]);
    const listCall = calls.find((call) => call.text.includes("order by last_name"));
    expect(listCall?.values).toEqual([record.organizationId]);
  });
});
