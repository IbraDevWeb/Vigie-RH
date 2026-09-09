import { NextResponse } from "next/server";
import { AuthorizationError } from "@/application/authorization";
import { createEmployeeAssessment } from "@/application/create-employee-assessment";
import { AssessmentEmployeeNotFoundError } from "@/application/employee-assessment-errors";
import { listEmployeeAssessments } from "@/application/list-employee-assessments";
import { ValidationError } from "@/domain/legal/validation";
import { getAssessmentRepository } from "@/infrastructure/repositories/assessment-repository-provider";
import { getEmployeeStore } from "@/infrastructure/repositories/employee-store-provider";
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
    const assessments = await listEmployeeAssessments(
      id,
      getEmployeeStore(),
      getAssessmentRepository(),
      actor,
    );
    return NextResponse.json({ assessments });
  } catch (error) {
    return handleEmployeeAssessmentApiError(error, "Erreur interne lors de la lecture des analyses du salarié.");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const actor = resolveServerActor();
    const assessment = await createEmployeeAssessment(
      id,
      body,
      getEmployeeStore(),
      getAssessmentRepository(),
      actor,
    );
    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    return handleEmployeeAssessmentApiError(error, "Erreur interne lors de la création de l'analyse salarié.");
  }
}

function handleEmployeeAssessmentApiError(error: unknown, fallback: string) {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message, issues: error.issues }, { status: 400 });
  }
  if (error instanceof AssessmentEmployeeNotFoundError) {
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
