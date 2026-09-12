export type ComplianceTaskStatus = "todo" | "doing" | "done" | "cancelled";
export type ComplianceTaskSeverity = "info" | "warning" | "critical";

export interface ComplianceTaskRecord {
  id: string;
  organizationId: string;
  employeeId: string | null;
  assessmentId: string | null;
  /**
   * Stable provenance key for generated tasks.
   * Manual tasks use null. Generated tasks use a deterministic key scoped to
   * their assessment so repeated generation remains idempotent.
   */
  sourceKey: string | null;
  title: string;
  dueAt: string | null;
  status: ComplianceTaskStatus;
  severity: ComplianceTaskSeverity;
  assignedToUserId: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CreateComplianceTaskInput {
  employeeId?: string | null;
  assessmentId?: string | null;
  title: string;
  dueAt?: string | null;
  severity?: ComplianceTaskSeverity;
}

export interface ComplianceTaskListFilter {
  employeeId?: string;
  status?: ComplianceTaskStatus;
}
