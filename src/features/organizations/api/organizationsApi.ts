import { apiFetch } from "../../../shared/api/client";
import type { ApiProblemDetails } from "../../../shared/api/types";
import { err, isErr, ok } from "../../../shared/result/result";
import type { Result } from "../../../shared/result/result";
import type {
  AddOrganizationMemberRequest,
  CreateOrganizationInvitationRequest,
  Organization,
  OrganizationInvitation,
  OrganizationMember,
  OrganizationUserLookup,
  UpdateOrganizationMemberRoleRequest,
  UpdateOrganizationMemberProfilesRequest,
  UpsertOrganizationRequest,
} from "../types";

export const organizationsApi = {
  // --- ORGANIZATIONS ---
  async list(): Promise<Result<Organization[], ApiProblemDetails>> {
    const res = await apiFetch("/api/v1/organizations");
    if (isErr(res)) return err(res.error);

    try {
      const data = (await res.value.json()) as Organization[];
      return ok(data);
    } catch {
      return err({
        type: "about:blank",
        title: "Erro de Resposta",
        status: 500,
        detail: "Falha ao processar lista de organizações.",
        instance: "/api/v1/organizations",
      });
    }
  },

  async create(data: UpsertOrganizationRequest): Promise<Result<Organization, ApiProblemDetails>> {
    const res = await apiFetch("/api/v1/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (isErr(res)) return err(res.error);

    try {
      const created = (await res.value.json()) as Organization;
      return ok(created);
    } catch {
      return err({
        type: "about:blank",
        title: "Erro de Resposta",
        status: 500,
        detail: "Falha ao criar organização.",
        instance: "/api/v1/organizations",
      });
    }
  },

  async update(id: string, data: UpsertOrganizationRequest): Promise<Result<Organization, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/organizations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (isErr(res)) return err(res.error);

    try {
      const updated = (await res.value.json()) as Organization;
      return ok(updated);
    } catch {
      return err({
        type: "about:blank",
        title: "Erro de Resposta",
        status: 500,
        detail: "Falha ao atualizar organização.",
        instance: `/api/v1/organizations/${id}`,
      });
    }
  },

  async delete(id: string): Promise<Result<void, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/organizations/${id}`, {
      method: "DELETE",
    });

    if (isErr(res)) return err(res.error);
    return ok(undefined);
  },

  // --- MEMBERS ---
  async listMembers(orgId: string): Promise<Result<OrganizationMember[], ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/organizations/${orgId}/members`);
    if (isErr(res)) return err(res.error);

    try {
      const members = (await res.value.json()) as OrganizationMember[];
      return ok(members);
    } catch {
      return err({
        type: "about:blank",
        title: "Erro de Resposta",
        status: 500,
        detail: "Falha ao listar membros da organização.",
        instance: `/api/v1/organizations/${orgId}/members`,
      });
    }
  },

  async lookupUser(orgId: string, email: string): Promise<Result<OrganizationUserLookup, ApiProblemDetails>> {
    const query = new URLSearchParams({ email: email.trim() });
    const res = await apiFetch(`/api/v1/organizations/${orgId}/users/lookup?${query}`);

    if (isErr(res)) return err(res.error);

    try {
      const userLookup = (await res.value.json()) as OrganizationUserLookup;
      return ok(userLookup);
    } catch {
      return err({
        type: "about:blank",
        title: "Erro de Resposta",
        status: 500,
        detail: "Falha na busca de usuário por e-mail.",
        instance: `/api/v1/organizations/${orgId}/users/lookup`,
      });
    }
  },

  async addMember(
    orgId: string,
    data: AddOrganizationMemberRequest
  ): Promise<Result<OrganizationMember, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/organizations/${orgId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (isErr(res)) return err(res.error);

    try {
      const member = (await res.value.json()) as OrganizationMember;
      return ok(member);
    } catch {
      return err({
        type: "about:blank",
        title: "Erro de Resposta",
        status: 500,
        detail: "Falha ao adicionar membro.",
        instance: `/api/v1/organizations/${orgId}/members`,
      });
    }
  },

  async updateMemberRole(
    orgId: string,
    userId: string,
    data: UpdateOrganizationMemberRoleRequest
  ): Promise<Result<OrganizationMember, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/organizations/${orgId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (isErr(res)) return err(res.error);

    try {
      const updatedMember = (await res.value.json()) as OrganizationMember;
      return ok(updatedMember);
    } catch {
      return err({
        type: "about:blank",
        title: "Erro de Resposta",
        status: 500,
        detail: "Falha ao atualizar papel do membro.",
        instance: `/api/v1/organizations/${orgId}/members/${userId}`,
      });
    }
  },

  async updateMemberProfiles(
    orgId: string,
    userId: string,
    data: UpdateOrganizationMemberProfilesRequest
  ): Promise<Result<OrganizationMember, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/organizations/${orgId}/members/${userId}/profiles`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (isErr(res)) return err(res.error);

    try {
      const updatedMember = (await res.value.json()) as OrganizationMember;
      return ok(updatedMember);
    } catch {
      return err({
        type: "about:blank",
        title: "Erro de Resposta",
        status: 500,
        detail: "Falha ao atualizar perfis do membro.",
        instance: `/api/v1/organizations/${orgId}/members/${userId}/profiles`,
      });
    }
  },

  async removeMember(orgId: string, userId: string): Promise<Result<void, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/organizations/${orgId}/members/${userId}`, {
      method: "DELETE",
    });

    if (isErr(res)) return err(res.error);
    return ok(undefined);
  },

  // --- INVITATIONS ---
  async listInvitations(orgId: string): Promise<Result<OrganizationInvitation[], ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/organizations/${orgId}/invitations`);
    if (isErr(res)) return err(res.error);

    try {
      const invitations = (await res.value.json()) as OrganizationInvitation[];
      return ok(invitations);
    } catch {
      return err({
        type: "about:blank",
        title: "Erro de Resposta",
        status: 500,
        detail: "Falha ao listar convites.",
        instance: `/api/v1/organizations/${orgId}/invitations`,
      });
    }
  },

  async createInvitation(
    orgId: string,
    data: CreateOrganizationInvitationRequest
  ): Promise<Result<OrganizationInvitation, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/organizations/${orgId}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (isErr(res)) return err(res.error);

    try {
      const invitation = (await res.value.json()) as OrganizationInvitation;
      return ok(invitation);
    } catch {
      return err({
        type: "about:blank",
        title: "Erro de Resposta",
        status: 500,
        detail: "Falha ao criar convite.",
        instance: `/api/v1/organizations/${orgId}/invitations`,
      });
    }
  },

  async revokeInvitation(orgId: string, invitationId: string): Promise<Result<void, ApiProblemDetails>> {
    const res = await apiFetch(`/api/v1/organizations/${orgId}/invitations/${invitationId}`, {
      method: "DELETE",
    });

    if (isErr(res)) return err(res.error);
    return ok(undefined);
  },
};
