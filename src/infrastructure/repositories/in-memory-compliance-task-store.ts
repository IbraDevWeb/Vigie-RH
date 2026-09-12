import type {
  ComplianceTaskListFilter,
  ComplianceTaskRecord,
  ComplianceTaskStatus,
} from "@/domain/compliance/task-record";
import type { ComplianceTaskStore } from "./compliance-task-store";

export class InMemoryComplianceTaskStore implements ComplianceTaskStore {
  private readonly records: ComplianceTaskRecord[] = [];

  async create(record: ComplianceTaskRecord): Promise<void> {
    this.records.push(structuredClone(record));
  }

  async createIfAbsent(record: ComplianceTaskRecord): Promise<boolean> {
    if (!record.assessmentId || !record.sourceKey) {
      await this.create(record);
      return true;
    }

    const exists = this.records.some(
      (candidate) => candidate.organizationId === record.organizationId
        && candidate.assessmentId === record.assessmentId
        && candidate.sourceKey === record.sourceKey,
    );
    if (exists) return false;

    this.records.push(structuredClone(record));
    return true;
  }

  async listByOrganization(
    organizationId: string,
    filter: ComplianceTaskListFilter = {},
  ): Promise<ComplianceTaskRecord[]> {
    return this.records
      .filter((record) => record.organizationId === organizationId)
      .filter((record) => !filter.employeeId || record.employeeId === filter.employeeId)
      .filter((record) => !filter.status || record.status === filter.status)
      .sort((a, b) => {
        if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
        if (a.dueAt) return -1;
        if (b.dueAt) return 1;
        return b.createdAt.localeCompare(a.createdAt);
      })
      .map((record) => structuredClone(record));
  }

  async findById(id: string, organizationId: string): Promise<ComplianceTaskRecord | null> {
    const record = this.records.find(
      (candidate) => candidate.id === id && candidate.organizationId === organizationId,
    );
    return record ? structuredClone(record) : null;
  }

  async updateStatus(
    id: string,
    organizationId: string,
    status: ComplianceTaskStatus,
    completedAt: string | null,
  ): Promise<ComplianceTaskRecord | null> {
    const record = this.records.find(
      (candidate) => candidate.id === id && candidate.organizationId === organizationId,
    );
    if (!record) return null;
    record.status = status;
    record.completedAt = completedAt;
    return structuredClone(record);
  }
}
