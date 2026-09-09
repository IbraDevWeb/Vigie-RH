import { NextResponse } from "next/server";
import { getEmployeeDocument } from "@/application/get-employee-document";
import { AuthorizationError } from "@/application/authorization";
import { getEmployeeDocumentStore } from "@/infrastructure/repositories/employee-document-store-provider";
import { PersistenceConfigurationError } from "@/infrastructure/repositories/persistence-configuration-error";
import { AuthenticationConfigurationError, resolveServerActor } from "@/infrastructure/security/request-actor";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; documentId: string }> },
) {
  try {
    const { id, documentId } = await context.params;
    const actor = resolveServerActor();
    const document = await getEmployeeDocument(
      id,
      documentId,
      getEmployeeDocumentStore(),
      actor,
    );

    if (!document) {
      return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Action non autorisée pour ce rôle." }, { status: 403 });
    }
    if (error instanceof AuthenticationConfigurationError || error instanceof PersistenceConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Erreur interne lors de la lecture du document." }, { status: 500 });
  }
}
