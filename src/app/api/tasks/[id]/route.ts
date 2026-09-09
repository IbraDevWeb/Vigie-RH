import { NextResponse } from "next/server";
import { AuthorizationError } from "@/application/authorization";
import { getComplianceTask } from "@/application/get-compliance-task";
import { updateComplianceTaskStatus } from "@/application/update-compliance-task-status";
import { ComplianceTaskValidationError } from "@/domain/compliance/task-validation";
import { getComplianceTaskStore } from "@/infrastructure/repositories/compliance-task-store-provider";
import { PersistenceConfigurationError } from "@/infrastructure/repositories/persistence-configuration-error";
import {
  AuthenticationConfigurationError,
  resolveServerActor,
} from "@/infrastructure/security/request-actor";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const actor = resolveServerActor();
    const task = await getComplianceTask(id, getComplianceTaskStore(), actor);
    if (!task) return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
    return NextResponse.json({ task });
  } catch (error) {
    return handleComplianceTaskApiError(error, "Erreur interne lors de la lecture de la tâche.");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const actor = resolveServerActor();
    const task = await updateComplianceTaskStatus(id, body, getComplianceTaskStore(), actor);
    if (!task) return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
    return NextResponse.json({ task });
  } catch (error) {
    return handleComplianceTaskApiError(error, "Erreur interne lors de la mise à jour de la tâche.");
  }
}

function handleComplianceTaskApiError(error: unknown, fallback: string) {
  if (error instanceof ComplianceTaskValidationError) {
    return NextResponse.json({ error: error.message, issues: error.issues }, { status: 400 });
  }
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: "Action non autorisée pour ce rôle." }, { status: 403 });
  }
  if (error instanceof AuthenticationConfigurationError || error instanceof PersistenceConfigurationError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}
