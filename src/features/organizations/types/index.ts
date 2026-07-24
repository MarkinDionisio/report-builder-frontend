import type { GlobalRole } from "../../../shared/api/types";

export type OrganizationRole = "administrator" | "creator" | "viewer";
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export interface Organization {
  id: string;
  name: string;
  description: string | null;
}

export interface UpsertOrganizationRequest {
  name: string;
  description?: string | null;
}

export interface OrganizationMember {
  id: string; // userId
  name: string;
  email: string;
  globalRole: GlobalRole;
  organizationRole: OrganizationRole;
  canCurrentUserManageRole: boolean;
}

export interface OrganizationUserLookup {
  id: string; // userId
  name: string;
  email: string;
  globalRole: GlobalRole;
  canCurrentUserManageRole: boolean;
}

export interface AddOrganizationMemberRequest {
  userId: string;
  organizationRole: OrganizationRole;
}

export interface UpdateOrganizationMemberRoleRequest {
  organizationRole: OrganizationRole;
}

export interface CreateOrganizationInvitationRequest {
  email: string;
  organizationRole: OrganizationRole;
}

export interface OrganizationInvitation {
  id: string | null;
  organizationId: string;
  organizationName: string;
  email: string;
  organizationRole: OrganizationRole;
  status: InvitationStatus;
  invitedByUserId: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  acceptedByUserId: string | null;
  acceptanceToken?: string | null;
  acceptanceUrl?: string | null;
}
