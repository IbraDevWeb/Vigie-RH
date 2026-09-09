import type { Pool } from "pg";
import { withPostgresTenant } from "@/infrastructure/database/tenant-transaction";
import type { AssessmentRecord, AssessmentRepository } from "./assessment-repository";

interface AssessmentRow {
  id: string;
  organization_id: string;
  employee_id: string | null;
  created_by: string;
  input_snapshot: AssessmentRecord["inputSnapshot"];
  result_snapshot: AssessmentRecord["resultSnapshot"];
  rule_versions: AssessmentRecord["ruleVersions"];
  created_at: Date | string;
}

function mapRow(row: AssessmentRow): AssessmentRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    employeeId: row.employee_id,
    createdByUserId: row.created_by,
    inputSnapshot: row.input_snapshot,
    resultSnapshot: row.result_snapshot,
    ruleVersions: row.rule_versions,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

const selectColumns = "id, organization_id, employee_id, created_by, input_snapshot, result_snapshot, rule_versions, created_at";

export class PostgresAssessmentRepository implements AssessmentRepository {
  constructor(private readonly pool: Pool) {}

  async save(record: AssessmentRecord): Promise<void> {
    await withPostgresTenant(this.pool, record.organizationId, async (client) => {
      await client.query(
        `insert into assessments (
          id,
          organization_id,
          employee_id,
          action_type,
          input_snapshot,
          result_snapshot,
          rule_versions,
          created_by,
          created_at
        ) values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9)`,
        [
          record.id,
          record.organizationId,
          record.employeeId,
          record.inputSnapshot.action,
          JSON.stringify(record.inputSnapshot),
          JSON.stringify(record.resultSnapshot),
          JSON.stringify(record.ruleVersions),
          record.createdByUserId,
          record.createdAt,
        ],
      );
    });
  }

  async findById(id: string, organizationId: string): Promise<AssessmentRecord | null> {
    return withPostgresTenant(this.pool, organizationId, async (client) => {
      const query = await client.query<AssessmentRow>(
        `select ${selectColumns}
         from assessments
         where id = $1 and organization_id = $2
         limit 1`,
        [id, organizationId],
      );

      const row = query.rows[0];
      return row ? mapRow(row) : null;
    });
  }

  async listByOrganization(organizationId: string): Promise<AssessmentRecord[]> {
    return withPostgresTenant(this.pool, organizationId, async (client) => {
      const query = await client.query<AssessmentRow>(
        `select ${selectColumns}
         from assessments
         where organization_id = $1
         order by created_at desc`,
        [organizationId],
      );
      return query.rows.map(mapRow);
    });
  }

  async listByEmployee(employeeId: string, organizationId: string): Promise<AssessmentRecord[]> {
    return withPostgresTenant(this.pool, organizationId, async (client) => {
      const query = await client.query<AssessmentRow>(
        `select ${selectColumns}
         from assessments
         where employee_id = $1 and organization_id = $2
         order by created_at desc`,
        [employeeId, organizationId],
      );
      return query.rows.map(mapRow);
    });
  }
}
