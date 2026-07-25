import React, { useState, useEffect } from "react";
import type { ApiProblemDetails } from "../../../shared/api/types";
import { ProblemAlert } from "../../../shared/components/Alert";
import type { OrganizationInvitation, OrganizationRole, OrganizationUserLookup } from "../types";
import { organizationsApi } from "../api/organizationsApi";
import { isOk } from "../../../shared/result/result";
import { UserPlus, Loader2, X, Search, CheckCircle, MailWarning } from "lucide-react";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    email: string,
    role: OrganizationRole
  ) => Promise<{ success: boolean; invitation?: OrganizationInvitation | null }>;
  organizationId: string;
  assignableRoles: OrganizationRole[];
  problem: ApiProblemDetails | null;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  organizationId,
  assignableRoles,
  problem,
}) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrganizationRole>(assignableRoles[0] || "viewer");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // User Lookup state
  const [isSearching, setIsSearching] = useState(false);
  const [lookupUserResult, setLookupUserResult] = useState<OrganizationUserLookup | null>(null);
  const [userNotFound, setUserNotFound] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    if (assignableRoles.length > 0 && !assignableRoles.includes(role)) {
      setRole(assignableRoles[0]);
    }
  }, [assignableRoles, role]);

  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setLookupUserResult(null);
      setUserNotFound(false);
      setLookupError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLookup = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !organizationId) return;

    setIsSearching(true);
    setLookupError(null);
    setLookupUserResult(null);
    setUserNotFound(false);

    const res = await organizationsApi.lookupUser(organizationId, trimmedEmail);
    setIsSearching(false);

    if (isOk(res)) {
      setLookupUserResult(res.value);
    } else if (res.error.code === "organizations.user_not_found" || res.error.status === 404) {
      setUserNotFound(true);
    } else {
      setLookupError(res.error.detail || "Falha ao consultar usuário.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lookupUserResult && !lookupUserResult.canCurrentUserManageRole) {
      return;
    }

    setIsSubmitting(true);
    const result = await onSubmit(email.trim(), role);
    setIsSubmitting(false);

    if (result.success) {
      setEmail("");
      setLookupUserResult(null);
      setUserNotFound(false);
      onClose();
    }
  };

  const cannotManageUser = lookupUserResult !== null && !lookupUserResult.canCurrentUserManageRole;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "1rem",
      }}
    >
      <div className="glass-card animate-fade-in" style={{ maxWidth: "480px", width: "100%", padding: "1.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <UserPlus size={22} style={{ color: "var(--primary-500)" }} />
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Adicionar ou Convidar Membro</h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
          Informe o e-mail do usuário. Se ele já possuir uma conta na plataforma, a associação será imediata. Caso contrário, um convite será gerado.
        </p>

        <ProblemAlert problem={problem} />

        {lookupError && (
          <div className="alert alert-danger animate-fade-in" style={{ marginBottom: "1rem" }}>
            {lookupError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="member-email">
              E-mail do Usuário *
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                id="member-email"
                type="email"
                required
                className="input-field"
                placeholder="usuario@exemplo.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setLookupUserResult(null);
                  setUserNotFound(false);
                }}
                onBlur={handleLookup}
                disabled={isSubmitting}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleLookup}
                className="btn btn-secondary"
                disabled={isSubmitting || isSearching || !email.trim()}
                title="Consultar se o usuário já possui conta"
              >
                {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </button>
            </div>
          </div>

          {/* Lookup Result Indicator */}
          {lookupUserResult && (
            <div
              style={{
                padding: "0.75rem",
                borderRadius: "6px",
                marginBottom: "1rem",
                fontSize: "0.85rem",
                background: cannotManageUser ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
                border: `1px solid ${cannotManageUser ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                color: cannotManageUser ? "#f87171" : "#34d399",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {cannotManageUser ? (
                <>
                  <MailWarning size={18} />
                  <span>
                    Conta localizada: <strong>{lookupUserResult.name}</strong> ({lookupUserResult.email}). Você não possui permissão para gerenciá-la.
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  <span>
                    Conta localizada: <strong>{lookupUserResult.name}</strong> ({lookupUserResult.email}). Associação direta disponível.
                  </span>
                </>
              )}
            </div>
          )}

          {userNotFound && (
            <div
              style={{
                padding: "0.75rem",
                borderRadius: "6px",
                marginBottom: "1rem",
                fontSize: "0.85rem",
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                color: "#f59e0b",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <UserPlus size={18} />
              <span>Nenhuma conta localizada. Um convite de 7 dias será gerado.</span>
            </div>
          )}

          <div className="input-group">
            <label className="input-label" htmlFor="member-role">
              Papel na Organização (OrganizationRole) *
            </label>
            <select
              id="member-role"
              className="input-field"
              value={role}
              onChange={(e) => setRole(e.target.value as OrganizationRole)}
              disabled={isSubmitting || cannotManageUser}
              style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
            >
              {assignableRoles.map((r) => (
                <option key={r} value={r} style={{ background: "#0f172a", color: "#f8fafc" }}>
                  {r === "administrator" ? "Administrador (administrator)" : r === "creator" ? "Criador (creator)" : "Visualizador (viewer)"}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || cannotManageUser}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Processando...
                </>
              ) : userNotFound ? (
                "Enviar Convite"
              ) : lookupUserResult ? (
                "Adicionar Membro"
              ) : (
                "Adicionar / Convidar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
