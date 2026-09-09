import { NextResponse } from "next/server";
import { AuthorizationError } from "@/application/authorization";
import {
  ComplianceTaskAssessmentNotFoundError,
  ComplianceTaskEmployeeNotFoundError,
} from "@/application/compliance-task-errors";
import { createComplianceTask } from "@/application/create-compliance-task";
import { listComplianceTasks } from "@/application/list-compliance-tasks";
import {
  ComplianceTaskValidationError,
  validateComplianceTaskListFilter,
} from "@/domain/compliance/task-validation";
import { getAssessmentRepository } from "@/infrastructure/repositories/assessment-repository-provider";
import { getComplianceTaskStore } from "@/infrastructure/repositories/compliance-task-store-provider";
import { getEmployeeStore } from "@/infrastructure/repositories/employee-store-provider";
import { PersistenceConfigurationError } from "@/infrastructure/repositories/persistence-configuration-error";
import {
  AuthenticationConfigurationError,
  resolveServerActor,
} from "@/infrastructure/security/request-actor";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filter = validateComplianceTaskListFilter({
      employeeId: url.searchParams.get("employeeId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });
    const actor = resolveServerActor();
    const tasks = await listComplianceTasks(getComplianceTaskStore(), actor, filter);
    return NextResponse.json({ tasks });
  } catch (error) {
    return handleComplianceTaskApiError(error, "Erreur interne lors de la lecture des tâches.");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const actor = resolveServerActor();
    const task = await createComplianceTask(
      body,
      getComplianceTaskStore(),
      getEmployeeStore(),
      getAssessmentRepository(),
      actor,
    );
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return handleComplianceTaskApiError(error, "Erreur interne lors de la création de la tâche.");
  }
}

function handleComplianceTaskApiError(error: unknown, fallback: string) {
  if (error instanceof ComplianceTaskValidationError) {
    return NextResponse.json({ error: error.message, issues: error.issues }, { status: 400 });
  }
  if (
    error instanceof ComplianceTaskEmployeeNotFoundError
    || error instanceof ComplianceTaskAssessmentNotFoundError
  ) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: "Action non autorisée pour ce rôle." }, { status: 403 });
  }
  if (error instanceof AuthenticationConfigurationError || error instanceof PersistenceConfigurationError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}
