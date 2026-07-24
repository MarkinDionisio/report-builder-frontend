import { API_URL, REFRESH_EARLY_MS, SESSION_KEY } from "./config";
import type { ApiProblemDetails, AuthResponse, PersistedSession } from "./types";
import { err, ok } from "../result/result";
import type { Result } from "../result/result";

let accessToken: string | null = null;
let accessTokenExpiresAt = 0;
let refreshInFlight: Promise<void> | null = null;

export function readPersistedSession(): PersistedSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedSession>;
    return typeof parsed.refreshToken === "string"
      ? { refreshToken: parsed.refreshToken }
      : null;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function installTokens(response: AuthResponse): void {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ refreshToken: response.refreshToken } satisfies PersistedSession)
  );
  accessToken = response.accessToken;
  accessTokenExpiresAt = Date.parse(response.expiresAt);
}

export function clearSession(): void {
  accessToken = null;
  accessTokenExpiresAt = 0;
  localStorage.removeItem(SESSION_KEY);
}

export async function parseProblem(response: Response): Promise<ApiProblemDetails> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("json")) {
    try {
      const data = await response.json();
      return {
        type: data.type || "about:blank",
        title: data.title || "Erro na requisição",
        status: data.status || response.status,
        detail: data.detail || "Ocorreu um erro ao processar a requisição.",
        instance: data.instance || new URL(response.url).pathname,
        code: data.code,
        traceId: data.traceId,
        errors: data.errors,
      };
    } catch {
      // Fallback if parsing fails
    }
  }

  return {
    type: "about:blank",
    title: "Request Failed",
    status: response.status,
    detail: `A requisição falhou com status HTTP ${response.status}.`,
    instance: new URL(response.url).pathname,
  };
}

export async function refreshSession(): Promise<void> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const persisted = readPersistedSession();
    if (!persisted) {
      throw {
        type: "about:blank",
        title: "Sessão Expirada",
        status: 401,
        detail: "Não há token de atualização disponível.",
        code: "auth.refresh_token_required",
        instance: "/api/v1/auth/refresh",
      } satisfies ApiProblemDetails;
    }

    const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: persisted.refreshToken }),
    });

    if (!response.ok) {
      const problem = await parseProblem(response);
      throw problem;
    }

    const authResponse = (await response.json()) as AuthResponse;
    installTokens(authResponse);
  })()
    .catch((error) => {
      clearSession();
      throw error;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

export async function ensureFreshAccessToken(): Promise<void> {
  if (!accessToken || Date.now() >= accessTokenExpiresAt - REFRESH_EARLY_MS) {
    await refreshSession();
  }
}

/**
 * Authenticated HTTP client wrapper that handles token refresh and retries once on 401.
 * Returns Result<Response, ApiProblemDetails> instead of throwing exceptions.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
  retryAfterUnauthorized = true
): Promise<Result<Response, ApiProblemDetails>> {
  try {
    await ensureFreshAccessToken();
  } catch (refreshErr) {
    return err(refreshErr as ApiProblemDetails);
  }

  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  try {
    const response = await fetch(`${API_URL}${path}`, { ...init, headers });

    if (response.status === 401 && retryAfterUnauthorized) {
      try {
        await refreshSession();
        return apiFetch(path, init, false);
      } catch (refreshErr) {
        return err(refreshErr as ApiProblemDetails);
      }
    }

    if (!response.ok) {
      const problem = await parseProblem(response);
      return err(problem);
    }

    return ok(response);
  } catch (netErr) {
    return err({
      type: "about:blank",
      title: "Erro de Conectividade",
      status: 0,
      detail: netErr instanceof Error ? netErr.message : "Não foi possível conectar ao servidor.",
      instance: path,
    });
  }
}

/**
 * Anonymous HTTP client wrapper for unauthenticated endpoints (login, register, accept invitation).
 * Returns Result<Response, ApiProblemDetails>.
 */
export async function anonymousFetch(
  path: string,
  init: RequestInit = {}
): Promise<Result<Response, ApiProblemDetails>> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(`${API_URL}${path}`, { ...init, headers });

    if (!response.ok) {
      const problem = await parseProblem(response);
      return err(problem);
    }

    return ok(response);
  } catch (netErr) {
    return err({
      type: "about:blank",
      title: "Erro de Conectividade",
      status: 0,
      detail: netErr instanceof Error ? netErr.message : "Não foi possível conectar ao servidor.",
      instance: path,
    });
  }
}
