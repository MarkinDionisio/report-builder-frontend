import { ReportBrowser } from "../../creator/components/ReportBrowser";


import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, FileBarChart, PenTool, ShieldCheck } from "lucide-react";
import { useAuth } from "../../auth/context/AuthContext";



import { Navbar } from "../../../shared/components/Navbar";
import { getUserCapabilities } from "../../../shared/utils/capabilities";
import { canManageOrganization, getGlobalRoleLabel, getOrganizationRoleLabel } from "../../../shared/utils/roles";

export const DashboardPage: React.FC = () => {
  const { state } = useAuth();
  const [reportCount, setReportCount] = useState<number | null>(null);
  if (state.status !== "authenticated" || !state.user) return null;

  const user = state.user;
  const capabilities = getUserCapabilities(user);
  return <div className="app-page"><Navbar/><main className="page-container dashboard-home">
    <header className="dashboard-hero"><div><span className="dashboard-hero__eyebrow">Visão geral</span><h1>Bem-vindo ao Report Builder</h1><p>Olá, {user.name.split(" ")[0]}. Acesse seus relatórios e continue seu trabalho.</p></div><span className="dashboard-role"><ShieldCheck size={16}/>{getGlobalRoleLabel(user.globalRole)}</span></header>
    <section className="dashboard-stats" aria-label="Resumo da conta">
      <article className="dashboard-stat"><span><FileBarChart size={20}/></span><div><strong>{reportCount ?? "—"}</strong><small>Relatórios disponíveis</small></div></article>
      {capabilities.canViewOrganizations && <article className="dashboard-stat"><span><Building2 size={20}/></span><div><strong>{user.organizations.length}</strong><small>Organizações vinculadas</small></div></article>}
      {capabilities.canOpenCreatorWorkspace && <Link className="dashboard-stat dashboard-stat--action" to="/creator"><span><PenTool size={20}/></span><div><strong>Área de criação</strong><small>Criar e organizar relatórios</small></div><ArrowRight size={18}/></Link>}
    </section>
    <div className="dashboard-layout"><section className="dashboard-section"><div className="dashboard-section__header"><div><span>Seu trabalho</span><h2>Relatórios disponíveis</h2></div>{capabilities.canOpenCreatorWorkspace && <Link to="/creator">Ver todos <ArrowRight size={15}/></Link>}</div>
      <ReportBrowser onTotal={setReportCount}/>
    </section>
    {capabilities.canViewOrganizations && <aside className="dashboard-section dashboard-organizations"><div className="dashboard-section__header"><div><span>Contexto</span><h2>Organizações</h2></div><Link to="/organizations" aria-label="Ver organizações"><ArrowRight size={17}/></Link></div>{user.organizations.length === 0 ? <div className="empty-state"><Building2 size={34}/><p>Você ainda não possui uma organização vinculada.</p></div> : <div className="organization-compact-list">{user.organizations.slice(0, 6).map((organization) => canManageOrganization(user, organization.id) ? <Link key={organization.id} to={`/organizations/${organization.id}`}><span>{organization.name.slice(0, 1).toUpperCase()}</span><div><strong>{organization.name}</strong><small>{getOrganizationRoleLabel(organization.organizationRole)}</small></div><ArrowRight size={15}/></Link> : <div className="organization-compact-item" key={organization.id}><span>{organization.name.slice(0, 1).toUpperCase()}</span><div><strong>{organization.name}</strong><small>{getOrganizationRoleLabel(organization.organizationRole)}</small></div></div>)}</div>}</aside>}
    </div>
  </main></div>;
};
