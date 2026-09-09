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
}

export const assessmentRepository = new InMemoryAssessmentRepository();
