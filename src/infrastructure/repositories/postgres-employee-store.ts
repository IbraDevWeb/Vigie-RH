import type { Pool } from "pg";
import type { EmployeeRecord } from "@/domain/employee/record";
import { withPostgresTenant } from "@/infrastructure/database/tenant-transaction";
import type { EmployeeStore } from "./employee-store";

interface EmployeeRow {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  nationality_code: string | null;
  role_title: string | null;
  work_site: string | null;
  contract_type: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

function mapEmployee(row: EmployeeRow): EmployeeRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    firstName: row.first_name,
    lastName: row.last_name,
    nationalityCode: row.nationality_code?.trim() ?? null,
    roleTitle: row.role_title,
    workSite: row.work_site,
    contractType: row.contract_type,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export class PostgresEmployeeStore implements EmployeeStore {
  constructor(private readonly pool: Pool) {}

  async create(record: EmployeeRecord): Promise<void> {
    await withPostgresTenant(this.pool, record.organizationId, async (client) => {
      await client.query(
        `insert into employees (
          id,
          organization_id,
          first_name,
          last_name,
          nationality_code,
          role_title,
          work_site,
          contract_type,
          created_at,
          updated_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          record.id,
          record.organizationId,
          record.firstName,
          record.lastName,
          record.nationalityCode,
          record.roleTitle,
          record.workSite,
          record.contractType,
          record.createdAt,
          record.updatedAt,
        ],
      );
    });
  }

  async listByOrganization(organizationId: string): Promise<EmployeeRecord[]> {
    return withPostgresTenant(this.pool, organizationId, async (client) => {
      const query = await client.query<EmployeeRow>(
        `select id, organization_id, first_name, last_name, nationality_code,
                role_title, work_site, contract_type, created_at, updated_at
         from employees
         where organization_id = $1
         order by last_name asc, first_name asc`,
        [organizationId],
      );
      return query.rows.map(mapEmployee);
    });
  }

  async findById(id: string, organizationId: string): Promise<EmployeeRecord | null> {
    return withPostgresTenant(this.pool, organizationId, async (client) => {
      const query = await client.query<EmployeeRow>(
        `select id, organization_id, first_name, last_name, nationality_code,
                role_title, work_site, contract_type, created_at, updated_at
         from employees
         where id = $1 and organization_id = $2
         limit 1`,
        [id, organizationId],
      );
      const row = query.rows[0];
      return row ? mapEmployee(row) : null;
    });
  }
}
