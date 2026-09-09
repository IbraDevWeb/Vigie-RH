import { assertPermission, type ActorContext } from "@/application/authorization";
import type { ComplianceTaskListFilter, ComplianceTaskRecord } from "@/domain/compliance/task-record";
import type { ComplianceTaskStore } from "@/infrastructure/repositories/compliance-task-store";

export async function listComplianceTasks(
  store: ComplianceTaskStore,
  actor: ActorContext,
  filter: ComplianceTaskListFilter = {},
): Promise<ComplianceTaskRecord[]> {
  assertPermission(actor, "task:read");
  return store.listByOrganization(actor.organizationId, filter);
}
