export type OrganizationRole = "owner" | "hr" | "advisor" | "readonly";

export type Permission =
  | "assessment:create"
  | "assessment:read"
  | "employee:read"
  | "employee:write"
  | "document:read"
  | "document:write"
  | "task:read"
  | "task:write"
  | "organization:manage";

export interface ActorContext {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
}

const permissionsByRole: Record<OrganizationRole, ReadonlySet<Permission>> = {
  owner: new Set([
    "assessment:create",
    "assessment:read",
    "employee:read",
    "employee:write",
    "document:read",
    "document:write",
    "task:read",
    "task:write",
    "organization:manage",
  ]),
  hr: new Set([
    "assessment:create",
    "assessment:read",
    "employee:read",
    "employee:write",
    "document:read",
    "document:write",
    "task:read",
    "task:write",
  ]),
  advisor: new Set([
    "assessment:create",
    "assessment:read",
    "employee:read",
    "document:read",
    "task:read",
    "task:write",
  ]),
  readonly: new Set([
    "assessment:read",
    "employee:read",
    "document:read",
    "task:read",
  ]),
};

export class AuthorizationError extends Error {
  constructor(public readonly permission: Permission) {
    super(`Permission refusée : ${permission}`);
    this.name = "AuthorizationError";
  }
}

export function can(actor: ActorContext, permission: Permission): boolean {
  return permissionsByRole[actor.role].has(permission);
}

export function assertPermission(actor: ActorContext, permission: Permission): void {
  if (!can(actor, permission)) {
    throw new AuthorizationError(permission);
  }
}
