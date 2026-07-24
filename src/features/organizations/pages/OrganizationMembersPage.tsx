import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { Navbar } from "../../../shared/components/Navbar";
import { organizationsApi } from "../api/organizationsApi";
import type { OrganizationMember, OrganizationInvitation, OrganizationRole } from "../types";
import type { ApiProblemDetails } from "../../../shared/api/types";
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

export const OrganizationMembersPage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { state, initialize } = useAuth();

  const [members, setMembers] = useState<OrganizationMember[]>([]);
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

  const isRoot = state.status === "authenticated" && state.user?.globalRole === "root";

  const assignableRoles: OrganizationRole[] = isRoot
    ? ["administrator", "creator", "viewer"]
    : ["creator", "viewer"];

  const fetchMembers = useCallback(async () => {
    if (!organizationId) return;
    setIsLoading(true);
    setProblem(null);

    const res = await organizationsApi.listMembers(organizationId);
    setIsLoading(false);

    if (isErr(res)) {
      if (res.error.status === 403) {
        initialize();
      }
      setProblem(res.error);
    } else {
      setMembers(res.value);
    }
  }, [organizationId, initialize]);

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
        initialize();
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
      initialize();
    }
    return true;
  };

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

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <Link to={`/organizations/${organizationId}/invitations`} className="btn btn-secondary">
                <Mail size={16} /> Ver Convites
              </Link>
              <button onClick={() => setIsAddOpen(true)} className="btn btn-primary">
                <UserPlus size={18} /> Adicionar / Convidar Membro
              </button>
            </div>
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
                    <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const canEdit = member.canCurrentUserManageRole || isRoot;
                    const isUpdating = updatingMemberId === member.id;

                    return (
                      <tr key={member.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "1rem", fontWeight: 600 }}>{member.name}</td>
                        <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{member.email}</td>
                        <td style={{ padding: "1rem" }}>
                          <span style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", borderRadius: "4px", background: "rgba(255,255,255,0.06)" }}>
                            {member.globalRole}
                          </span>
                        </td>
                        <td style={{ padding: "1rem" }}>
                          {canEdit ? (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                              <select
                                className="input-field"
                                value={member.organizationRole}
                                onChange={(e) => handleRoleChange(member, e.target.value as OrganizationRole)}
                                disabled={isUpdating}
                                style={{ padding: "0.35rem 0.6rem", fontSize: "0.85rem", width: "auto" }}
                              >
                                {assignableRoles.map((r) => (
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
                        <td style={{ padding: "1rem", textAlign: "right" }}>
                          {canEdit ? (
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
          assignableRoles={assignableRoles}
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
