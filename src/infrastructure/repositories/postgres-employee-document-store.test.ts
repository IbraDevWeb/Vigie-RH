import { describe, expect, it } from "vitest";
import type { Pool } from "pg";
import type { EmployeeDocumentRecord } from "@/domain/employee/document-record";
import { PostgresEmployeeDocumentStore } from "./postgres-employee-document-store";

const record: EmployeeDocumentRecord = {
  id: "00000000-0000-4000-8000-000000000020",
  organizationId: "00000000-0000-4000-8000-000000000001",
  employeeId: "00000000-0000-4000-8000-000000000010",
  documentType: "residence_permit",
  label: "Carte de séjour",
  storageKey: "org/employee/document.pdf",
  issuedAt: "2026-01-10",
  validUntil: "2027-01-09",
  extractedFields: {},
  extractionConfidence: null,
  confirmedByUserId: null,
  confirmedAt: null,
  createdAt: "2026-09-09T18:00:00.000Z",
};

function row() {
  return {
    id: record.id,
    organization_id: record.organizationId,
    employee_id: record.employeeId,
    document_type: record.documentType,
    label: record.label,
    storage_key: record.storageKey,
    issued_at: record.issuedAt,
    valid_until: record.validUntil,
    extracted_fields: record.extractedFields,
    extraction_confidence: record.extractionConfidence,
    confirmed_by_user_id: record.confirmedByUserId,
    confirmed_at: record.confirmedAt,
    created_at: record.createdAt,
  };
}

describe("PostgresEmployeeDocumentStore", () => {
  it("sets tenant context before inserting a document", async () => {
    const calls: Array<{ text: string; values?: unknown[] }> = [];
    const client = {
      query: async (text: string, values?: unknown[]) => {
        calls.push({ text, values });
        return { rows: [] };
      },
      release: () => undefined,
    };
    const pool = { connect: async () => client } as unknown as Pool;

    await new PostgresEmployeeDocumentStore(pool).create(record);

    expect(calls[0]?.text).toBe("begin");
    expect(calls[1]?.values).toEqual([record.organizationId]);
    expect(calls[2]?.text).toContain("insert into employee_documents");
    expect(calls[2]?.values?.[1]).toBe(record.organizationId);
    expect(calls[2]?.values?.[2]).toBe(record.employeeId);
    expect(calls.at(-1)?.text).toBe("commit");
  });

  it("filters listings by employee and organization", async () => {
    const calls: Array<{ text: string; values?: unknown[] }> = [];
    const client = {
      query: async (text: string, values?: unknown[]) => {
        calls.push({ text, values });
        return text.includes("order by created_at desc") ? { rows: [row()] } : { rows: [] };
      },
      release: () => undefined,
    };
    const pool = { connect: async () => client } as unknown as Pool;

    const documents = await new PostgresEmployeeDocumentStore(pool)
      .listByEmployee(record.employeeId, record.organizationId);

    expect(documents).toEqual([record]);
    const selectCall = calls.find((call) => call.text.includes("order by created_at desc"));
    expect(selectCall?.values).toEqual([record.employeeId, record.organizationId]);
  });

  it("filters document lookup by document, employee and organization", async () => {
    const calls: Array<{ text: string; values?: unknown[] }> = [];
    const client = {
      query: async (text: string, values?: unknown[]) => {
        calls.push({ text, values });
        return text.includes("where id = $1") ? { rows: [row()] } : { rows: [] };
      },
      release: () => undefined,
    };
    const pool = { connect: async () => client } as unknown as Pool;

    const document = await new PostgresEmployeeDocumentStore(pool)
      .findById(record.id, record.employeeId, record.organizationId);

    expect(document).toEqual(record);
    const selectCall = calls.find((call) => call.text.includes("where id = $1"));
    expect(selectCall?.values).toEqual([record.id, record.employeeId, record.organizationId]);
  });
});
