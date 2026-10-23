import { problemMessage } from "../../../shared/presentation/messages";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { ContentSkeleton } from "../../../shared/components/ContentSkeleton";
import { Database, ChevronRight } from "lucide-react";
import "../../organizations/styles/organizationOverview.css";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { catalogApi } from "../api/catalogApi";
import type { DataSource } from "../types/catalogTypes";
import { DataSourceModal } from "./DataSourceModal";
import { isErr } from "../../../shared/result/result";
import "../styles/dataSourceWorkspace.css";
export function OrganizationDataSources({ organizationId, isRoot }: {
    organizationId: string;
    isRoot: boolean;
}) {
    const navigate = useNavigate();
    const [loadedOrganization, setLoadedOrganization] = useState<string | null>(null);
    const sameContext = loadedOrganization === organizationId;
    const [sources, setSources] = useState<DataSource[]>([]), [counts, setCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true), [error, setError] = useState(""), [creating, setCreating] = useState(false), [version, setVersion] = useState(0);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");

        void (async () => {
            try {
                const r = await catalogApi.listDataSources(organizationId);
                if (!active)
                    return;
                if (isErr(r)) {
                    setError(problemMessage(r.error, "Não foi possível consultar as fontes."));
                    return;
                }
                setSources(r.value);
                setLoadedOrganization(organizationId);
                if (isRoot) {
                    const schemas = await catalogApi.listReportSchemas();
                    if (!active)
                        return;
                    if (isErr(schemas))
                        setError("Fontes carregadas; não foi possível consultar a quantidade de tabelas.");
                    else
                        setCounts(Object.fromEntries(r.value.map(s => [s.id, schemas.value.filter(t => t.dataSourceId === s.id).length])));
                }
                else {
                    const results = await Promise.all(r.value.map(async (s) => { const c = await catalogApi.getAvailableCatalog(organizationId, s.id); return [s.id, isErr(c) ? null : c.value.length] as const; }));
                    if (active) {
                        setCounts(Object.fromEntries(results.filter((v): v is readonly [
                            string,
                            number
                        ] => v[1] !== null)));
                        if (results.some(v => v[1] === null))
                            setError("Algumas contagens de tabelas não puderam ser consultadas.");
                    }
                }
            }
            catch {
                if (active)
                    setError("Falha de comunicação ao consultar fontes.");
            }
            finally {
                if (active)
                    setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [organizationId, isRoot, version]);
    return <section className="organization-sources" aria-labelledby="organization-sources-title"><header className="organization-section-header"><div><h2 id="organization-sources-title">Fontes de dados</h2><p>Configure as conexões e escolha os dados que poderão ser usados nos relatórios.</p></div>{isRoot&&<button className="btn btn-primary" onClick={()=>setCreating(true)}>Cadastrar fonte</button>}</header>
 {error&&<div role="alert" className="source-notice source-error">{error} <button className="btn btn-secondary" onClick={()=>setVersion(v=>v+1)}>Tentar novamente</button></div>}
 {loading && sameContext && <NeutralLoader compact message="Atualizando fontes da organização…"/>}
 {(loading || !sameContext) && !sameContext && !error?<ContentSkeleton variant="cards" rows={3} columns={4} message="Consultando fontes e tabelas da organização…"/>:!sameContext?null:sources.length===0?<div className="card organization-empty"><Database size={32} aria-hidden="true"/><h3>Nenhuma fonte cadastrada nesta organização.</h3><p>{isRoot?"Cadastre a primeira conexão para começar a configurar tabelas, campos e acesso.":"O root precisa cadastrar uma conexão antes de configurar o acesso aos dados."}</p></div>:<div className="organization-source-list" aria-busy={loading} inert={loading}>{sources.map(source=>{const pending=[!source.isEnabled&&"habilitar a fonte",source.readOnlyVerificationStatus!=="verified"&&"validar conexão de somente leitura",counts[source.id]===0&&"escolher tabelas"].filter(Boolean);return <article className="card organization-source-card" key={source.id}>
 <header className="organization-source-card__header"><span className="organization-source-card__icon"><Database size={20} aria-hidden="true"/></span><div><h3>{source.name}</h3><p>{source.provider==="postgresql"?"PostgreSQL":source.provider}</p></div><span className={"organization-source-status "+(source.isEnabled?"is-enabled":"is-disabled")}>{source.isEnabled?"Habilitada":"Desabilitada"}</span></header>
 <dl className="organization-source-card__facts"><div><dt>Catálogo</dt><dd>{counts[source.id]===undefined?"Contagem indisponível":counts[source.id]+" tabelas"+(isRoot?"":" disponíveis")}</dd></div><div><dt>Somente leitura</dt><dd>{source.readOnlyVerificationStatus==="verified"?"Validada":source.readOnlyVerificationStatus==="pending"?"Validação pendente":"Validação requer atenção"}</dd></div></dl>
 <footer className="organization-source-card__footer"><p>{pending.length?<><strong>Pendente: </strong>{pending.join(" · ")}</>:counts[source.id]===undefined?"Consulte o catálogo para verificar as tabelas.":"Revise os campos e as permissões desta fonte."}</p><Link className="btn btn-secondary" to={"/organizations/"+organizationId+"/data-sources/"+encodeURIComponent(source.id)}>{isRoot?"Configurar fonte":"Consultar fonte"}<ChevronRight size={16} aria-hidden="true"/></Link></footer>
 </article>;})}</div>}
 {creating && <DataSourceModal organizationId={organizationId} onClose={() => setCreating(false)} onSubmitUpdate={async () => false} onSubmitCreate={async (data) => { const r = await catalogApi.createDataSource(data); if (isErr(r)) {
        setError(problemMessage(r.error, "Não foi possível salvar a conexão."));
        return false;
    } setCreating(false); navigate("/organizations/" + organizationId + "/data-sources/" + encodeURIComponent(r.value.id) + "?step=tables"); return true; }}/>}</section>;
}
