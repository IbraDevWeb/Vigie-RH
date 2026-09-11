export interface EmployeeDocumentRecord {
  id: string;
  organizationId: string;
  employeeId: string;
  documentType: string;
  label: string;
  storageKey: string | null;
  issuedAt: string | null;
  validUntil: string | null;
  isCurrent: boolean;
  extractedFields: Record<string, unknown>;
  extractionConfidence: number | null;
  confirmedByUserId: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

export interface CreateEmployeeDocumentInput {
  documentType: string;
  label: string;
  storageKey?: string | null;
  issuedAt?: string | null;
  validUntil?: string | null;
  isCurrent?: boolean;
}
