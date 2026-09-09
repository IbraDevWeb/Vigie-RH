import type { Pool } from "pg";
import type {
  ComplianceTaskListFilter,
  ComplianceTaskRecord,
  ComplianceTaskSeverity,
  ComplianceTaskStatus,
} from "@/domain/compliance/task-record";
import { withPostgresTenant } from "@/infrastructure/database/tenant-transaction";
import type { ComplianceTaskStore } from "./compliance-task-store";

interface ComplianceTaskRow {
  id: string;
  organization_id: string;
  employee_id: string | null;
  assessment_id: string | null;
  title: string;
  due_at: string | Date | null;
  status: ComplianceTaskStatus;
  severity: ComplianceTaskSeverity;
  assigned_to: string | null;
  created_at: string | Date;
  completed_at: string | Date | null;
}

function toIsoDateTime(value: string | Date | null): string | null {
  if (value === null) return null;
  return new Date(value).toISOString();
}

function mapRow(row: ComplianceTaskRow): ComplianceTaskRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    employeeId: row.employee_id,
    assessmentId: row.assessment_id,
    title: row.title,
    dueAt: toIsoDateTime(row.due_at),
    status: row.status,
    severity: row.severity,
    assignedToUserId: row.assigned_to,
    createdAt: new Date(row.created_at).toISOString(),
    completedAt: toIsoDateTime(row.completed_at),
  };
}

export class PostgresComplianceTaskStore implements ComplianceTaskStore {
  constructor(private readonly pool: Pool) {}

  async create(record: ComplianceTaskRecord): Promise<void> {
    await withPostgresTenant(this.pool, record.organizationId, async (client) => {
      await client.query(
        `insert into compliance_tasks (
          id, organization_id, employee_id, assessment_id, title, due_at,
          status, severity, assigned_to, created_at, completed_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          record.id,
          record.organizationId,
          record.employeeId,
          record.assessmentId,
          record.title,
          record.dueAt,
          record.status,
          record.severity,
          record.assignedToUserId,
          record.createdAt,
          record.completedAt,
        ],
      );
    });
  }

  async listByOrganization(
    organizationId: string,
    filter: ComplianceTaskListFilter = {},
  ): Promise<ComplianceTaskRecord[]> {
    return withPostgresTenant(this.pool, organizationId, async (client) => {
      const conditions = ["organization_id = $1"];
      const values: unknown[] = [organizationId];

      if (filter.employeeId) {
        values.push(filter.employeeId);
        conditions.push(`employee_id = $${values.length}`);
      }
      if (filter.status) {
        values.push(filter.status);
        conditions.push(`status = $${values.length}`);
      }

      const query = await client.query<ComplianceTaskRow>(
        `select id, organization_id, employee_id, assessment_id, title, due_at,
                status, severity, assigned_to, created_at, completed_at
         from compliance_tasks
         where ${conditions.join(" and ")}
         order by due_at asc nulls last, created_at desc`,
        values,
      );
      return query.rows.map(mapRow);
    });
  }

  async findById(id: string, organizationId: string): Promise<ComplianceTaskRecord | null> {
    return withPostgresTenant(this.pool, organizationId, async (client) => {
      const query = await client.query<ComplianceTaskRow>(
        `select id, organization_id, employee_id, assessment_id, title, due_at,
                status, severity, assigned_to, created_at, completed_at
         from compliance_tasks
         where id = $1 and organization_id = $2
         limit 1`,
        [id, organizationId],
      );
      const row = query.rows[0];
      return row ? mapRow(row) : null;
    });
  }

  async updateStatus(
    id: string,
    organizationId: string,
    status: ComplianceTaskStatus,
    completedAt: string | null,
  ): Promise<ComplianceTaskRecord | null> {
    return withPostgresTenant(this.pool, organizationId, async (client) => {
      const query = await client.query<ComplianceTaskRow>(
        `update compliance_tasks
         set status = $1, completed_at = $2
         where id = $3 and organization_id = $4
         returning id, organization_id, employee_id, assessment_id, title, due_at,
                   status, severity, assigned_to, created_at, completed_at`,
        [status, completedAt, id, organizationId],
      );
      const row = query.rows[0];
      return row ? mapRow(row) : null;
    });
  }
}
