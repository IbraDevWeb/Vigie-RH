import type { AssessmentRepository } from "./assessment-repository";
import { InMemoryAssessmentRepository } from "./in-memory-assessment-repository";
import { PostgresAssessmentRepository } from "./postgres-assessment-repository";
import { getPostgresPool } from "@/infrastructure/database/postgres";

let repository: AssessmentRepository | null = null;

export class PersistenceConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersistenceConfigurationError";
  }
}

export function getAssessmentRepository(): AssessmentRepository {
  if (repository) return repository;

  if (process.env.DATABASE_URL) {
    repository = new PostgresAssessmentRepository(getPostgresPool());
    return repository;
  }

  if (process.env.NODE_ENV === "production") {
    throw new PersistenceConfigurationError(
      "DATABASE_URL est requis en environnement serveur de production. Le fallback mémoire est désactivé.",
    );
  }

  repository = new InMemoryAssessmentRepository();
  return repository;
}
