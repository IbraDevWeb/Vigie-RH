import type { EmployeeDocumentRecord } from "@/domain/employee/document-record";
import type { EmployeeDocumentStore } from "./employee-document-store";

export class InMemoryEmployeeDocumentStore implements EmployeeDocumentStore {
  private readonly records: EmployeeDocumentRecord[] = [];

  async create(record: EmployeeDocumentRecord): Promise<void> {
    this.records.push(structuredClone(record));
  }

  async listByEmployee(employeeId: string, organizationId: string): Promise<EmployeeDocumentRecord[]> {
    return this.records
      .filter((record) => record.employeeId === employeeId && record.organizationId === organizationId)
      .map((record) => structuredClone(record));
  }

  async findById(id: string, employeeId: string, organizationId: string): Promise<EmployeeDocumentRecord | null> {
    const record = this.records.find(
      (candidate) => candidate.id === id
        && candidate.employeeId === employeeId
        && candidate.organizationId === organizationId,
    );
    return record ? structuredClone(record) : null;
  }
}
