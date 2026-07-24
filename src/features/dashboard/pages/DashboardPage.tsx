import React from "react";
import { useAuth } from "../../auth/context/AuthContext";
import { Navbar } from "../../../shared/components/Navbar";
import { User, Building2, Shield, Layers, Key } from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { state } = useAuth();

  if (state.status !== "authenticated" || !state.user) {
    return null;
  }

  const user = state.user;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "root":
        return { bg: "rgba(239, 68, 68, 0.15)", text: "#f87171", border: "rgba(239, 68, 68, 0.3)" };
      case "administrator":
        return { bg: "rgba(168, 85, 247, 0.15)", text: "#c084fc", border: "rgba(168, 85, 247, 0.3)" };
      case "creator":
        return { bg: "rgba(99, 102, 241, 0.15)", text: "#818cf8", border: "rgba(99, 102, 241, 0.3)" };
      default:
        return { bg: "rgba(16, 185, 129, 0.15)", text: "#34d399", border: "rgba(16, 185, 129, 0.3)" };
    }
  };

  const badge = getRoleBadgeColor(user.globalRole);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />

      {/* Main Content Body */}
      <main style={{ maxWidth: "1200px", width: "100%", margin: "1.5rem auto", padding: "0 1rem", flex: 1 }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Painel do Usuário</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Sessão autenticada via <code style={{ color: "var(--primary-500)" }}>GET /api/v1/me</code>
          </p>
        </div>

        <div className="dashboard-grid">
          {/* User Profile Card */}
          <div className="glass-card animate-fade-in" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <User size={22} style={{ color: "var(--primary-500)" }} />
              <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>Perfil do Usuário</h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  ID do Usuário (UUID)
                </span>
                <div style={{ fontFamily: "monospace", fontSize: "0.85rem", background: "rgba(0,0,0,0.2)", padding: "0.4rem 0.6rem", borderRadius: "6px", marginTop: "0.2rem", wordBreak: "break-all" }}>
                  {user.id}
                </div>
              </div>

              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Papel Global (GlobalRole)
                </span>
                <div style={{ marginTop: "0.25rem" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "9999px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      backgroundColor: badge.bg,
                      color: badge.text,
                      border: `1px solid ${badge.border}`,
                      textTransform: "capitalize",
                    }}
                  >
                    {user.globalRole}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Perfis Associados (Profile IDs)
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.3rem" }}>
                  {user.profileIds && user.profileIds.length > 0 ? (
                    user.profileIds.map((pid) => (
                      <span
                        key={pid}
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.8rem",
                          fontFamily: "monospace",
                        }}
                      >
                        {pid}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Nenhum perfil específico</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Organizations Card */}
          <div className="glass-card animate-fade-in" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <Building2 size={22} style={{ color: "var(--primary-500)" }} />
              <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>Organizações</h2>
            </div>

            {user.organizations && user.organizations.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {user.organizations.map((org) => (
                  <div
                    key={org.id}
                    style={{
                      background: "rgba(15, 23, 42, 0.5)",
                      border: "1px solid var(--border-color)",
                      padding: "1rem",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{org.name}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.4rem" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        Função: <strong style={{ color: "var(--text-primary)" }}>{org.organizationRole}</strong>
                      </span>
                      <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        ID: {org.id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Você ainda não está associado a nenhuma organização.
              </div>
            )}
          </div>

          {/* Security & Token Info Card */}
          <div className="glass-card animate-fade-in" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <Shield size={22} style={{ color: "var(--primary-500)" }} />
              <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>Segurança & Sessão</h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                <Key size={18} style={{ color: "#10b981", marginTop: "0.1rem", flexShrink: 0 }} />
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>Access Token em Memória:</strong>
                  <div>
                    Mantido estritamente em memória JS (não salvo no localStorage). Renovado automaticamente a cada requisição.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                <Layers size={18} style={{ color: "#6366f1", marginTop: "0.1rem", flexShrink: 0 }} />
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>Refresh Token Rotativo:</strong>
                  <div>
                    Armazenado em <code>localStorage</code> sob a chave <code>report-builder.session.v1</code>. Rotacionado a cada uso.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
