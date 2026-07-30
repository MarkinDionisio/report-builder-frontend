import { describe, it, expect, vi } from "vitest";
import { usersApi } from "./api/usersApi";
import * as client from "../../shared/api/client";
import { isOk, isErr, ok, err } from "../../shared/result/result";

describe("Users API Service", () => {
  it("should update global role via PATCH /api/v1/users/:userId", async () => {
    const mockResponse = new Response(null, { status: 200 });
    const fetchSpy = vi.spyOn(client, "apiFetch").mockResolvedValueOnce(ok(mockResponse));

    const result = await usersApi.updateGlobalRole("user-123", {
      newRole: "creator",
      profileIds: [],
    });

    expect(isOk(result)).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith("/api/v1/users/user-123", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ globalRole: "creator" }),
    });
  });

  it("should handle error when updating global role without root privileges", async () => {
    const mockProblem = {
      type: "about:blank",
      title: "Forbidden",
      status: 403,
      detail: "Apenas Administradores Root podem alterar o papel global de usuários.",
      instance: "/api/v1/users/user-123",
      code: "users.root_access_required",
    };

    vi.spyOn(client, "apiFetch").mockResolvedValueOnce(err(mockProblem));

    const result = await usersApi.updateGlobalRole("user-123", {
      newRole: "administrator",
      profileIds: [],
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.status).toBe(403);
      expect(result.error.code).toBe("users.root_access_required");
    }
  });
});
