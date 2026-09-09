import { NextResponse } from "next/server";
import { assessForeignWorkerCase } from "@/application/assess-foreign-worker-case";
import { ValidationError } from "@/domain/legal/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = assessForeignWorkerCase(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json({ error: error.message, issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Erreur interne lors de l'analyse." }, { status: 500 });
  }
}
