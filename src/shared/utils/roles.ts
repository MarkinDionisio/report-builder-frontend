import type { GlobalRole, MeResponse } from "../api/types";
import type { OrganizationMember, OrganizationRole } from "../../features/organizations/types";

const ROLE_RANK: Record<GlobalRole | OrganizationRole, number> = {
  root: 5,
  administrator: 4,
  creator: 3,
  viewer: 2,
  unassigned: 1,
};

/**
 * Returns the effective role between globalRole and organizationRole.
 * Follows cumulative hierarchy: root > administrator > creator > viewer > unassigned.
 */
export function getEffectiveRole(
  globalRole: GlobalRole,
  organizationRole?: OrganizationRole | null
): GlobalRole | OrganizationRole {
  if (globalRole === "root") return "root";

  const globalRank = ROLE_RANK[globalRole] || 1;
  const orgRank = organizationRole ? ROLE_RANK[organizationRole] || 1 : 1;

  if (globalRank >= orgRank) {
    return globalRole;
  }
  return organizationRole!;
}

/**
 * Checks if current user can manage an organization based on /me data.
 */
export function canManageOrganization(
  me: MeResponse,
  organizationId: string
): boolean {
  if (me.globalRole === "root") return true;
  if (me.globalRole === "administrator") return true;

  return me.organizations.some(
    (organization) =>
      organization.id === organizationId &&
      organization.organizationRole === "administrator"
  );
}

/**
 * Returns list of roles that the current user can assign.
 * Only 'root' can assign 'administrator'.
 */
export function assignableRoles(me: MeResponse): OrganizationRole[] {
  return me.globalRole === "root"
    ? ["administrator", "creator", "viewer"]
    : ["creator", "viewer"];
}

/**
 * Derives actions available for a member item.
 * Uses canCurrentUserManageRole provided by the server.
 */
export function memberActions(member: OrganizationMember) {
  return {
    canChangeRole: member.canCurrentUserManageRole,
    canRemove: member.canCurrentUserManageRole,
  };
}
