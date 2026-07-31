import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { creatorApi } from "../../creator/api/creatorApi";
import { isErr } from "../../../shared/result/result";
import { Navbar } from "../../../shared/components/Navbar";
import { Alert } from "../../../shared/components/Alert";
import { Loader2, Plus, FileBarChart, LayoutDashboard, Settings } from "lucide-react";
import { useAuth } from "../../auth/context/AuthContext";
import { canOpenCreatorWorkspace } from "../../auth/utils/authUtils";
import type { ReportListItem, DashboardListItem } from "../../creator/types/creatorTypes";

export const OrganizationCreatorDashboardPage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { state } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"reports" | "dashboards">("reports");
  
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [dashboards, setDashboards] = useState<DashboardListItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAllowed = canOpenCreatorWorkspace(state.user, organizationId || "");

  useEffect(() => {
    if (!organizationId || !isAllowed) return;

    const fetchData = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        // Fetch Reports
        const reportsRes = await creatorApi.listReports(1, 100);
        if (isErr(reportsRes)) {
          setErrorMsg(reportsRes.error.detail || "Erro ao carregar relatórios.");
        } else {
          // Temporarily filter by org locally since listReports doesn't take orgId in query
          // In a real scenario we'd pass orgId to the API if it's supported, but the guide
          // says list endpoints return paginated results, we filter by organizationId.
          setReports(reportsRes.value.data.filter(r => r.organizationId === organizationId));
        }

        // Fetch Dashboards
        const dashRes = await creatorApi.listDashboards(1, 100);
        if (isErr(dashRes)) {
          if (!errorMsg) setErrorMsg(dashRes.error.detail || "Erro ao carregar dashboards.");
        } else {
          setDashboards(dashRes.value.data.filter(d => d.organizationId === organizationId));
        }
      } catch (err) {
        setErrorMsg("Erro inesperado ao carregar dados do workspace.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organizationId, isAllowed, errorMsg]);

  if (!isAllowed) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Navbar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <Alert type="error" message="Acesso negado ao Workspace nesta organização." />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      
      <header style={{ background: "var(--surface-color)", borderBottom: "1px solid var(--border-color)", padding: "2rem 1.5rem 0 1.5rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.25rem 0" }}>Workspace do Creator</h1>
              <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>Gerencie relatórios e dashboards desta organização</p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {activeTab === "reports" ? (
                <Link
                  to={`/organizations/${organizationId}/creator/reports/new`}
                  className="btn btn-primary"
                >
                  <Plus size={16} /> Novo Relatório
                </Link>
              ) : (
                <Link
                  to={`/organizations/${organizationId}/creator/dashboards/new`}
                  className="btn btn-primary"
                >
                  <Plus size={16} /> Novo Dashboard
                </Link>
              )}
            </div>
          </div>
          
          {/* Tabs */}
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={() => setActiveTab("reports")}
              className={`btn ${activeTab === "reports" ? "btn-primary" : "btn-secondary"}`}
              style={{ borderRadius: "8px 8px 0 0", borderBottom: "none", padding: "0.75rem 1.25rem" }}
            >
              <FileBarChart size={18} /> Relatórios ({reports.length})
            </button>
            <button
              onClick={() => setActiveTab("dashboards")}
              className={`btn ${activeTab === "dashboards" ? "btn-primary" : "btn-secondary"}`}
              style={{ borderRadius: "8px 8px 0 0", borderBottom: "none", padding: "0.75rem 1.25rem" }}
            >
              <LayoutDashboard size={18} /> Dashboards ({dashboards.length})
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: "1200px", width: "100%", margin: "2rem auto", padding: "0 1.5rem", flex: 1 }}>
        {errorMsg && (
          <div style={{ marginBottom: "1.5rem" }}>
            <Alert type="error" message={errorMsg} />
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 0", color: "var(--text-secondary)" }}>
            <Loader2 size={36} className="animate-spin" style={{ color: "var(--primary-500)", marginBottom: "1rem" }} />
            <p>Carregando workspace...</p>
          </div>
        ) : activeTab === "reports" ? (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {reports.length === 0 ? (
              <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                <FileBarChart size={48} style={{ opacity: 0.2, margin: "0 auto 1rem auto" }} />
                <p>Nenhum relatório encontrado nesta organização.</p>
              </div>
            ) : (
              <table className="table" style={{ width: "100%", margin: 0 }}>
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Visibilidade</th>
                    <th>Meu Papel</th>
                    <th>Criação</th>
                    <th style={{ textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td><strong>{report.title}</strong></td>
                      <td>
                        <span className="badge badge-info">
                          {report.visibilityScope === "private" ? "Privado" : report.visibilityScope === "organization" ? "Organização" : report.visibilityScope === "global" ? "Global" : report.visibilityScope}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        {report.myRole === "root" ? "Administrador (Root)" : report.myRole === "administrator" ? "Administrador" : report.myRole === "creator" ? "Criador" : report.myRole === "viewer" ? "Leitor" : report.myRole}
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        {new Date(report.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link
                          to={`/organizations/${organizationId}/creator/reports/${report.id}`}
                          className="btn btn-secondary"
                          style={{ padding: "0.35rem 0.5rem" }}
                          title="Editar Relatório"
                        >
                          <Settings size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {dashboards.length === 0 ? (
              <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                <LayoutDashboard size={48} style={{ opacity: 0.2, margin: "0 auto 1rem auto" }} />
                <p>Nenhum dashboard encontrado nesta organização.</p>
              </div>
            ) : (
              <table className="table" style={{ width: "100%", margin: 0 }}>
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Visibilidade</th>
                    <th>Relatórios</th>
                    <th style={{ textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboards.map((dash) => (
                    <tr key={dash.id}>
                      <td><strong>{dash.title}</strong></td>
                      <td>
                        <span className="badge badge-info">
                          {dash.visibilityScope}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{dash.reportCount} itens</td>
                      <td style={{ textAlign: "right" }}>
                        <Link
                          to={`/organizations/${organizationId}/creator/dashboards/${dash.id}`}
                          className="btn btn-secondary"
                          style={{ padding: "0.35rem 0.5rem" }}
                          title="Editar Dashboard"
                        >
                          <Settings size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
