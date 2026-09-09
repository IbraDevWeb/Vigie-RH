import { randomUUID } from "node:crypto";
import { assertPermission, type ActorContext } from "@/application/authorization";
import type { CreateEmployeeInput, EmployeeRecord } from "@/domain/employee/record";
import { validateCreateEmployeeInput } from "@/domain/employee/validation";
import type { EmployeeStore } from "@/infrastructure/repositories/employee-store";

export async function createEmployee(
  input: CreateEmployeeInput,
  store: EmployeeStore,
  actor: ActorContext,
  now = new Date(),
): Promise<EmployeeRecord> {
  assertPermission(actor, "employee:write");
  const validated = validateCreateEmployeeInput(input);
  const timestamp = now.toISOString();

  const record: EmployeeRecord = {
    id: randomUUID(),
    organizationId: actor.organizationId,
    firstName: validated.firstName,
    lastName: validated.lastName,
    nationalityCode: validated.nationalityCode ?? null,
    roleTitle: validated.roleTitle ?? null,
    workSite: validated.workSite ?? null,
    contractType: validated.contractType ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await store.create(record);
  return record;
}
