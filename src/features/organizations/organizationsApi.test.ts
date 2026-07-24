import { describe, it, expect, vi } from "vitest";
import { organizationsApi } from "./api/organizationsApi";
import * as client from "../../shared/api/client";
import { isOk, isErr, ok, err } from "../../shared/result/result";

describe("Organizations API Service (Result Pattern)", () => {
  it("should list organizations returning Result Ok", async () => {
    const mockOrgs = [
      { id: "org-1", name: "Operação Brasil", description: "Relatórios BR" },
      { id: "org-2", name: "Operação Chile", description: null },
    ];

    const mockResponse = new Response(JSON.stringify(mockOrgs), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    vi.spyOn(client, "apiFetch").mockResolvedValueOnce(ok(mockResponse));

    const result = await organizationsApi.list();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toHaveLength(2);
      expect(result.value[0].name).toBe("Operação Brasil");
    }
  });

  it("should handle 403 Forbidden returning Result Err without throwing exceptions", async () => {
    const mockProblem = {
      type: "about:blank",
      title: "Forbidden",
      status: 403,
      detail: "Você não possui permissão para consultar membros.",
      instance: "/api/v1/organizations/org-1/members",
      code: "organizations.member_view_forbidden",
    };

    vi.spyOn(client, "apiFetch").mockResolvedValueOnce(err(mockProblem));

    const result = await organizationsApi.listMembers("org-1");
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.status).toBe(403);
      expect(result.error.code).toBe("organizations.member_view_forbidden");
    }
  });

  it("should lookup existing user by email query parameter", async () => {
    const mockUserLookup = {
      id: "user-uuid-1",
      name: "João Silva",
      email: "joao@example.com",
      globalRole: "viewer",
      canCurrentUserManageRole: true,
    };

    const mockResponse = new Response(JSON.stringify(mockUserLookup), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    vi.spyOn(client, "apiFetch").mockResolvedValueOnce(ok(mockResponse));

    const result = await organizationsApi.lookupUser("org-1", "joao@example.com");
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.email).toBe("joao@example.com");
      expect(result.value.canCurrentUserManageRole).toBe(true);
    }
  });

  it("should create pending invitation with token", async () => {
    const mockInvitation = {
      id: "inv-123",
      organizationId: "org-1",
      organizationName: "Operação Brasil",
      email: "novo@exemplo.com",
      organizationRole: "creator",
      status: "pending",
      invitedByUserId: "user-root",
      expiresAt: new Date().toISOString(),
      acceptedAt: null,
      acceptedByUserId: null,
      acceptanceToken: "secret-token-abc",
      acceptanceUrl: "/invitations/accept?token=secret-token-abc",
    };

    const mockResponse = new Response(JSON.stringify(mockInvitation), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    vi.spyOn(client, "apiFetch").mockResolvedValueOnce(ok(mockResponse));

    const result = await organizationsApi.createInvitation("org-1", {
      email: "novo@exemplo.com",
      organizationRole: "creator",
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.status).toBe("pending");
      expect(result.value.acceptanceToken).toBe("secret-token-abc");
    }
  });

  it("should handle 204 No Content on organization deletion", async () => {
    const mockResponse = new Response(null, { status: 204 });

    vi.spyOn(client, "apiFetch").mockResolvedValueOnce(ok(mockResponse));

    const result = await organizationsApi.delete("org-1");
    expect(isOk(result)).toBe(true);
  });
});
