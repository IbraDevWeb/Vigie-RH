import type { EmployeeRecord } from "@/domain/employee/record";
import type { EmployeeStore } from "./employee-store";

export class InMemoryEmployeeStore implements EmployeeStore {
  private readonly records = new Map<string, EmployeeRecord>();

  async create(record: EmployeeRecord): Promise<void> {
    this.records.set(record.id, structuredClone(record));
  }

  async listByOrganization(organizationId: string): Promise<EmployeeRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.organizationId === organizationId)
      .map((record) => structuredClone(record))
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  }

  async findById(id: string, organizationId: string): Promise<EmployeeRecord | null> {
    const record = this.records.get(id);
    if (!record || record.organizationId !== organizationId) return null;
    return structuredClone(record);
  }
}
