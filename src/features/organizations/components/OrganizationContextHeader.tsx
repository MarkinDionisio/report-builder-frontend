import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Database, Users, Mail } from "lucide-react";
import { useAuth } from "../../auth/context/AuthContext";
import { canManageOrganization } from "../../../shared/utils/roles";
import { organizationsApi } from "../api/organizationsApi";
import { isErr } from "../../../shared/result/result";
import { SourceActionMenu } from "../../catalog/components/SourceActionMenu";
import type { Organization } from "../types";
import "../styles/organizationOverview.css";
import "../../catalog/styles/dataSourceWorkspace.css";

type Section = "sources" | "profiles" | "members" | "invitations" | "creator";
export function OrganizationContextHeader({ organizationId, organization, section, page }: { organizationId: string; organization?: Pick<Organization,"name"|"description"> | null; section: Section; page?: string }) {
  const { state } = useAuth();
  const user = state.status === "authenticated" ? state.user : null;
  const knownName = organization?.name || user?.organizations.find(item=>item.id===organizationId)?.name;
  const [resolved,setResolved] = useState<{id:string;name:string}|null>(null);
  const allowed = !!user && canManageOrganization(user,organizationId);
  useEffect(()=>{
    let active=true;
    if(!knownName && allowed) void organizationsApi.list().then(result=>{
      if(active&&!isErr(result)){const found=result.value.find(item=>item.id===organizationId);if(found)setResolved({id:organizationId,name:found.name});}
    }).catch(()=>{});
    return()=>{active=false;};
  },[organizationId,knownName,allowed]);
  const name=knownName || (resolved?.id===organizationId?resolved.name:"Organização");
  const base="/organizations/"+organizationId;
  return <><nav className="source-breadcrumb" aria-label="Caminho da organização"><Link to="/organizations">Organizações</Link><span aria-hidden="true">›</span>{page?<><Link to={base}>{name}</Link><span aria-hidden="true">›</span><span>{page}</span></>:<span>{name}</span>}</nav>
    <header className="organization-overview__header"><div className="organization-overview__identity"><span className="organization-overview__icon"><Building2 size={24} aria-hidden="true"/></span><div><p className="organization-overview__eyebrow">Organização selecionada</p><h1>{name}</h1>{organization?.description&&<p className="organization-overview__description">{organization.description}</p>}</div></div>{allowed && <SourceActionMenu label="Membros e convites"><Link aria-current={section==="members"?"page":undefined} to={base+"/members"}><Users size={17} aria-hidden="true"/>Gerenciar membros</Link><Link aria-current={section==="invitations"?"page":undefined} to={base+"/invitations"}><Mail size={17} aria-hidden="true"/>Gerenciar convites</Link></SourceActionMenu>}</header>
    {allowed && <nav className="organization-overview__nav" aria-label="Recursos da organização"><Link aria-current={section==="sources"?"page":undefined} to={base+"?tab=datasources"}><Database size={18} aria-hidden="true"/>Fontes de dados</Link><Link aria-current={section==="profiles"?"page":undefined} to={base+"?tab=profiles"}><Users size={18} aria-hidden="true"/>Profiles de acesso</Link></nav>}
  </>;
}
