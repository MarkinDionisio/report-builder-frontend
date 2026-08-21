import { describe, expect, it } from "vitest";
import type { MeResponse } from "../api/types";
import { canCreateReport, getUserCapabilities } from "./capabilities";

const user = (overrides: Partial<MeResponse> = {}): MeResponse => ({
  id: "user-1", name: "Maria", email: "maria@example.com", globalRole: "unassigned", profileIds: [], organizations: [], ...overrides,
});

describe("getUserCapabilities", () => {
  it("não expõe recursos globais para usuário sem papel ou vínculo", () => {
    expect(getUserCapabilities(user())).toEqual({
      canViewOrganizations: false,
      canOpenCreatorWorkspace: false,
      canManageCatalog: false,
      canManageDataSources: false,
      canManageJoinTemplates: false,
    });
  });

  it("libera somente a área de criação para membership creator", () => {
    const capabilities = getUserCapabilities(user({ organizations: [{ id: "org-1", name: "Operação", organizationRole: "creator" }] }));
    expect(capabilities.canViewOrganizations).toBe(true);
    expect(capabilities.canOpenCreatorWorkspace).toBe(true);
    expect(capabilities.canManageCatalog).toBe(false);
  });

  it("libera administração de catálogo somente para root", () => {
    expect(getUserCapabilities(user({ globalRole: "root" })).canManageCatalog).toBe(true);
    expect(getUserCapabilities(user({ globalRole: "administrator" })).canManageCatalog).toBe(false);
  });
});

describe("canCreateReport", () => {
  it("respeita o papel dentro da organização", () => {
    const member = user({ organizations: [{ id: "org-1", name: "Operação", organizationRole: "viewer" }, { id: "org-2", name: "Comercial", organizationRole: "creator" }] });
    expect(canCreateReport(member, "org-1")).toBe(false);
    expect(canCreateReport(member, "org-2")).toBe(true);
  });
});
