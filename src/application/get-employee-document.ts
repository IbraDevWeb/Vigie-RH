import { assertPermission, type ActorContext } from "@/application/authorization";
import type { EmployeeDocumentRecord } from "@/domain/employee/document-record";
import type { EmployeeDocumentStore } from "@/infrastructure/repositories/employee-document-store";

export async function getEmployeeDocument(
  employeeId: string,
  documentId: string,
  store: EmployeeDocumentStore,
  actor: ActorContext,
): Promise<EmployeeDocumentRecord | null> {
  assertPermission(actor, "document:read");
  return store.findById(documentId, employeeId, actor.organizationId);
}
