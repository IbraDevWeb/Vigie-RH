import { assertPermission, type ActorContext } from "@/application/authorization";
import type { ComplianceTaskRecord } from "@/domain/compliance/task-record";
import type { ComplianceTaskStore } from "@/infrastructure/repositories/compliance-task-store";

export async function getComplianceTask(
  id: string,
  store: ComplianceTaskStore,
  actor: ActorContext,
): Promise<ComplianceTaskRecord | null> {
  assertPermission(actor, "task:read");
  return store.findById(id, actor.organizationId);
}
