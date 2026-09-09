import { NextResponse } from "next/server";
import { createForeignWorkerAssessment } from "@/application/create-foreign-worker-assessment";
import { ValidationError } from "@/domain/legal/validation";
import { assessmentRepository } from "@/infrastructure/repositories/in-memory-assessment-repository";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const assessment = await createForeignWorkerAssessment(body, assessmentRepository);
    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message, issues: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: "Erreur interne lors de l'analyse." }, { status: 500 });
  }
}
