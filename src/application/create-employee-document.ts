import { randomUUID } from "node:crypto";
import { assertPermission, type ActorContext } from "@/application/authorization";
import type { CreateEmployeeDocumentInput, EmployeeDocumentRecord } from "@/domain/employee/document-record";
import { validateCreateEmployeeDocumentInput } from "@/domain/employee/document-validation";
import type { EmployeeDocumentStore } from "@/infrastructure/repositories/employee-document-store";
import type { EmployeeStore } from "@/infrastructure/repositories/employee-store";
import { EmployeeForDocumentNotFoundError } from "./employee-document-errors";

export async function createEmployeeDocument(
  employeeId: string,
  input: CreateEmployeeDocumentInput,
  documentStore: EmployeeDocumentStore,
  employeeStore: EmployeeStore,
  actor: ActorContext,
  now = new Date(),
): Promise<EmployeeDocumentRecord> {
  assertPermission(actor, "document:write");
  const employee = await employeeStore.findById(employeeId, actor.organizationId);
  if (!employee) throw new EmployeeForDocumentNotFoundError(employeeId);

  const validated = validateCreateEmployeeDocumentInput(input);
  const record: EmployeeDocumentRecord = {
    id: randomUUID(),
    organizationId: actor.organizationId,
    employeeId,
    documentType: validated.documentType,
    label: validated.label,
    storageKey: validated.storageKey ?? null,
    issuedAt: validated.issuedAt ?? null,
    validUntil: validated.validUntil ?? null,
    isCurrent: validated.isCurrent ?? false,
    extractedFields: {},
    extractionConfidence: null,
    confirmedByUserId: null,
    confirmedAt: null,
    createdAt: now.toISOString(),
  };

  await documentStore.create(record);
  return record;
}
