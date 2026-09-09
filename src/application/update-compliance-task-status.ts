import { assertPermission, type ActorContext } from "@/application/authorization";
import type { ComplianceTaskRecord } from "@/domain/compliance/task-record";
import { validateComplianceTaskStatusInput } from "@/domain/compliance/task-validation";
import type { ComplianceTaskStore } from "@/infrastructure/repositories/compliance-task-store";

export async function updateComplianceTaskStatus(
  id: string,
  input: unknown,
  store: ComplianceTaskStore,
  actor: ActorContext,
  now = new Date(),
): Promise<ComplianceTaskRecord | null> {
  assertPermission(actor, "task:write");
  const status = validateComplianceTaskStatusInput(input);
  const completedAt = status === "done" ? now.toISOString() : null;
  return store.updateStatus(id, actor.organizationId, status, completedAt);
}
