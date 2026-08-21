import { describe, it, expect } from "vitest";
import {
  getEffectiveRole,
  canManageOrganization,
  assignableRoles,
  memberActions,
  getGlobalRoleLabel,
  getOrganizationRoleLabel,
  getResourceRoleLabel,
} from "./roles";
import type { MeResponse } from "../api/types";
import type { OrganizationMember } from "../../features/organizations/types";

describe("Role Utilities", () => {
  it("returns standardized labels for global roles", () => {
    expect(getGlobalRoleLabel("root")).toBe("Root");
    expect(getGlobalRoleLabel("administrator")).toBe("Administrador");
    expect(getGlobalRoleLabel("creator")).toBe("Criador");
    expect(getGlobalRoleLabel("viewer")).toBe("Leitor");
    expect(getGlobalRoleLabel("unassigned")).toBe("Sem papel");
  });

  it("returns contextual labels for organization and resource roles", () => {
    expect(getOrganizationRoleLabel("administrator")).toBe("Administrador");
    expect(getOrganizationRoleLabel("creator")).toBe("Criador");
    expect(getOrganizationRoleLabel("viewer")).toBe("Leitor");
    expect(getResourceRoleLabel("owner")).toBe("Proprietário");
    expect(getResourceRoleLabel("root")).toBe("Root");
  });

  it("keeps unknown roles visible and handles missing values", () => {
    expect(getGlobalRoleLabel("future-role")).toBe("future-role");
    expect(getOrganizationRoleLabel(undefined)).toBe("Papel não informado");
  });

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
      profileIds: [],
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
