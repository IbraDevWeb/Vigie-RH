import { assertPermission, type ActorContext } from "@/application/authorization";
import type { EmployeeRecord } from "@/domain/employee/record";
import type { EmployeeStore } from "@/infrastructure/repositories/employee-store";

export async function getEmployee(
  employeeId: string,
  store: EmployeeStore,
  actor: ActorContext,
): Promise<EmployeeRecord | null> {
  assertPermission(actor, "employee:read");
  return store.findById(employeeId, actor.organizationId);
}
