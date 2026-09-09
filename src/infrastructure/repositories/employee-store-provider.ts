import type { EmployeeStore } from "./employee-store";
import { InMemoryEmployeeStore } from "./in-memory-employee-store";
import { PostgresEmployeeStore } from "./postgres-employee-store";
import { getPostgresPool } from "@/infrastructure/database/postgres";
import { PersistenceConfigurationError } from "./assessment-repository-provider";

let store: EmployeeStore | null = null;

export function getEmployeeStore(): EmployeeStore {
  if (store) return store;

  if (process.env.DATABASE_URL) {
    store = new PostgresEmployeeStore(getPostgresPool());
    return store;
  }

  if (process.env.NODE_ENV === "production") {
    throw new PersistenceConfigurationError(
      "DATABASE_URL est requis en environnement serveur de production. Le fallback salariés en mémoire est désactivé.",
    );
  }

  store = new InMemoryEmployeeStore();
  return store;
}
