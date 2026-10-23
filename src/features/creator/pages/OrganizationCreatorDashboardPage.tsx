import { ReportBrowser } from "../components/ReportBrowser";
import { ReportTagManager } from "../components/ReportTagManager";
import { canManageOrganization } from "../../../shared/utils/roles";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { OrganizationContextHeader } from "../../organizations/components/OrganizationContextHeader";
import React, { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { creatorApi } from "../../creator/api/creatorApi";
import { isErr } from "../../../shared/result/result";
import { Navbar } from "../../../shared/components/Navbar";
import { Alert } from "../../../shared/components/Alert";
import { Plus, FileBarChart, LayoutDashboard, Settings } from "lucide-react";
import { useAuth } from "../../auth/context/AuthContext";
import { canOpenCreatorWorkspace } from "../../auth/utils/authUtils";
import type { DashboardListItem } from "../../creator/types/creatorTypes";


export const OrganizationCreatorDashboardPage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { state } = useAuth();
  
  const [params,setParams]=useSearchParams();
  const activeTab=params.get("tab")==="dashboards"?"dashboards":"reports";
  const setActiveTab=(tab:string)=>{const next=new URLSearchParams(params);next.set("tab",tab);setParams(next);};
  const [version,setVersion]=useState(0);
  
  const [reportCount, setReportCount] = useState(0);
  const [showTags, setShowTags] = useState(false);
  const [dashboards, setDashboards] = useState<DashboardListItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAllowed = canOpenCreatorWorkspace(state.user, organizationId || "");

  useEffect(() => {
    if (!organizationId || !isAllowed) return;

    let active=true;
    const fetchData = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        // Fetch Dashboards
        const dashRes = await creatorApi.listDashboards(1, 100);
        if(!active)return;
        if (isErr(dashRes)) {
          setErrorMsg(dashRes.error.detail || "Erro ao carregar dashboards.");
        } else {
          setDashboards(dashRes.value.data.filter(d => d.organizationId === organizationId));
        }
      } catch {
        if(active)setErrorMsg("Erro inesperado ao carregar dados do workspace.");
      } finally {
        if(active)setLoading(false);
      }
    };

    void fetchData();
    return()=>{active=false;};
  }, [organizationId, isAllowed, version]);

  if (!isAllowed) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Navbar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <Alert type="error" message="Acesso negado à área de criação desta organização." />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      

      <header className="creator-workspace-header" style={{ background: "var(--surface-color)", borderBottom: "1px solid var(--border-color)", padding: "2rem 1.5rem 0 1.5rem" }}>
        <div style={{ maxWidth: "1440px", margin: "0 auto" }}>
          <OrganizationContextHeader organizationId={organizationId||""} section="creator" page="Área de criação"/>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
            <div>
              <h2 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.25rem 0" }}>Área de criação</h2>
              <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>Gerencie relatórios e dashboards desta organização</p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {activeTab === "reports" && state.user && canManageOrganization(state.user, organizationId || "") && <button className="btn btn-secondary" onClick={() => setShowTags(true)}>Gerenciar etiquetas</button>}
              {activeTab === "reports" && isAllowed && <Link className="btn btn-secondary" to={`/organizations/${organizationId}/creator/global-reports`}>Catálogo de relatórios globais</Link>}
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
              <FileBarChart size={18} /> Relatórios ({reportCount})
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

      <main className="creator-workspace-main admin-page">
        {errorMsg && (
          <div style={{ marginBottom: "1.5rem" }}>
            <Alert type="error" message={errorMsg} /><button className="btn btn-secondary" onClick={()=>setVersion(value=>value+1)}>Consultar novamente</button>
          </div>
        )}

        {activeTab === "reports" ? (
          <ReportBrowser organizationId={organizationId} onTotal={setReportCount} version={version}/>
        ) : loading ? (
          <NeutralLoader message="Consultando relatórios e dashboards desta organização…"/>

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
                          className="btn-icon"
                          aria-label={`Editar dashboard ${dash.title}`}
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
      {showTags && organizationId && <ReportTagManager organizationId={organizationId} onClose={() => setShowTags(false)} onChanged={() => setVersion(value => value + 1)}/>}
    </div>
  );
};
