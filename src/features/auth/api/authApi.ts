import { anonymousFetch, apiFetch } from "../../../shared/api/client";
import type {
  AcceptInvitationRequest,
  ApiProblemDetails,
  AuthResponse,
  LoginRequest,
  MeResponse,
  RegisterRequest,
} from "../../../shared/api/types";
import { err, isErr, ok } from "../../../shared/result/result";
import type { Result } from "../../../shared/result/result";

export const authApi = {
  async login(credentials: LoginRequest): Promise<Result<AuthResponse, ApiProblemDetails>> {
    const result = await anonymousFetch("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (isErr(result)) return err(result.error);

    try {
      const data = (await result.value.json()) as AuthResponse;
      return ok(data);
    } catch {
      return err({
        type: "about:blank",
        title: "Response error",
        status: 500,
        detail: "Could not process the server response.",
        instance: "/api/v1/auth/login",
      });
    }
  },

  async register(data: RegisterRequest): Promise<Result<AuthResponse, ApiProblemDetails>> {
    const result = await anonymousFetch("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (isErr(result)) return err(result.error);

    try {
      const responseData = (await result.value.json()) as AuthResponse;
      return ok(responseData);
    } catch {
      return err({
        type: "about:blank",
        title: "Response error",
        status: 500,
        detail: "Could not process the server response.",
        instance: "/api/v1/auth/register",
      });
    }
  },

  async acceptInvitation(
    data: AcceptInvitationRequest
  ): Promise<Result<AuthResponse, ApiProblemDetails>> {
    const result = await anonymousFetch("/api/v1/auth/invitations/accept", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (isErr(result)) return err(result.error);

    try {
      const responseData = (await result.value.json()) as AuthResponse;
      return ok(responseData);
    } catch {
      return err({
        type: "about:blank",
        title: "Response error",
        status: 500,
        detail: "Could not process the server response.",
        instance: "/api/v1/auth/invitations/accept",
      });
    }
  },

  async getMe(): Promise<Result<MeResponse, ApiProblemDetails>> {
    const result = await apiFetch("/api/v1/me");

    if (isErr(result)) return err(result.error);

    try {
      const meData = (await result.value.json()) as MeResponse;
      return ok(meData);
    } catch {
      return err({
        type: "about:blank",
        title: "Response error",
        status: 500,
        detail: "Could not process the server response.",
        instance: "/api/v1/me",
      });
    }
  },
};
