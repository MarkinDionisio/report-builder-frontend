import React, { useState } from "react";
import type { OrganizationInvitation } from "../types";
import { CheckCircle2, Copy, Check, ShieldAlert, X } from "lucide-react";

interface InvitationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitation: OrganizationInvitation | null;
}

export const InvitationSuccessModal: React.FC<InvitationSuccessModalProps> = ({
  isOpen,
  onClose,
  invitation,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !invitation) return null;

  const fullAcceptanceUrl = invitation.acceptanceUrl
    ? invitation.acceptanceUrl.startsWith("http")
      ? invitation.acceptanceUrl
      : `${window.location.origin}${invitation.acceptanceUrl.startsWith("/") ? "" : "/"}${invitation.acceptanceUrl}`
    : `${window.location.origin}/invitations/accept?token=${invitation.acceptanceToken || ""}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullAcceptanceUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 120,
        padding: "1rem",
      }}
    >
      <div className="glass-card animate-fade-in" style={{ maxWidth: "520px", padding: "1.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "#10b981" }}>
            <CheckCircle2 size={26} />
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Convite Pendente Gerado!
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
          Um convite pendente foi criado para <strong style={{ color: "var(--text-primary)" }}>{invitation.email}</strong> na organização <strong style={{ color: "var(--text-primary)" }}>{invitation.organizationName}</strong>.
        </p>

        {/* Warning Callout */}
        <div
          style={{
            background: "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: "var(--radius-md)",
            padding: "0.85rem 1rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            marginBottom: "1.25rem",
          }}
        >
          <ShieldAlert size={20} style={{ color: "#f59e0b", flexShrink: 0, marginTop: "0.1rem" }} />
          <div style={{ fontSize: "0.825rem", color: "#fcd34d" }}>
            <strong>Atenção:</strong> O token de aceite é retornado apenas nesta resposta e <u>não poderá ser recuperado</u> posteriormente pela listagem de convites. Copie o link abaixo para enviá-lo ao usuário!
          </div>
        </div>

        {/* Acceptance URL Input & Copy Button */}
        <div className="input-group">
          <label className="input-label">Link de Aceite do Convite</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              readOnly
              className="input-field"
              value={fullAcceptanceUrl}
              style={{ fontFamily: "monospace", fontSize: "0.825rem" }}
            />
            <button
              onClick={handleCopy}
              className="btn btn-primary"
              style={{ padding: "0.75rem 1rem", flexShrink: 0 }}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              <span>{copied ? "Copiado!" : "Copiar"}</span>
            </button>
          </div>
        </div>

        {invitation.acceptanceToken && (
          <div style={{ marginTop: "0.75rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Token de Aceite Bruto
            </span>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "0.8rem",
                background: "rgba(0,0,0,0.3)",
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                marginTop: "0.25rem",
                wordBreak: "break-all",
              }}
            >
              {invitation.acceptanceToken}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
          <button onClick={onClose} className="btn btn-secondary">
            Entendido e Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
