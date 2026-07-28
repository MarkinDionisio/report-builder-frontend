import React from "react";
import { useAuth } from "../../auth/context/AuthContext";
import { Navbar } from "../../../shared/components/Navbar";
import { User, Building2, Shield, Layers, Key, Activity, Users } from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { state } = useAuth();

  if (state.status !== "authenticated" || !state.user) {
    return null;
  }

  const user = state.user;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "root":
        return { bg: "rgba(239, 68, 68, 0.1)", text: "#f87171", border: "rgba(239, 68, 68, 0.2)" };
      case "administrator":
        return { bg: "rgba(168, 85, 247, 0.1)", text: "#c084fc", border: "rgba(168, 85, 247, 0.2)" };
      case "creator":
        return { bg: "rgba(59, 130, 246, 0.1)", text: "#60a5fa", border: "rgba(59, 130, 246, 0.2)" };
      default:
        return { bg: "rgba(16, 185, 129, 0.1)", text: "#34d399", border: "rgba(16, 185, 129, 0.2)" };
    }
  };

  const badge = getRoleBadgeColor(user.globalRole);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />

      {/* Main Content Body */}
      <main style={{ maxWidth: "1200px", width: "100%", margin: "2rem auto", padding: "0 1.5rem", flex: 1 }}>
        
        {/* Welcome Banner */}
        <div className="glass-card animate-fade-in" style={{ marginBottom: "2rem", padding: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: "4px solid var(--primary-500)", flexWrap: "wrap", gap: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>Bem-vindo ao Report Builder</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Sessão autenticada via <code style={{ color: "var(--primary-500)", background: "rgba(59, 130, 246, 0.1)", padding: "0.2rem 0.4rem", borderRadius: "4px" }}>GET /api/v1/me</code>
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.4rem" }}>
              Nível de Acesso Global
            </span>
            <span
              style={{
                display: "inline-block",
                padding: "0.35rem 0.85rem",
                borderRadius: "9999px",
                fontSize: "0.85rem",
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

        {/* Quick Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          <div className="glass-card animate-fade-in" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem", animationDelay: "0.1s" }}>
            <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: "0.85rem", borderRadius: "12px", color: "var(--primary-500)" }}>
              <Building2 size={24} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.2 }}>{user.organizations?.length || 0}</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Organizações</div>
            </div>
          </div>
          <div className="glass-card animate-fade-in" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem", animationDelay: "0.15s" }}>
            <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "0.85rem", borderRadius: "12px", color: "#10b981" }}>
              <Users size={24} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.2 }}>{user.profileIds?.length || 0}</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Perfis Associados</div>
            </div>
          </div>
          <div className="glass-card animate-fade-in" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem", animationDelay: "0.2s" }}>
            <div style={{ background: "rgba(245, 158, 11, 0.1)", padding: "0.85rem", borderRadius: "12px", color: "#f59e0b" }}>
              <Activity size={24} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.2 }}>Ativo</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Status da Sessão</div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "1.5rem" }}>
          
          {/* Main Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* Organizations Card */}
            <div className="glass-card animate-fade-in" style={{ padding: "2rem", animationDelay: "0.25s", height: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <Building2 size={20} style={{ color: "var(--text-muted)" }} />
                <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Minhas Organizações</h2>
              </div>
              
              {user.organizations && user.organizations.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {user.organizations.map((org) => (
                    <div
                      key={org.id}
                      style={{
                        background: "var(--bg-input)",
                        border: "1px solid var(--border-color)",
                        padding: "1rem 1.25rem",
                        borderRadius: "var(--radius-md)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "border-color 0.15s ease"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{org.name}</div>
                        <div style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                          ID: {org.id.slice(0, 8)}...
                        </div>
                      </div>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", background: "rgba(255,255,255,0.05)", padding: "0.3rem 0.6rem", borderRadius: "4px" }}>
                        Papel: <strong style={{ color: "var(--text-primary)" }}>{org.organizationRole}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  Você ainda não está associado a nenhuma organização.
                </div>
              )}
            </div>

          </div>

          {/* Sidebar Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* User Profile Summary */}
            <div className="glass-card animate-fade-in" style={{ padding: "2rem", animationDelay: "0.3s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <User size={20} style={{ color: "var(--text-muted)" }} />
                <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Detalhes do Perfil</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    ID do Usuário
                  </span>
                  <div style={{ fontFamily: "monospace", fontSize: "0.85rem", background: "var(--bg-input)", border: "1px solid var(--border-color)", padding: "0.6rem 0.8rem", borderRadius: "6px", marginTop: "0.35rem", wordBreak: "break-all", color: "var(--text-primary)" }}>
                    {user.id}
                  </div>
                </div>
              </div>
            </div>

            {/* Security Card */}
            <div className="glass-card animate-fade-in" style={{ padding: "2rem", animationDelay: "0.35s", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <Shield size={20} style={{ color: "var(--text-muted)" }} />
                <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Segurança & Sessão</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
                  <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "0.5rem", borderRadius: "8px", color: "#10b981", flexShrink: 0 }}>
                    <Key size={16} />
                  </div>
                  <div>
                    <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: "0.2rem" }}>Access Token em Memória</strong>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.4 }}>Mantido estritamente em memória JS. Renovado a cada requisição.</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
                  <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: "0.5rem", borderRadius: "8px", color: "var(--primary-500)", flexShrink: 0 }}>
                    <Layers size={16} />
                  </div>
                  <div>
                    <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: "0.2rem" }}>Refresh Token Rotativo</strong>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.4 }}>Armazenado no navegador de forma segura e rotacionado a cada uso.</span>
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
