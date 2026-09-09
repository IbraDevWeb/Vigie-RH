import { NextResponse } from "next/server";
import { createForeignWorkerAssessment } from "@/application/create-foreign-worker-assessment";
import { AuthorizationError } from "@/application/authorization";
import { ValidationError } from "@/domain/legal/validation";
import { getAssessmentRepository } from "@/infrastructure/repositories/assessment-repository-provider";
import { PersistenceConfigurationError } from "@/infrastructure/repositories/persistence-configuration-error";
import { AuthenticationConfigurationError, resolveServerActor } from "@/infrastructure/security/request-actor";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const actor = resolveServerActor();
    const repository = getAssessmentRepository();
    const assessment = await createForeignWorkerAssessment(body, repository, actor);
    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message, issues: error.issues }, { status: 400 });
    }

    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Action non autorisée pour ce rôle." }, { status: 403 });
    }

    if (error instanceof AuthenticationConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof PersistenceConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    return NextResponse.json({ error: "Erreur interne lors de l'analyse." }, { status: 500 });
  }
}
