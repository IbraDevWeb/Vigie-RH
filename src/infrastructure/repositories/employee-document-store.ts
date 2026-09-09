import type { EmployeeDocumentRecord } from "@/domain/employee/document-record";

export interface EmployeeDocumentStore {
  create(record: EmployeeDocumentRecord): Promise<void>;
  listByOrganization(organizationId: string): Promise<EmployeeDocumentRecord[]>;
  listByEmployee(employeeId: string, organizationId: string): Promise<EmployeeDocumentRecord[]>;
  findById(id: string, employeeId: string, organizationId: string): Promise<EmployeeDocumentRecord | null>;
}
