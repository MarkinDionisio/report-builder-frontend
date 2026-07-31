import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { Navbar } from "../../../shared/components/Navbar";
import { Alert } from "../../../shared/components/Alert";
import { Building2, ArrowRight, Loader2 } from "lucide-react";
import { organizationsApi } from "../../organizations/api/organizationsApi";
import type { Organization } from "../../organizations/types";
import { isErr } from "../../../shared/result/result";

export const CreatorWorkspacePage: React.FC = () => {
  const { state } = useAuth();
  const navigate = useNavigate();
  const user = state.status === "authenticated" ? state.user : null;

  const [loading, setLoading] = useState(true);
  const [allowedOrgs, setAllowedOrgs] = useState<(Organization & { roleLabel?: string })[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchOrgs = async () => {
      const isGlobal = ["root", "administrator", "creator"].includes(user.globalRole);

      if (isGlobal) {
        // Fetch all organizations
        const res = await organizationsApi.list();
        if (isErr(res)) {
          setErrorMsg(res.error.detail || "Erro ao buscar organizações.");
        } else {
          setAllowedOrgs(res.value.map(org => ({ ...org, roleLabel: user.globalRole })));
        }
      } else {
        // Filter from user memberships
        const eligible = user.organizations.filter(
          org => org.organizationRole === "administrator" || org.organizationRole === "creator"
        );
        // Map to Organization-like shape
        setAllowedOrgs(eligible.map(org => ({ 
          id: org.id, 
          name: org.name, 
          description: "", 
          roleLabel: org.organizationRole 
        } as Organization & { roleLabel?: string })));
      }
      setLoading(false);
    };

    fetchOrgs();
  }, [user]);

  useEffect(() => {
    if (!loading && allowedOrgs.length === 1 && !errorMsg) {
      // Auto redirect if there's exactly one eligible org
      navigate(`/organizations/${allowedOrgs[0].id}/creator`, { replace: true });
    }
  }, [loading, allowedOrgs, navigate, errorMsg]);

  if (!user) return null;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Navbar />
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Loader2 size={36} className="animate-spin" style={{ color: "var(--primary-500)" }} />
        </div>
      </div>
    );
  }

  if (errorMsg || allowedOrgs.length === 0) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Navbar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <Alert type="error" message={errorMsg || "Você não possui permissão para acessar o workspace de criação em nenhuma organização."} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ maxWidth: "1200px", width: "100%", margin: "2rem auto", padding: "0 1.5rem", flex: 1 }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.25rem 0", color: "var(--text-color)" }}>
            Workspace do Creator
          </h1>
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>
            Selecione uma organização para gerenciar relatórios e dashboards.
          </p>
        </div>

        <div className="dashboard-grid">
          {allowedOrgs.map((org) => (
            <Link
              key={org.id}
              to={`/organizations/${org.id}/creator`}
              className="glass-card animate-fade-in"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none", color: "inherit", padding: "1.5rem" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    background: "rgba(99, 102, 241, 0.1)",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--primary-500)",
                  }}
                >
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>{org.name}</h3>
                  <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em" }}>
                    {org.roleLabel}
                  </span>
                </div>
              </div>
              <ArrowRight style={{ color: "var(--text-muted)" }} />
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};
