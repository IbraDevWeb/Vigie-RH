import { NextResponse } from "next/server";
import { createEmployeeDocument } from "@/application/create-employee-document";
import { listEmployeeDocuments } from "@/application/list-employee-documents";
import { EmployeeForDocumentNotFoundError } from "@/application/employee-document-errors";
import { AuthorizationError } from "@/application/authorization";
import { EmployeeDocumentValidationError } from "@/domain/employee/document-validation";
import { getEmployeeDocumentStore } from "@/infrastructure/repositories/employee-document-store-provider";
import { getEmployeeStore } from "@/infrastructure/repositories/employee-store-provider";
import { PersistenceConfigurationError } from "@/infrastructure/repositories/persistence-configuration-error";
import { AuthenticationConfigurationError, resolveServerActor } from "@/infrastructure/security/request-actor";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const actor = resolveServerActor();
    const documents = await listEmployeeDocuments(
      id,
      getEmployeeDocumentStore(),
      getEmployeeStore(),
      actor,
    );
    return NextResponse.json({ documents });
  } catch (error) {
    return handleDocumentApiError(error, "Erreur interne lors de la lecture des documents.");
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
    const document = await createEmployeeDocument(
      id,
      body,
      getEmployeeDocumentStore(),
      getEmployeeStore(),
      actor,
    );
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return handleDocumentApiError(error, "Erreur interne lors de la création du document.");
  }
}

function handleDocumentApiError(error: unknown, fallback: string) {
  if (error instanceof EmployeeDocumentValidationError) {
    return NextResponse.json({ error: error.message, issues: error.issues }, { status: 400 });
  }
  if (error instanceof EmployeeForDocumentNotFoundError) {
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
