import type { Pool } from "pg";
import type { EmployeeDocumentRecord } from "@/domain/employee/document-record";
import { withPostgresTenant } from "@/infrastructure/database/tenant-transaction";
import type { EmployeeDocumentStore } from "./employee-document-store";

interface EmployeeDocumentRow {
  id: string;
  organization_id: string;
  employee_id: string;
  document_type: string;
  label: string;
  storage_key: string | null;
  issued_at: string | Date | null;
  valid_until: string | Date | null;
  extracted_fields: Record<string, unknown>;
  extraction_confidence: string | number | null;
  confirmed_by_user_id: string | null;
  confirmed_at: string | Date | null;
  created_at: string | Date;
}

function toIsoDate(value: string | Date | null): string | null {
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function toIsoDateTime(value: string | Date | null): string | null {
  if (value === null) return null;
  return new Date(value).toISOString();
}

function mapRow(row: EmployeeDocumentRow): EmployeeDocumentRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    employeeId: row.employee_id,
    documentType: row.document_type,
    label: row.label,
    storageKey: row.storage_key,
    issuedAt: toIsoDate(row.issued_at),
    validUntil: toIsoDate(row.valid_until),
    extractedFields: row.extracted_fields ?? {},
    extractionConfidence: row.extraction_confidence === null ? null : Number(row.extraction_confidence),
    confirmedByUserId: row.confirmed_by_user_id,
    confirmedAt: toIsoDateTime(row.confirmed_at),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export class PostgresEmployeeDocumentStore implements EmployeeDocumentStore {
  constructor(private readonly pool: Pool) {}

  async create(record: EmployeeDocumentRecord): Promise<void> {
    await withPostgresTenant(this.pool, record.organizationId, async (client) => {
      await client.query(
        `insert into employee_documents (
          id,
          organization_id,
          employee_id,
          document_type,
          label,
          storage_key,
          issued_at,
          valid_until,
          extracted_fields,
          extraction_confidence,
          confirmed_by_user_id,
          confirmed_at,
          created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13)`,
        [
          record.id,
          record.organizationId,
          record.employeeId,
          record.documentType,
          record.label,
          record.storageKey,
          record.issuedAt,
          record.validUntil,
          JSON.stringify(record.extractedFields),
          record.extractionConfidence,
          record.confirmedByUserId,
          record.confirmedAt,
          record.createdAt,
        ],
      );
    });
  }

  async listByEmployee(employeeId: string, organizationId: string): Promise<EmployeeDocumentRecord[]> {
    return withPostgresTenant(this.pool, organizationId, async (client) => {
      const query = await client.query<EmployeeDocumentRow>(
        `select id, organization_id, employee_id, document_type, label, storage_key,
                issued_at, valid_until, extracted_fields, extraction_confidence,
                confirmed_by_user_id, confirmed_at, created_at
         from employee_documents
         where employee_id = $1 and organization_id = $2
         order by created_at desc`,
        [employeeId, organizationId],
      );
      return query.rows.map(mapRow);
    });
  }

  async findById(id: string, employeeId: string, organizationId: string): Promise<EmployeeDocumentRecord | null> {
    return withPostgresTenant(this.pool, organizationId, async (client) => {
      const query = await client.query<EmployeeDocumentRow>(
        `select id, organization_id, employee_id, document_type, label, storage_key,
                issued_at, valid_until, extracted_fields, extraction_confidence,
                confirmed_by_user_id, confirmed_at, created_at
         from employee_documents
         where id = $1 and employee_id = $2 and organization_id = $3
         limit 1`,
        [id, employeeId, organizationId],
      );
      const row = query.rows[0];
      return row ? mapRow(row) : null;
    });
  }
}
