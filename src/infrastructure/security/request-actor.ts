import type { ActorContext, OrganizationRole } from "@/application/authorization";

const DEMO_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";
const DEMO_USER_ID = "00000000-0000-4000-8000-000000000002";
const roles = new Set<OrganizationRole>(["owner", "hr", "advisor", "readonly"]);

export class AuthenticationConfigurationError extends Error {
  constructor(message = "Authentification serveur non configurée.") {
    super(message);
    this.name = "AuthenticationConfigurationError";
  }
}

export function resolveServerActor(): ActorContext {
  if (process.env.NODE_ENV === "production") {
    throw new AuthenticationConfigurationError(
      "Aucun fournisseur d'identité de production n'est configuré. L'API refuse de créer un contexte utilisateur implicite.",
    );
  }

  const role = (process.env.VIGIE_DEMO_ROLE ?? "owner") as OrganizationRole;
  if (!roles.has(role)) {
    throw new AuthenticationConfigurationError("VIGIE_DEMO_ROLE contient un rôle inconnu.");
  }

  return {
    organizationId: process.env.VIGIE_DEMO_ORGANIZATION_ID ?? DEMO_ORGANIZATION_ID,
    userId: process.env.VIGIE_DEMO_USER_ID ?? DEMO_USER_ID,
    role,
  };
}
