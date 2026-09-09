import { getPostgresPool } from "@/infrastructure/database/postgres";
import { PersistenceConfigurationError } from "./persistence-configuration-error";
import type { EmployeeDocumentStore } from "./employee-document-store";
import { InMemoryEmployeeDocumentStore } from "./in-memory-employee-document-store";
import { PostgresEmployeeDocumentStore } from "./postgres-employee-document-store";

let store: EmployeeDocumentStore | null = null;

export function getEmployeeDocumentStore(): EmployeeDocumentStore {
  if (store) return store;

  if (process.env.DATABASE_URL) {
    store = new PostgresEmployeeDocumentStore(getPostgresPool());
    return store;
  }

  if (process.env.NODE_ENV === "production") {
    throw new PersistenceConfigurationError(
      "DATABASE_URL est requis en environnement serveur de production. Le fallback documents en mémoire est désactivé.",
    );
  }

  store = new InMemoryEmployeeDocumentStore();
  return store;
}
