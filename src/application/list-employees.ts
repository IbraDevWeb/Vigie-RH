import { assertPermission, type ActorContext } from "@/application/authorization";
import type { EmployeeRecord } from "@/domain/employee/record";
import type { EmployeeStore } from "@/infrastructure/repositories/employee-store";

export async function listEmployees(
  store: EmployeeStore,
  actor: ActorContext,
): Promise<EmployeeRecord[]> {
  assertPermission(actor, "employee:read");
  return store.listByOrganization(actor.organizationId);
}
