import { describe, it, expect } from "vitest";
import {
  getEffectiveRole,
  canManageOrganization,
  assignableRoles,
  memberActions,
} from "./roles";
import type { MeResponse } from "../api/types";
import type { OrganizationMember } from "../../features/organizations/types";

describe("Role Utilities", () => {
  it("should calculate effective role using cumulative hierarchy", () => {
    expect(getEffectiveRole("root", "viewer")).toBe("root");
    expect(getEffectiveRole("administrator", "viewer")).toBe("administrator");
    expect(getEffectiveRole("viewer", "administrator")).toBe("administrator");
    expect(getEffectiveRole("unassigned", "creator")).toBe("creator");
    expect(getEffectiveRole("unassigned", null)).toBe("unassigned");
  });

  it("should check canManageOrganization for root, administrator, and local org admin", () => {
    const rootUser: MeResponse = {
      id: "u1",
      name: "Root",
      email: "root@example.com",
      globalRole: "root",
      profileIds: [],
      organizations: [],
    };
    expect(canManageOrganization(rootUser, "org-1")).toBe(true);

    const adminUser: MeResponse = {
      id: "u2",
      name: "Admin",
      email: "admin@example.com",
      globalRole: "administrator",
      profileIds: [],
      organizations: [],
    };
    expect(canManageOrganization(adminUser, "org-1")).toBe(true);

    const localAdminUser: MeResponse = {
      id: "u3",
      name: "Local Admin",
      email: "local@example.com",
      globalRole: "unassigned",
      profileIds: [],
      organizations: [{ id: "org-1", name: "Org 1", organizationRole: "administrator" }],
    };
    expect(canManageOrganization(localAdminUser, "org-1")).toBe(true);

    const viewerUser: MeResponse = {
      id: "u4",
      name: "Viewer",
      email: "viewer@example.com",
      globalRole: "unassigned",
      profileIds: [],
      organizations: [{ id: "org-1", name: "Org 1", organizationRole: "viewer" }],
    };
    expect(canManageOrganization(viewerUser, "org-1")).toBe(false);
  });

  it("should return assignable roles allowing administrator ONLY for root", () => {
    const rootUser: MeResponse = {
      id: "u1",
      name: "Root",
      email: "root@example.com",
      globalRole: "root",
      profileIds: [],
      organizations: [],
    };
    expect(assignableRoles(rootUser)).toEqual(["administrator", "creator", "viewer"]);

    const adminUser: MeResponse = {
      id: "u2",
      name: "Admin",
      email: "admin@example.com",
      globalRole: "administrator",
      profileIds: [],
      organizations: [],
    };
    expect(assignableRoles(adminUser)).toEqual(["creator", "viewer"]);
  });

  it("should return member actions respecting canCurrentUserManageRole", () => {
    const member: OrganizationMember = {
      id: "m1",
      name: "Member",
      email: "mem@example.com",
      globalRole: "viewer",
      organizationRole: "viewer",
      canCurrentUserManageRole: true,
    };
    expect(memberActions(member)).toEqual({ canChangeRole: true, canRemove: true });

    const member2: OrganizationMember = {
      ...member,
      canCurrentUserManageRole: false,
    };
    expect(memberActions(member2)).toEqual({ canChangeRole: false, canRemove: false });
  });
});
