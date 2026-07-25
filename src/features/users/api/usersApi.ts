import { apiFetch } from "../../../shared/api/client";
import type { ApiProblemDetails, UpdateUserGlobalRoleRequest } from "../../../shared/api/types";
import { err, isErr, ok } from "../../../shared/result/result";
import type { Result } from "../../../shared/result/result";

export const usersApi = {
  async updateGlobalRole(
    userId: string,
    data: UpdateUserGlobalRoleRequest
  ): Promise<Result<void, ApiProblemDetails>> {
    const payload = {
      newRole: data.newRole,
      profileIds: data.profileIds ?? [],
    };

    const res = await apiFetch(`/api/v1/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (isErr(res)) return err(res.error);
    return ok(undefined);
  },
};
