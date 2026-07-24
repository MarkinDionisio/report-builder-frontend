import React, { useState } from "react";
import type { ApiProblemDetails } from "../../../shared/api/types";
import { ProblemAlert } from "../../../shared/components/Alert";
import type { OrganizationInvitation, OrganizationRole } from "../types";
import { UserPlus, Loader2, X } from "lucide-react";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    email: string,
    role: OrganizationRole
  ) => Promise<{ success: boolean; invitation?: OrganizationInvitation | null }>;
  assignableRoles: OrganizationRole[];
  problem: ApiProblemDetails | null;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  assignableRoles,
  problem,
}) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrganizationRole>(assignableRoles[0] || "viewer");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await onSubmit(email.trim(), role);
    setIsSubmitting(false);
    if (result.success) {
      setEmail("");
      onClose();
    }
  };

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
      <div className="glass-card animate-fade-in" style={{ maxWidth: "480px", padding: "1.75rem" }}>
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

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="member-email">
              E-mail do Usuário *
            </label>
            <input
              id="member-email"
              type="email"
              required
              className="input-field"
              placeholder="usuario@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="member-role">
              Papel na Organização (OrganizationRole) *
            </label>
            <select
              id="member-role"
              className="input-field"
              value={role}
              onChange={(e) => setRole(e.target.value as OrganizationRole)}
              disabled={isSubmitting}
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
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Processando...
                </>
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
