import { NextResponse } from "next/server";
import { AuthorizationError } from "@/application/authorization";
import { getComplianceOverview } from "@/application/get-compliance-overview";
import { getAssessmentRepository } from "@/infrastructure/repositories/assessment-repository-provider";
import { getComplianceTaskStore } from "@/infrastructure/repositories/compliance-task-store-provider";
import { getEmployeeDocumentStore } from "@/infrastructure/repositories/employee-document-store-provider";
import { getEmployeeStore } from "@/infrastructure/repositories/employee-store-provider";
import { PersistenceConfigurationError } from "@/infrastructure/repositories/persistence-configuration-error";
import {
  AuthenticationConfigurationError,
  resolveServerActor,
} from "@/infrastructure/security/request-actor";

export async function GET() {
  try {
    const actor = resolveServerActor();
    const overview = await getComplianceOverview(
      getEmployeeStore(),
      getEmployeeDocumentStore(),
      getAssessmentRepository(),
      getComplianceTaskStore(),
      actor,
    );
    return NextResponse.json({ overview });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Action non autorisée pour ce rôle." }, { status: 403 });
    }
    if (error instanceof AuthenticationConfigurationError || error instanceof PersistenceConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Erreur interne lors de la construction de la vue de conformité." }, { status: 500 });
  }
}
