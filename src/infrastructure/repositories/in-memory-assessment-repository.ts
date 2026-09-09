import type { AssessmentRecord, AssessmentRepository } from "./assessment-repository";

export class InMemoryAssessmentRepository implements AssessmentRepository {
  private readonly records = new Map<string, AssessmentRecord>();

  async save(record: AssessmentRecord): Promise<void> {
    this.records.set(record.id, structuredClone(record));
  }

  async findById(id: string, organizationId: string): Promise<AssessmentRecord | null> {
    const record = this.records.get(id);
    if (!record || record.organizationId !== organizationId) return null;
    return structuredClone(record);
  }

  async listByOrganization(organizationId: string): Promise<AssessmentRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.organizationId === organizationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((record) => structuredClone(record));
  }

  async listByEmployee(employeeId: string, organizationId: string): Promise<AssessmentRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.organizationId === organizationId && record.employeeId === employeeId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((record) => structuredClone(record));
  }
}

export const assessmentRepository = new InMemoryAssessmentRepository();
