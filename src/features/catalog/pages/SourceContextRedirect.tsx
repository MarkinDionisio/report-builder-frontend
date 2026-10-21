import { useEffect, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { organizationsApi } from "../../organizations/api/organizationsApi";
import { catalogApi } from "../api/catalogApi";
import type { DataSource } from "../types/catalogTypes";
import type { Organization } from "../../organizations/types";
import { isErr } from "../../../shared/result/result";
import { Navbar } from "../../../shared/components/Navbar";
import { Navigate } from "react-router-dom";
import "../styles/dataSourceWorkspace.css";
export function SourceContextRedirect() {
    const { schemaId: routeSchemaId } = useParams();
    const [params] = useSearchParams();
    const schemaId = routeSchemaId || params.get("schemaId") || undefined;
    const { pathname } = useLocation();
    const { state } = useAuth();
    const root = state.status === "authenticated" && state.user.globalRole === "root";
    const [orgs, setOrgs] = useState<Organization[]>([]), [sources, setSources] = useState<DataSource[]>([]), [org, setOrg] = useState(params.get("organizationId") || ""), [target, setTarget] = useState(""), [error, setError] = useState(""), [loading, setLoading] = useState(true);
    const step = pathname.includes("report-schemas") ? "fields" : "connection";
    const library = pathname.includes("catalog-templates") ? "catalog" : pathname.includes("report-join-templates") ? "relationships" : "";
    function path(s: DataSource, table?: string) { return "/organizations/" + s.organizationId + "/data-sources/" + encodeURIComponent(s.id) + "?" + new URLSearchParams({ step, ...(table ? { schemaId: table } : {}), ...(library ? { library } : {}) }); }
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");
        setTarget("");
        void (async () => {
            try {
                const [o, d] = await Promise.all([organizationsApi.list(), catalogApi.listDataSources()]);
                if (!active)
                    return;
                if (isErr(o) || isErr(d)) {
                    setError("Não foi possível localizar a organização e a fonte. Abra Organizações para continuar.");
                    return;
                }
                setOrgs(o.value);
                setSources(d.value);
                let sourceId = params.get("dataSourceId") || params.get("ds") || "";
                if (schemaId) {
                    const s = await catalogApi.listReportSchemas();
                    if (!active)
                        return;
                    if (isErr(s)) {
                        setError("Não foi possível localizar a tabela.");
                        return;
                    }
                    const t = s.value.find(t => t.id === schemaId);
                    if (!t) {
                        setError("Tabela não encontrada.");
                        return;
                    }
                    sourceId = t.dataSourceId;
                }
                if (sourceId) {
                    const source = d.value.find(s => s.id === sourceId && (!params.get("organizationId") || s.organizationId === params.get("organizationId")));
                    if (source)
                        setTarget(path(source, schemaId));
                    else
                        setError("Fonte não encontrada nesta organização.");
                }
            }
            catch {
                if (active)
                    setError("Falha de comunicação ao localizar a fonte.");
            }
            finally {
                if (active)
                    setLoading(false);
            }
        })();
        return () => { active = false; };
        // Re-resolve links when browser navigation changes their context.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, params.toString(), schemaId]);
    if (target)
        return <Navigate to={target} replace/>;
    return <><Navbar /><main className="container source-workspace"><h1>Escolher organização e fonte</h1><p>A configuração agora fica em Organização → Fontes de dados → Fonte escolhida.</p>{!root ? <p role="alert">Acesso negado.</p> : loading ? <p role="status">Localizando organizações e fontes…</p> : <section className="card source-panel">{error && <p role="alert">{error}</p>}<label>Organização<select className="form-input" value={org} onChange={e => setOrg(e.target.value)}><option value="">Escolha uma organização</option>{orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label><div className="source-list">{org && sources.filter(s => s.organizationId === org).map(s => <Link className="card source-row" key={s.id} to={path(s)}>{s.name} · Configurar fonte</Link>)}{org && !sources.some(s => s.organizationId === org) && <p>Nenhuma fonte cadastrada. <Link to={"/organizations/" + org}>Cadastrar na organização</Link></p>}</div></section>}<Link to="/organizations">Abrir organizações</Link></main></>;
}
