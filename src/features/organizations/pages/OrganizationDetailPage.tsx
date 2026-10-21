import { OrganizationContextHeader } from "../components/OrganizationContextHeader";
import { useEffect, useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { organizationsApi } from "../api/organizationsApi";
import type { Organization } from "../types";
import { canManageOrganization } from "../../../shared/utils/roles";
import { Navbar } from "../../../shared/components/Navbar";
import { OrganizationDataSources } from "../../catalog/components/OrganizationDataSources";
import { OrganizationProfilesPage } from "../../catalog/pages/OrganizationProfilesPage";
import { isErr } from "../../../shared/result/result";
import "../styles/organizationOverview.css";

export function OrganizationDetailPage() {
  const { organizationId = "" } = useParams();
  const [params] = useSearchParams();
  const { state } = useAuth();
  const user = state.status === "authenticated" ? state.user : null;
  const allowed = !!user && canManageOrganization(user, organizationId);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const profiles = params.get("tab") === "profiles";
  useEffect(() => {
    let active = true;
    setOrganization(null); setError("");
    if (allowed) void organizationsApi.list().then(result => {
      if (!active) return;
      if (isErr(result)) setError(result.error.detail || "Não foi possível consultar a organização.");
      else {
        const found = result.value.find(item => item.id === organizationId);
        if (found) setOrganization(found);
        else setError("Organização não encontrada ou acesso negado.");
      }
    }).catch(() => { if (active) setError("Falha de comunicação ao consultar a organização."); });
    return () => { active = false; };
  }, [organizationId, allowed, version]);
  if (allowed && params.get("ds")) return <Navigate replace to={"/organizations/" + organizationId + "/data-sources/" + encodeURIComponent(params.get("ds")!)} />;
  return <><Navbar /><main className="container source-workspace organization-overview">
    {!allowed ? <p role="alert" className="source-notice">Acesso negado.</p> : error ? <div role="alert" className="source-notice source-error">{error} <button className="btn btn-secondary" onClick={()=>setVersion(v=>v+1)}>Tentar novamente</button></div> : !organization ? <p role="status">Consultando organização…</p> : <>
      <OrganizationContextHeader organizationId={organizationId} organization={organization} section={profiles?"profiles":"sources"}/>
      <div className="organization-overview__content">{profiles?<OrganizationProfilesPage embedded/>:<OrganizationDataSources organizationId={organizationId} isRoot={user?.globalRole==="root"}/>}</div>
    </>}
  </main></>;
}
