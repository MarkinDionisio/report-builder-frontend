export type GlobalRole = "root" | "administrator" | "creator" | "viewer";

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AcceptInvitationRequest {
  token: string;
  name: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresAt: string; // ISO 8601
  userId: string;    // UUID
  email: string;
  globalRole: GlobalRole;
}

export interface OrganizationMembership {
  id: string;
  name: string;
  organizationRole: string;
}

export interface MeResponse {
  id: string;
  name: string;
  email: string;
  globalRole: GlobalRole;
  profileIds: string[];
  organizations: OrganizationMembership[];
}

export interface ApiProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
}

export type AuthStatus = "initializing" | "anonymous" | "authenticated";

export type AuthState =
  | { status: "initializing"; user: null }
  | { status: "anonymous"; user: null }
  | { status: "authenticated"; user: MeResponse };

export interface PersistedSession {
  refreshToken: string;
}
