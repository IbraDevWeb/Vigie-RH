import { NextResponse } from "next/server";
import { AuthorizationError } from "@/application/authorization";
import {
  AssessmentTaskGenerationRequiresEmployeeError,
  ComplianceTaskAssessmentNotFoundError,
} from "@/application/compliance-task-errors";
import { generateAssessmentComplianceTasks } from "@/application/generate-assessment-compliance-tasks";
import { getAssessmentRepository } from "@/infrastructure/repositories/assessment-repository-provider";
import { getComplianceTaskStore } from "@/infrastructure/repositories/compliance-task-store-provider";
import { PersistenceConfigurationError } from "@/infrastructure/repositories/persistence-configuration-error";
import { AuthenticationConfigurationError, resolveServerActor } from "@/infrastructure/security/request-actor";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const actor = resolveServerActor();
    const result = await generateAssessmentComplianceTasks(
      id,
      getAssessmentRepository(),
      getComplianceTaskStore(),
      actor,
    );

    return NextResponse.json(result, { status: result.created.length > 0 ? 201 : 200 });
  } catch (error) {
    if (error instanceof ComplianceTaskAssessmentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof AssessmentTaskGenerationRequiresEmployeeError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
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

    return NextResponse.json({ error: "Erreur interne lors de la génération des tâches." }, { status: 500 });
  }
}
