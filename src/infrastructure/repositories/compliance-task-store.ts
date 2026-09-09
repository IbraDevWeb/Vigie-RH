import type { ComplianceTaskListFilter, ComplianceTaskRecord, ComplianceTaskStatus } from "@/domain/compliance/task-record";

export interface ComplianceTaskStore {
  create(record: ComplianceTaskRecord): Promise<void>;
  listByOrganization(organizationId: string, filter?: ComplianceTaskListFilter): Promise<ComplianceTaskRecord[]>;
  findById(id: string, organizationId: string): Promise<ComplianceTaskRecord | null>;
  updateStatus(
    id: string,
    organizationId: string,
    status: ComplianceTaskStatus,
    completedAt: string | null,
  ): Promise<ComplianceTaskRecord | null>;
}
