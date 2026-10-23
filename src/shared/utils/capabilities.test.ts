import { describe, expect, it } from "vitest";
import type { MeResponse } from "../api/types";
import { canCreateReport, getUserCapabilities } from "./capabilities";

const user = (overrides: Partial<MeResponse> = {}): MeResponse => ({
  id: "user-1", name: "Maria", email: "maria@example.com", globalRole: "unassigned", profileIds: [], organizations: [], ...overrides,
});

describe("getUserCapabilities", () => {
  it("does not expose global resources without a role or membership", () => {
    expect(getUserCapabilities(user())).toEqual({
      canViewOrganizations: false,
      canOpenCreatorWorkspace: false,
      canManageCatalog: false,
      canManageDataSources: false,
      canManageJoinTemplates: false,
    });
  });

  it("allows only creator workspace for creator memberships", () => {
    const capabilities = getUserCapabilities(user({ organizations: [{ id: "org-1", name: "Operação", organizationRole: "creator" }] }));
    expect(capabilities.canViewOrganizations).toBe(true);
    expect(capabilities.canOpenCreatorWorkspace).toBe(true);
    expect(capabilities.canManageCatalog).toBe(false);
  });

  it("allows catalog administration only for root", () => {
    expect(getUserCapabilities(user({ globalRole: "root" })).canManageCatalog).toBe(true);
    expect(getUserCapabilities(user({ globalRole: "administrator" })).canManageCatalog).toBe(false);
  });
});

describe("canCreateReport", () => {
  it("respects the role within the organization", () => {
    const member = user({ organizations: [{ id: "org-1", name: "Operação", organizationRole: "viewer" }, { id: "org-2", name: "Comercial", organizationRole: "creator" }] });
    expect(canCreateReport(member, "org-1")).toBe(false);
    expect(canCreateReport(member, "org-2")).toBe(true);
  });
});
