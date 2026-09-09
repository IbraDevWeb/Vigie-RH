import { NextResponse } from "next/server";
import { getEmployee } from "@/application/get-employee";
import { AuthorizationError } from "@/application/authorization";
import { PersistenceConfigurationError } from "@/infrastructure/repositories/assessment-repository-provider";
import { getEmployeeStore } from "@/infrastructure/repositories/employee-store-provider";
import { AuthenticationConfigurationError, resolveServerActor } from "@/infrastructure/security/request-actor";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const actor = resolveServerActor();
    const employee = await getEmployee(id, getEmployeeStore(), actor);

    if (!employee) {
      return NextResponse.json({ error: "Salarié introuvable." }, { status: 404 });
    }

    return NextResponse.json({ employee });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Action non autorisée pour ce rôle." }, { status: 403 });
    }
    if (error instanceof AuthenticationConfigurationError || error instanceof PersistenceConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Erreur interne lors de la lecture du salarié." }, { status: 500 });
  }
}
