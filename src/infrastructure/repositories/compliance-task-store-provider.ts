import { getPostgresPool } from "@/infrastructure/database/postgres";
import { PersistenceConfigurationError } from "./persistence-configuration-error";
import type { ComplianceTaskStore } from "./compliance-task-store";
import { InMemoryComplianceTaskStore } from "./in-memory-compliance-task-store";
import { PostgresComplianceTaskStore } from "./postgres-compliance-task-store";

let store: ComplianceTaskStore | null = null;

export function getComplianceTaskStore(): ComplianceTaskStore {
  if (store) return store;

  if (process.env.DATABASE_URL) {
    store = new PostgresComplianceTaskStore(getPostgresPool());
    return store;
  }

  if (process.env.NODE_ENV === "production") {
    throw new PersistenceConfigurationError(
      "DATABASE_URL est requis en environnement serveur de production. Le fallback tâches en mémoire est désactivé.",
    );
  }

  store = new InMemoryComplianceTaskStore();
  return store;
}
