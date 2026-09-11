import type { AssessmentStatus } from "@/domain/legal/types";
import type { ComplianceTaskSeverity } from "./task-record";

export type OperationalAttentionLevel = "urgent" | "attention" | "no_open_signal" | "unknown";
export type OperationalPriorityKind = "task" | "document_expiry";
export type OperationalPriorityUrgency = "overdue" | "critical" | "upcoming";

export interface LatestAssessmentSummary {
  id: string;
  status: AssessmentStatus;
  statusLabel: string;
  createdAt: string;
  nextDeadline: string | null;
}

export interface EmployeeComplianceOverview {
  employeeId: string;
  firstName: string;
  lastName: string;
  roleTitle: string | null;
  workSite: string | null;
  currentDocumentCount: number;
  currentDocumentNextExpiry: string | null;
  openTaskCount: number;
  criticalOpenTaskCount: number;
  nextTaskDueAt: string | null;
  latestAssessment: LatestAssessmentSummary | null;
  attentionLevel: OperationalAttentionLevel;
}

export interface OperationalPriority {
  kind: OperationalPriorityKind;
  id: string;
  employeeId: string | null;
  employeeName: string | null;
  title: string;
  dueAt: string;
  urgency: OperationalPriorityUrgency;
  taskSeverity: ComplianceTaskSeverity | null;
}

export interface ComplianceOverviewCounts {
  employees: number;
  openTasks: number;
  criticalOpenTasks: number;
  overdueOpenTasks: number;
  expiredCurrentDocuments: number;
  currentDocumentsExpiringWithin90Days: number;
  employeesWithoutAssessment: number;
}

export interface ComplianceOverview {
  generatedAt: string;
  counts: ComplianceOverviewCounts;
  employees: EmployeeComplianceOverview[];
  priorities: OperationalPriority[];
  disclaimer: string;
}
