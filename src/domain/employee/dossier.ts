import type { ComplianceTaskRecord } from "@/domain/compliance/task-record";
import type { EmployeeDocumentRecord } from "./document-record";
import type { EmployeeRecord } from "./record";
import type { AssessmentRecord } from "@/infrastructure/repositories/assessment-repository";

export interface EmployeeDossier {
  employee: EmployeeRecord;
  currentDocuments: EmployeeDocumentRecord[];
  historicalDocuments: EmployeeDocumentRecord[];
  assessments: AssessmentRecord[];
  latestAssessment: AssessmentRecord | null;
  openTasks: ComplianceTaskRecord[];
  closedTasks: ComplianceTaskRecord[];
  nextDocumentExpiry: string | null;
  nextTaskDueAt: string | null;
  generatedAt: string;
}
