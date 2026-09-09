import { assertPermission, type ActorContext } from "@/application/authorization";
import type { EmployeeDocumentRecord } from "@/domain/employee/document-record";
import type { EmployeeDocumentStore } from "@/infrastructure/repositories/employee-document-store";
import type { EmployeeStore } from "@/infrastructure/repositories/employee-store";
import { EmployeeForDocumentNotFoundError } from "./employee-document-errors";

export async function listEmployeeDocuments(
  employeeId: string,
  documentStore: EmployeeDocumentStore,
  employeeStore: EmployeeStore,
  actor: ActorContext,
): Promise<EmployeeDocumentRecord[]> {
  assertPermission(actor, "document:read");
  const employee = await employeeStore.findById(employeeId, actor.organizationId);
  if (!employee) throw new EmployeeForDocumentNotFoundError(employeeId);
  return documentStore.listByEmployee(employeeId, actor.organizationId);
}
