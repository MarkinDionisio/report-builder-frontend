import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { Navbar } from "../../../shared/components/Navbar";
import { organizationsApi } from "../api/organizationsApi";
import type { OrganizationInvitation } from "../types";
import type { ApiProblemDetails } from "../../../shared/api/types";
import { isErr } from "../../../shared/result/result";
import { ProblemAlert } from "../../../shared/components/Alert";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import {
  Mail,
  ArrowLeft,
  Loader2,
  Ban,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export const OrganizationInvitationsPage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { initialize } = useAuth();

  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [problem, setProblem] = useState<ApiProblemDetails | null>(null);
  const [actionProblem, setActionProblem] = useState<ApiProblemDetails | null>(null);

  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [revokingInvitation, setRevokingInvitation] = useState<OrganizationInvitation | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!organizationId) return;
    setIsLoading(true);
    setProblem(null);

    const res = await organizationsApi.listInvitations(organizationId);
    setIsLoading(false);

    if (isErr(res)) {
      if (res.error.status === 403) {
        initialize();
      }
      setProblem(res.error);
    } else {
      setInvitations(res.value);
    }
  }, [organizationId, initialize]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleOpenRevoke = (invitation: OrganizationInvitation) => {
    setRevokingInvitation(invitation);
    setActionProblem(null);
    setIsRevokeOpen(true);
  };

  const handleRevokeConfirm = async (): Promise<boolean> => {
    if (!organizationId || !revokingInvitation || !revokingInvitation.id) return false;
    setActionProblem(null);

    const res = await organizationsApi.revokeInvitation(organizationId, revokingInvitation.id);

    if (isErr(res)) {
      setActionProblem(res.error);
      if (res.error.code === "invitations.revoke_not_pending") {
        fetchInvitations();
      }
      return false;
    }

    // Update list after 204
    setInvitations((prev) =>
      prev.map((i) => (i.id === revokingInvitation.id ? { ...i, status: "revoked" } : i))
    );
    return true;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return {
          bg: "rgba(245, 158, 11, 0.15)",
          text: "#f59e0b",
          border: "rgba(245, 158, 11, 0.3)",
          icon: <Clock size={14} />,
          label: "Pendente",
        };
      case "accepted":
        return {
          bg: "rgba(16, 185, 129, 0.15)",
          text: "#10b981",
          border: "rgba(16, 185, 129, 0.3)",
          icon: <CheckCircle2 size={14} />,
          label: "Aceito",
        };
      case "revoked":
        return {
          bg: "rgba(239, 68, 68, 0.15)",
          text: "#ef4444",
          border: "rgba(239, 68, 68, 0.3)",
          icon: <Ban size={14} />,
          label: "Revogado",
        };
      default:
        return {
          bg: "rgba(100, 116, 139, 0.15)",
          text: "#94a3b8",
          border: "rgba(100, 116, 139, 0.3)",
          icon: <XCircle size={14} />,
          label: "Expirado",
        };
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ maxWidth: "1200px", width: "100%", margin: "2rem auto", padding: "0 1.5rem", flex: 1 }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          to={`/organizations/${organizationId}/members`}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem", marginBottom: "1rem" }}
        >
          <ArrowLeft size={16} /> Voltar para Membros
        </Link>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Mail size={28} style={{ color: "var(--primary-500)" }} />
              Convites da Organização
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
              Histórico e gerenciamento de convites enviados aos usuários
            </p>
          </div>

          <Link to={`/organizations/${organizationId}/members`} className="btn btn-secondary">
            <Users size={16} /> Gerenciar Membros
          </Link>
        </div>
      </div>

      <ProblemAlert problem={problem} />
      <ProblemAlert problem={actionProblem} />

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
          <Loader2 size={36} className="animate-spin" style={{ color: "var(--primary-500)" }} />
        </div>
      ) : invitations.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
          <Mail size={48} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: 600 }}>Nenhum Convite Encontrado</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
            Os convites gerados para esta organização aparecerão listados aqui.
          </p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                  <th style={{ padding: "0.75rem 1rem" }}>E-mail</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Papel Atribuído</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Expiração / Aceite</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => {
                  const badge = getStatusBadge(inv.status);
                  return (
                    <tr key={inv.id || inv.email} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "1rem", fontWeight: 600 }}>{inv.email}</td>
                      <td style={{ padding: "1rem" }}>
                        <span style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", borderRadius: "4px", background: "rgba(255,255,255,0.06)" }}>
                          {inv.organizationRole}
                        </span>
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.25rem 0.65rem",
                            borderRadius: "9999px",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            backgroundColor: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.icon} {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: "1rem", fontSize: "0.825rem", color: "var(--text-secondary)" }}>
                        {inv.acceptedAt ? (
                          <div>Aceito em: {new Date(inv.acceptedAt).toLocaleDateString()}</div>
                        ) : inv.expiresAt ? (
                          <div>Expira em: {new Date(inv.expiresAt).toLocaleDateString()}</div>
                        ) : (
                          <div>-</div>
                        )}
                      </td>
                      <td style={{ padding: "1rem", textAlign: "right" }}>
                        {inv.status === "pending" && inv.id ? (
                          <button
                            onClick={() => handleOpenRevoke(inv)}
                            className="btn"
                            style={{
                              padding: "0.35rem 0.65rem",
                              background: "rgba(239, 68, 68, 0.15)",
                              color: "#f87171",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              fontSize: "0.8rem",
                            }}
                          >
                            <Ban size={14} /> Revogar
                          </button>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>-</span>
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

      {/* Revoke Modal */}
      <ConfirmDeleteModal
        isOpen={isRevokeOpen}
        onClose={() => setIsRevokeOpen(false)}
        onConfirm={handleRevokeConfirm}
        title="Revogar Convite"
        itemName={revokingInvitation?.email || "este convite"}
        warningText="O convite deixará de ser válido imediatamente e o link de aceite deixará de funcionar."
        problem={actionProblem}
      />
      </main>
    </div>
  );
};
