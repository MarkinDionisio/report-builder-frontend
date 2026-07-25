import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type {
  AcceptInvitationRequest,
  ApiProblemDetails,
  AuthResponse,
  AuthState,
  LoginRequest,
  MeResponse,
  RegisterRequest,
} from "../../../shared/api/types";
import { clearSession, installTokens, readPersistedSession, refreshSession } from "../../../shared/api/client";
import { authApi } from "../api/authApi";
import { err, isErr, ok } from "../../../shared/result/result";
import type { Result } from "../../../shared/result/result";

interface AuthContextType {
  state: AuthState;
  login: (credentials: LoginRequest) => Promise<Result<MeResponse, ApiProblemDetails>>;
  register: (data: RegisterRequest) => Promise<Result<MeResponse, ApiProblemDetails>>;
  acceptInvitation: (data: AcceptInvitationRequest) => Promise<Result<MeResponse, ApiProblemDetails>>;
  logout: () => void;
  initialize: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({ status: "initializing", user: null });

  const completeAuthentication = useCallback(
    async (tokens: AuthResponse): Promise<Result<MeResponse, ApiProblemDetails>> => {
      installTokens(tokens);

      const meResult = await authApi.getMe();
      if (isErr(meResult)) {
        clearSession();
        setState({ status: "anonymous", user: null });
        return err(meResult.error);
      }

      const user = meResult.value;
      setState({ status: "authenticated", user });
      return ok(user);
    },
    []
  );

  const initialize = useCallback(async (): Promise<void> => {
    setState({ status: "initializing", user: null });

    const persisted = readPersistedSession();
    if (!persisted) {
      setState({ status: "anonymous", user: null });
      return;
    }

    try {
      await refreshSession();
      const meResult = await authApi.getMe();

      if (isErr(meResult)) {
        clearSession();
        setState({ status: "anonymous", user: null });
        return;
      }

      setState({ status: "authenticated", user: meResult.value });
    } catch {
      clearSession();
      setState({ status: "anonymous", user: null });
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const login = async (credentials: LoginRequest): Promise<Result<MeResponse, ApiProblemDetails>> => {
    const result = await authApi.login(credentials);
    if (isErr(result)) return err(result.error);
    return completeAuthentication(result.value);
  };

  const register = async (data: RegisterRequest): Promise<Result<MeResponse, ApiProblemDetails>> => {
    const result = await authApi.register(data);
    if (isErr(result)) return err(result.error);
    return completeAuthentication(result.value);
  };

  const acceptInvitation = async (
    data: AcceptInvitationRequest
  ): Promise<Result<MeResponse, ApiProblemDetails>> => {
    const result = await authApi.acceptInvitation(data);
    if (isErr(result)) return err(result.error);
    return completeAuthentication(result.value);
  };

  const refreshUser = useCallback(async (): Promise<void> => {
    const meResult = await authApi.getMe();
    if (isOk(meResult)) {
      setState({ status: "authenticated", user: meResult.value });
    } else if (meResult.error.status === 401) {
      clearSession();
      setState({ status: "anonymous", user: null });
    }
  }, []);

  const logout = () => {
    clearSession();
    setState({ status: "anonymous", user: null });
  };

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        register,
        acceptInvitation,
        logout,
        initialize,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }
  return context;
};
