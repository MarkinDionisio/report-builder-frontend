import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { Navbar } from "../../../shared/components/Navbar";
import { organizationsApi } from "../api/organizationsApi";
import { usersApi } from "../../users/api/usersApi";
import { catalogApi } from "../../catalog/api/catalogApi";
import type { OrganizationMember, OrganizationInvitation, OrganizationRole } from "../types";
import type { Profile } from "../../catalog/types/catalogTypes";
import type { ApiProblemDetails, GlobalRole } from "../../../shared/api/types";
import { isErr } from "../../../shared/result/result";
import { ProblemAlert } from "../../../shared/components/Alert";
import { AddMemberModal } from "../components/AddMemberModal";
import { InvitationSuccessModal } from "../components/InvitationSuccessModal";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import {
  Users,
  UserPlus,
  ArrowLeft,
  Loader2,
  Trash2,
  Mail,
  Check,
} from "lucide-react";

import { assignableRoles, canManageOrganization, memberActions } from "../../../shared/utils/roles";

export const OrganizationMembersPage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { state, refreshUser } = useAuth();

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [problem, setProblem] = useState<ApiProblemDetails | null>(null);
  const [actionProblem, setActionProblem] = useState<ApiProblemDetails | null>(null);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [pendingInvitation, setPendingInvitation] = useState<OrganizationInvitation | null>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingMember, setDeletingMember] = useState<OrganizationMember | null>(null);

  const me = state.status === "authenticated" ? state.user : null;
  const availableRoles: OrganizationRole[] = me ? assignableRoles(me) : ["creator", "viewer"];

  const fetchMembers = useCallback(async () => {
    if (!organizationId) return;
    setIsLoading(true);
    setProblem(null);

    const [membersRes, profilesRes] = await Promise.all([
      organizationsApi.listMembers(organizationId),
      catalogApi.listProfiles(organizationId),
    ]);

    setIsLoading(false);

    if (isErr(membersRes)) {
      if (membersRes.error.status === 403) {
        refreshUser();
      }
      setProblem(membersRes.error);
    } else if (isErr(profilesRes)) {
      setProblem(profilesRes.error);
    } else {
      setMembers(membersRes.value);
      setProfiles(profilesRes.value);
    }
  }, [organizationId, refreshUser]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRoleChange = async (member: OrganizationMember, newRole: OrganizationRole) => {
    if (!organizationId) return;
    setActionProblem(null);
    setSuccessMessage(null);
    setUpdatingMemberId(member.id);

    const res = await organizationsApi.updateMemberRole(organizationId, member.id, {
      organizationRole: newRole,
    });

    setUpdatingMemberId(null);

    if (isErr(res)) {
      setActionProblem(res.error);
    } else {
      setMembers((prev) => prev.map((m) => (m.id === member.id ? res.value : m)));
      setSuccessMessage(`Papel de ${member.name} atualizado para ${newRole} com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 4000);

      // If updating current user, refresh /me
      if (state.status === "authenticated" && member.id === state.user.id) {
        refreshUser();
      }
    }
  };

  const handleGlobalRoleChange = async (member: OrganizationMember, newRole: GlobalRole) => {
    setActionProblem(null);
    setSuccessMessage(null);
    setUpdatingMemberId(member.id);

    const res = await usersApi.updateGlobalRole(member.id, {
      newRole,
      profileIds: [],
    });

    setUpdatingMemberId(null);

    if (isErr(res)) {
      setActionProblem(res.error);
    } else {
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, globalRole: newRole } : m))
      );
      setSuccessMessage(`Papel global de ${member.name} atualizado para ${newRole} com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 4000);

      // If updating current user, refresh /me
      if (state.status === "authenticated" && member.id === state.user.id) {
        refreshUser();
      }
    }
  };

  const handleProfileToggle = async (member: OrganizationMember, profileId: string, isChecked: boolean) => {
    if (!organizationId) return;
    setActionProblem(null);
    setSuccessMessage(null);
    setUpdatingMemberId(member.id);

    const currentProfileIds = member.profileIds || [];
    let newProfileIds = [...currentProfileIds];

    if (isChecked) {
      newProfileIds.push(profileId);
    } else {
      newProfileIds = newProfileIds.filter((id) => id !== profileId);
    }

    // Deduplicate
    newProfileIds = [...new Set(newProfileIds)];

    const res = await organizationsApi.updateMemberProfiles(organizationId, member.id, {
      profileIds: newProfileIds,
    });

    setUpdatingMemberId(null);

    if (isErr(res)) {
      setActionProblem(res.error);
    } else {
      setMembers((prev) => prev.map((m) => (m.id === member.id ? res.value : m)));
      setSuccessMessage(`Perfis de ${member.name} atualizados com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 4000);

      // If updating current user, refresh /me
      if (state.status === "authenticated" && member.id === state.user.id) {
        refreshUser();
      }
    }
  };

  const handleAddOrInvite = async (
    email: string,
    role: OrganizationRole
  ): Promise<{ success: boolean; invitation?: OrganizationInvitation | null }> => {
    if (!organizationId) return { success: false };
    setActionProblem(null);

    const res = await organizationsApi.createInvitation(organizationId, { email, organizationRole: role });

    if (isErr(res)) {
      setActionProblem(res.error);
      return { success: false };
    }

    const invitation = res.value;

    if (invitation.status === "accepted") {
      await fetchMembers();
      setSuccessMessage(`Usuário ${email} adicionado com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 4000);
      return { success: true };
    } else if (invitation.status === "pending") {
      setPendingInvitation(invitation);
      setIsSuccessOpen(true);
      return { success: true, invitation };
    }

    return { success: true };
  };

  const handleOpenDelete = (member: OrganizationMember) => {
    setDeletingMember(member);
    setActionProblem(null);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<boolean> => {
    if (!organizationId || !deletingMember) return false;
    setActionProblem(null);

    const res = await organizationsApi.removeMember(organizationId, deletingMember.id);

    if (isErr(res)) {
      setActionProblem(res.error);
      return false;
    }

    setMembers((prev) => prev.filter((m) => m.id !== deletingMember.id));
    if (state.status === "authenticated" && deletingMember.id === state.user.id) {
      refreshUser();
    }
    return true;
  };

  const canManage = me && organizationId ? canManageOrganization(me, organizationId) : false;

  if (problem?.status === 403 || (!isLoading && !canManage)) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Navbar />
        <main style={{ maxWidth: "800px", width: "100%", margin: "4rem auto", padding: "0 1.5rem", flex: 1, textAlign: "center" }}>
          <div className="glass-card animate-fade-in" style={{ padding: "3rem 2rem" }}>
            <ProblemAlert
              problem={
                problem || {
                  type: "about:blank",
                  title: "Acesso Negado",
                  status: 403,
                  detail: "Você não possui permissão para gerenciar esta organização.",
                  instance: `/organizations/${organizationId}/members`,
                  code: "organizations.member_view_forbidden",
                }
              }
            />
            <div style={{ marginTop: "2rem" }}>
              <Link to="/organizations" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                <ArrowLeft size={18} /> Voltar para Organizações
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ maxWidth: "1200px", width: "100%", margin: "2rem auto", padding: "0 1.5rem", flex: 1 }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
            <Link to="/organizations" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              <ArrowLeft size={16} /> Organizações
            </Link>
            <span>/</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Membros</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Users size={28} style={{ color: "var(--primary-500)" }} />
                Membros da Organização
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
                Gerencie as permissões e papeis (OrganizationRole) dos usuários vinculados
              </p>
            </div>

            {canManage && (
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <Link to={`/organizations/${organizationId}/invitations`} className="btn btn-secondary">
                  <Mail size={16} /> Ver Convites
                </Link>
                <button onClick={() => setIsAddOpen(true)} className="btn btn-primary">
                  <UserPlus size={18} /> Adicionar / Convidar Membro
                </button>
              </div>
            )}
          </div>
        </div>

        {successMessage && (
          <div className="alert alert-danger animate-fade-in" style={{ backgroundColor: "rgba(16, 185, 129, 0.12)", borderColor: "rgba(16, 185, 129, 0.3)", color: "#34d399", marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Check size={18} />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        <ProblemAlert problem={problem} />
        <ProblemAlert problem={actionProblem} />

        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
            <Loader2 size={36} className="animate-spin" style={{ color: "var(--primary-500)" }} />
          </div>
        ) : members.length === 0 ? (
          <div className="glass-card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
            <Users size={48} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
            <h3 style={{ fontSize: "1.2rem", fontWeight: 600 }}>Nenhum Membro Encontrado</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
              Adicione ou convide novos usuários para esta organização.
            </p>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: "1.5rem" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                    <th style={{ padding: "0.75rem 1rem" }}>Nome</th>
                    <th style={{ padding: "0.75rem 1rem" }}>E-mail</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Papel Global</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Papel na Organização</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Perfis</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const actions = memberActions(member);
                    const isUpdating = updatingMemberId === member.id;

                    return (
                      <tr key={member.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "1rem", fontWeight: 600 }}>{member.name}</td>
                        <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{member.email}</td>
                        <td style={{ padding: "1rem" }}>
                          {me?.globalRole === "root" ? (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                              <select
                                className="input-field"
                                value={member.globalRole}
                                onChange={(e) => handleGlobalRoleChange(member, e.target.value as GlobalRole)}
                                disabled={isUpdating}
                                style={{ padding: "0.35rem 0.6rem", fontSize: "0.85rem", width: "auto" }}
                              >
                                {["unassigned", "root", "administrator", "creator", "viewer"].map((gr) => (
                                  <option key={gr} value={gr} style={{ background: "#0f172a" }}>
                                    {gr}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", borderRadius: "4px", background: "rgba(255,255,255,0.06)" }}>
                              {member.globalRole}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "1rem" }}>
                          {actions.canChangeRole ? (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                              <select
                                className="input-field"
                                value={member.organizationRole}
                                onChange={(e) => handleRoleChange(member, e.target.value as OrganizationRole)}
                                disabled={isUpdating}
                                style={{ padding: "0.35rem 0.6rem", fontSize: "0.85rem", width: "auto" }}
                              >
                                {availableRoles.map((r) => (
                                  <option key={r} value={r} style={{ background: "#0f172a" }}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                              {isUpdating && <Loader2 size={16} className="animate-spin" style={{ color: "var(--primary-500)" }} />}
                            </div>
                          ) : (
                            <span style={{ fontWeight: 600, color: "var(--primary-500)" }}>
                              {member.organizationRole}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "1rem" }}>
                          {actions.canChangeRole ? (
                            <details style={{ position: "relative" }}>
                              <summary
                                className="input-field"
                                style={{
                                  padding: "0.35rem 0.6rem",
                                  fontSize: "0.85rem",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  listStyle: "none",
                                }}
                              >
                                {member.profileIds?.length || 0} perfis selecionados
                              </summary>
                              <div
                                style={{
                                  position: "absolute",
                                  top: "100%",
                                  left: 0,
                                  marginTop: "0.25rem",
                                  background: "#0f172a",
                                  border: "1px solid var(--border-color)",
                                  borderRadius: "6px",
                                  padding: "0.5rem",
                                  zIndex: 10,
                                  minWidth: "200px",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.4rem",
                                  maxHeight: "200px",
                                  overflowY: "auto",
                                }}
                              >
                                {profiles.map((p) => {
                                  const isChecked = (member.profileIds || []).includes(p.id);
                                  return (
                                    <label key={p.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        disabled={isUpdating}
                                        onChange={(e) => handleProfileToggle(member, p.id, e.target.checked)}
                                      />
                                      <span style={{ color: "var(--text-primary)" }}>{p.name}</span>
                                    </label>
                                  );
                                })}
                                {profiles.length === 0 && (
                                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Nenhum perfil criado.</span>
                                )}
                              </div>
                            </details>
                          ) : (
                            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                              {member.profileIds?.length || 0} perfil(s)
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "1rem", textAlign: "right" }}>
                          {actions.canRemove ? (
                            <button
                              onClick={() => handleOpenDelete(member)}
                              className="btn"
                              disabled={isUpdating}
                              style={{
                                padding: "0.35rem 0.65rem",
                                background: "rgba(239, 68, 68, 0.15)",
                                color: "#f87171",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                fontSize: "0.8rem",
                              }}
                            >
                              <Trash2 size={14} /> Remover
                            </button>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Sem permissão</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modals */}
        <AddMemberModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onSubmit={handleAddOrInvite}
          organizationId={organizationId || ""}
          assignableRoles={availableRoles}
          problem={actionProblem}
        />

        <InvitationSuccessModal
          isOpen={isSuccessOpen}
          onClose={() => setIsSuccessOpen(false)}
          invitation={pendingInvitation}
        />

        <ConfirmDeleteModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="Remover Membro"
          itemName={deletingMember ? `${deletingMember.name} (${deletingMember.email})` : "este membro"}
          warningText="O usuário perderá o acesso e as permissões atreladas a esta organização imediatamente."
          problem={actionProblem}
        />
      </main>
    </div>
  );
};
