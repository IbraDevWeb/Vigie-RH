import { NextResponse } from "next/server";
import { getForeignWorkerAssessment } from "@/application/get-foreign-worker-assessment";
import { AuthorizationError } from "@/application/authorization";
import { getAssessmentRepository, PersistenceConfigurationError } from "@/infrastructure/repositories/assessment-repository-provider";
import { AuthenticationConfigurationError, resolveServerActor } from "@/infrastructure/security/request-actor";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const actor = resolveServerActor();
    const repository = getAssessmentRepository();
    const assessment = await getForeignWorkerAssessment(id, repository, actor);

    if (!assessment) {
      return NextResponse.json({ error: "Assessment introuvable." }, { status: 404 });
    }

    return NextResponse.json(assessment);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Action non autorisée pour ce rôle." }, { status: 403 });
    }

    if (error instanceof AuthenticationConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof PersistenceConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    return NextResponse.json({ error: "Erreur interne lors de la lecture de l'assessment." }, { status: 500 });
  }
}
