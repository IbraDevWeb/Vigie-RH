import { NextResponse } from "next/server";
import { createEmployee } from "@/application/create-employee";
import { listEmployees } from "@/application/list-employees";
import { AuthorizationError } from "@/application/authorization";
import { EmployeeValidationError } from "@/domain/employee/validation";
import { PersistenceConfigurationError } from "@/infrastructure/repositories/assessment-repository-provider";
import { getEmployeeStore } from "@/infrastructure/repositories/employee-store-provider";
import { AuthenticationConfigurationError, resolveServerActor } from "@/infrastructure/security/request-actor";

export async function GET() {
  try {
    const actor = resolveServerActor();
    const employees = await listEmployees(getEmployeeStore(), actor);
    return NextResponse.json({ employees });
  } catch (error) {
    return handleEmployeeApiError(error, "Erreur interne lors de la lecture des salariés.");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const actor = resolveServerActor();
    const employee = await createEmployee(body, getEmployeeStore(), actor);
    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    return handleEmployeeApiError(error, "Erreur interne lors de la création du salarié.");
  }
}

function handleEmployeeApiError(error: unknown, fallback: string) {
  if (error instanceof EmployeeValidationError) {
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
