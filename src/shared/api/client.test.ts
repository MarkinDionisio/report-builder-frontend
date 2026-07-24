import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  readPersistedSession,
  installTokens,
  clearSession,
  parseProblem,
} from "./client";
import { SESSION_KEY } from "./config";
import type { AuthResponse } from "./types";

// Mock localStorage for JSDOM / Vitest environment
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: storageMock, writable: true });

describe("HTTP Client & Auth Session Utilities", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("should return null when reading empty persisted session", () => {
    expect(readPersistedSession()).toBeNull();
  });

  it("should store and read single-record refreshToken in localStorage", () => {
    const mockAuth: AuthResponse = {
      accessToken: "access-123",
      refreshToken: "refresh-456",
      tokenType: "Bearer",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      userId: "user-uuid-1",
      email: "test@example.com",
      globalRole: "viewer",
    };

    installTokens(mockAuth);

    const session = readPersistedSession();
    expect(session).not.toBeNull();
    expect(session?.refreshToken).toBe("refresh-456");

    // Verify localStorage key format
    const raw = localStorage.getItem(SESSION_KEY);
    expect(raw).toBe(JSON.stringify({ refreshToken: "refresh-456" }));
  });

  it("should clear session and remove token from localStorage", () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ refreshToken: "ref-789" }));
    clearSession();
    expect(readPersistedSession()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("should parse ProblemDetails response correctly", async () => {
    const mockProblem = {
      type: "https://reportsapi.fabricasistemas.com.br/probs/auth/invalid-credentials",
      title: "Credenciais Inválidas",
      status: 400,
      detail: "E-mail ou senha incorretos.",
      instance: "/api/v1/auth/login",
      code: "auth.invalid_credentials",
      traceId: "trace-999",
    };

    const mockResponse = new Response(JSON.stringify(mockProblem), {
      status: 400,
      headers: { "Content-Type": "application/problem+json" },
    });

    const parsed = await parseProblem(mockResponse);
    expect(parsed.code).toBe("auth.invalid_credentials");
    expect(parsed.detail).toBe("E-mail ou senha incorretos.");
    expect(parsed.traceId).toBe("trace-999");
  });
});
