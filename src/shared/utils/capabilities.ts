import type { MeResponse } from "../api/types";

export interface UserCapabilities {
  canViewOrganizations: boolean;
  canOpenCreatorWorkspace: boolean;
  canManageCatalog: boolean;
  canManageDataSources: boolean;
  canManageJoinTemplates: boolean;
}

const CREATOR_ROLES = new Set(["root", "administrator", "creator"]);

export function getUserCapabilities(user: MeResponse): UserCapabilities {
  const hasCreatorMembership = user.organizations.some(({ organizationRole }) =>
    organizationRole === "administrator" || organizationRole === "creator"
  );
  const isRoot = user.globalRole === "root";

  return {
    canViewOrganizations: isRoot || user.globalRole !== "unassigned" || user.organizations.length > 0,
    canOpenCreatorWorkspace: CREATOR_ROLES.has(user.globalRole) || hasCreatorMembership,
    canManageCatalog: isRoot,
    canManageDataSources: isRoot,
    canManageJoinTemplates: isRoot,
  };
}

export function canCreateReport(user: MeResponse, organizationId: string): boolean {
  if (CREATOR_ROLES.has(user.globalRole)) return true;
  return user.organizations.some(({ id, organizationRole }) =>
    id === organizationId && (organizationRole === "administrator" || organizationRole === "creator")
  );
}
