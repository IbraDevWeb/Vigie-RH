import type { EmployeeRecord } from "@/domain/employee/record";

export interface EmployeeStore {
  create(record: EmployeeRecord): Promise<void>;
  listByOrganization(organizationId: string): Promise<EmployeeRecord[]>;
  findById(id: string, organizationId: string): Promise<EmployeeRecord | null>;
}
