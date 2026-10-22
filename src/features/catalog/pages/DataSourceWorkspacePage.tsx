import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { ClearSearchButton } from "../../../shared/components/ClearSearchButton";
import { ConfirmDeleteModal } from "../../organizations/components/ConfirmDeleteModal";
import type { ApiProblemDetails } from "../../../shared/api/types";
import { Database, Copy } from "lucide-react";
import { SourceActionMenu } from "../components/SourceActionMenu";
import { OrganizationProfilesPage } from "./OrganizationProfilesPage";
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { organizationsApi } from "../../organizations/api/organizationsApi";
import { catalogApi } from "../api/catalogApi";
import type { DataSource, Profile, RootReportSchema, RootReportField, AvailableCatalogSchema } from "../types/catalogTypes";
import { isErr, ok } from "../../../shared/result/result";
import { canManageOrganization } from "../../../shared/utils/roles";
import { Navbar } from "../../../shared/components/Navbar";
import { DataSourceModal } from "../components/DataSourceModal";
import { ImportSourceTablesModal } from "../components/ImportSourceTablesModal";
import { SourceSchemaEditorModal } from "../components/SourceSchemaEditorModal";
import { CatalogTemplateModal } from "../components/CatalogTemplateModal";
import { ReportFieldsPage } from "./ReportFieldsPage";
import { ProfileGrantsEditorPage } from "./ProfileGrantsEditorPage";
import { CatalogTemplatesPage } from "./CatalogTemplatesPage";
import { ReportJoinTemplatesPage } from "./ReportJoinTemplatesPage";
import { SearchMatchOptions } from "../../../shared/components/SearchMatchOptions";
import { matchesTextSearch } from "../../../shared/utils/textSearch";
import "../styles/dataSourceWorkspace.css";
const steps = [{ id: "connection", name: "Conectar o banco", explanation: "Esta conexão será usada para consultar o banco. Salvar a fonte ainda não disponibiliza tabelas nem concede acesso aos usuários." }, { id: "tables", name: "Escolher tabelas", explanation: "Escolha quais tabelas serão cadastradas para configurar relatórios. A importação cadastra os campos dessas tabelas; os dados do banco não são copiados." }, { id: "fields", name: "Revisar os campos", explanation: "Essas configurações determinam como cada campo poderá ser usado. Elas ainda não concedem acesso aos usuários." }, { id: "access", name: "Definir acesso", explanation: "As permissões valem para os membros associados ao profile. Elas só podem liberar operações permitidas na configuração dos campos." }];
export function DataSourceWorkspacePage() {
    const { organizationId = "", dataSourceId = "" } = useParams();
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const { state, refreshUser } = useAuth();
    const user = state.status === "authenticated" ? state.user : null;
    const root = user?.globalRole === "root";
    const allowed = !!user && canManageOrganization(user, organizationId);
    const [source, setSource] = useState<DataSource | null>(null), [org, setOrg] = useState("");
    const [schemas, setSchemas] = useState<RootReportSchema[]>([]), [available, setAvailable] = useState<AvailableCatalogSchema[]>([]), [fields, setFields] = useState<Record<string, RootReportField[]>>({}), [profiles, setProfiles] = useState<Profile[]>([]);
    const [granted, setGranted] = useState<boolean | null>(null), [fieldError, setFieldError] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(""), [version, setVersion] = useState(0), [busy, setBusy] = useState(false);
    const [modal, setModal] = useState<"connection" | "import" | "save" | "apply" | "schema" | null>(null), [editing, setEditing] = useState<RootReportSchema | undefined>();
    const [deletingSource, setDeletingSource] = useState(false);
    const [deletingTable, setDeletingTable] = useState<RootReportSchema | null>(null);
    const [deleteProblem, setDeleteProblem] = useState<ApiProblemDetails | null>(null);
    const [creatingProfile, setCreatingProfile] = useState(false);
    const [tablePickerOpen, setTablePickerOpen] = useState(false);
    const tableSearchRef = useRef<HTMLInputElement>(null);
    useEffect(()=>{if(tablePickerOpen)tableSearchRef.current?.focus();},[tablePickerOpen]);
    const [query, setQuery] = useState(""), [matchCase, setMatchCase] = useState(false), [exactMatch, setExactMatch] = useState(false);
    const [pendingReview,setPendingReview]=useState<{schemaId?:string;internalSchemaName?:string;internalObjectName?:string}|null>(null);
    const [completionMessage,setCompletionMessage]=useState("");
    const actionLock = useRef(false);
    const loadedScope = useRef("");
    const refresh = () => {if(pendingReview)setLoading(true);setVersion(v => v + 1);};
    function reviewCreatedTable(target:{schemaId?:string;internalSchemaName?:string;internalObjectName?:string},message:string){
      setModal(null);setPendingReview(target);setCompletionMessage(message);setLoading(true);
      setQuery("");setMatchCase(false);setExactMatch(false);setTablePickerOpen(false);
      setParams(new URLSearchParams({step:"fields",...(target.schemaId?{schemaId:target.schemaId}:{})}));
      setVersion(v=>v+1);
    }
    useEffect(() => {
        let active = true;
        const scope = organizationId + "/" + dataSourceId;
        if (loadedScope.current !== scope) {
            setLoading(true);
            setPendingReview(null);
            setCompletionMessage("");
            setSource(null);
            setOrg("");
            setSchemas([]);
            setAvailable([]);
            setFields({});
            setProfiles([]);
            loadedScope.current = scope;
        }
        setError("");
        setGranted(null);
        setFieldError(false);
        if (!allowed) {
            setLoading(false);
            setError("Acesso negado a esta organização.");
            return;
        }
        void (async () => {
            try {
                const [o, s] = await Promise.all([organizationsApi.list(), catalogApi.listDataSources(organizationId)]);
                if (!active)
                    return;
                if (isErr(o) || isErr(s)) {
                    const failure = isErr(o) ? o : isErr(s) ? s : null;
                    setError(failure && isErr(failure) ? failure.error.detail || "Não foi possível consultar a fonte." : "Falha ao consultar a fonte.");
                    return;
                }
                const organization = o.value.find(v => v.id === organizationId);
                const ds = s.value.find(v => v.id === dataSourceId && v.organizationId === organizationId);
                if (!organization || !ds) {
                    setError("Fonte não encontrada nesta organização ou acesso negado.");
                    return;
                }
                setOrg(organization.name);
                setSource(ds);
                const [c, p] = await Promise.all([root ? catalogApi.listReportSchemas(dataSourceId) : catalogApi.getAvailableCatalog(organizationId, dataSourceId), catalogApi.listProfiles(organizationId)]);
                if (!active)
                    return;
                if (!c.ok) {
                    setError(c.error.detail || "Não foi possível consultar as tabelas desta fonte.");
                    return;
                }
                const rows: RootReportSchema[] = root ? (c.value as RootReportSchema[]).filter(t => t.dataSourceId === dataSourceId) : (c.value as AvailableCatalogSchema[]).filter(t => t.dataSourceId === dataSourceId).map(t => ({ id: t.id, dataSourceId, publicName: t.name, publicType: t.type, internalSchemaName: "", internalObjectName: "", description: null, isEnabled: true }));
                setSchemas(rows);
                if (!root)
                    setAvailable((c.value as AvailableCatalogSchema[]).filter(t => t.dataSourceId === dataSourceId));
                if (isErr(p)) {
                    setError(p.error.detail || "Não foi possível consultar os profiles; o estado das permissões é desconhecido.");
                    return;
                }
                setProfiles(p.value);
                const grants = await Promise.all(p.value.map(p => catalogApi.getProfileGrants(organizationId, p.id)));
                if (!active)
                    return;
                setGranted(grants.some(isErr) ? null : grants.some(g => !isErr(g) && g.value.schemas.some(s => rows.some(t => t.id === s.schemaId) && s.fields.some(f => f.selectable || f.filterable || f.sortable || f.groupable || f.aggregatable))));
                if (root) {
                    const results = await Promise.all(rows.map(async (t) => ({ id: t.id, result: await catalogApi.listReportFields(t.id) })));
                    if (!active)
                        return;
                    setFieldError(results.some(r => isErr(r.result)));
                    setFields(Object.fromEntries(results.flatMap(r => isErr(r.result) ? [] : [[r.id, r.result.value]])));
                }
            }
            catch {
                if (active)
                    setError("Falha de comunicação ao carregar a configuração da fonte.");
            }
            finally {
                if (active)
                    setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [organizationId, dataSourceId, allowed, root, version]);
    const stepIndex = Math.max(0, steps.findIndex(s => s.id === (params.get("step") || (schemas.length ? "fields" : "tables"))));
    const step = steps[stepIndex];
    const selected = pendingReview ? undefined : schemas.find(s => s.id === params.get("schemaId")) || (!params.get("schemaId") ? schemas[0] : undefined);
    const profile = profiles.find(p => p.id === params.get("profileId"));
    const library = params.get("library");
    const href = (stepId: string, extra: Record<string, string> = {}) => { const next = new URLSearchParams(params); next.set("step", stepId); next.delete("library"); for (const [k, v] of Object.entries(extra))
        next.set(k, v); return "?" + next.toString(); };
    useEffect(() => { if (!source || loading || pendingReview)
        return; const next = new URLSearchParams(params); if (!steps.some(s => s.id === params.get("step")))
        next.set("step", schemas.length ? "fields" : "tables"); if ((next.get("step") === "fields") && !next.get("schemaId") && schemas[0])
        next.set("schemaId", schemas[0].id); if (next.toString() !== params.toString())
        setParams(next, { replace: true }); }, [source, loading, schemas, params, setParams, pendingReview]);
    useEffect(()=>{
      if(!pendingReview||loading)return;
      const table=schemas.find(table=>pendingReview.schemaId?table.id===pendingReview.schemaId:table.internalSchemaName===pendingReview.internalSchemaName&&table.internalObjectName===pendingReview.internalObjectName);
      if(table){setParams(new URLSearchParams({step:"fields",schemaId:table.id}),{replace:true});setPendingReview(null);}
      else if(!error)setError("Não foi possível localizar a tabela criada no catálogo desta fonte. Consulte novamente para revisar os campos.");
    },[pendingReview,loading,schemas,error,setParams]);
    const base = "/organizations/" + organizationId + "/data-sources/" + encodeURIComponent(dataSourceId);
    const fieldCount = root ? Object.values(fields).reduce((n, f) => n + f.length, 0) : available.reduce((n, t) => n + t.fields.length, 0);
    async function action(run: () => ReturnType<typeof catalogApi.deleteDataSource>, done?: () => void) { if (actionLock.current)
        return; actionLock.current = true; setBusy(true); setError(""); try {
        const r = await run();
        if (isErr(r)) {
            setError(r.error.detail || "Não foi possível concluir a operação.");
            if (r.error.status === 403)
                void refreshUser();
        }
        else {
            if (done)
                done();
            else
                refresh();
        }
    }
    catch {
        setError("Falha de comunicação. Consulte o estado da fonte antes de tentar novamente.");
    }
    finally {
        setBusy(false);
        actionLock.current = false;
    } }
    const filtered = schemas.filter(t => [t.publicName, t.internalSchemaName, t.internalObjectName, t.internalSchemaName + "." + t.internalObjectName].some(v => matchesTextSearch(v, query, { matchCase, exactMatch })));
    return <><Navbar /><main className="container source-workspace"><nav className="source-breadcrumb" aria-label="Caminho de navegação"><Link to="/organizations">Organizações</Link><span>›</span><Link to={"/organizations/" + organizationId}>{org || "Organização"}</Link><span>› Fontes de dados ›</span><span>{source?.name || "Fonte"}</span></nav>
 {(loading || (pendingReview && !error)) ? <NeutralLoader title="Carregando configuração da fonte" message="Consultando conexão, tabelas, campos e permissões desta fonte…"/> : <>{error && <div role="alert" className="source-notice source-error">{error} <button className="btn btn-secondary" onClick={refresh}>Consultar novamente</button></div>}{source && <>
 <header className="source-workspace__header"><div><h1>{source.name}</h1><p>{org} · {source.provider} · {schemas.length} tabelas · {fieldError ? "Quantidade de campos indisponível" : fieldCount + " campos"}</p></div>{root && <SourceActionMenu label="Opções da fonte"><Link to={"?" + new URLSearchParams({ ...Object.fromEntries(params), library: "catalog" })}>Modelos reutilizáveis</Link><button className="btn btn-secondary" disabled={!schemas.length || fieldCount === 0 || fieldError} onClick={() => setModal("save")}>Salvar catálogo como modelo</button></SourceActionMenu>}</header>
 {completionMessage && !pendingReview && <p role="status" className="source-notice">{completionMessage}</p>}
 {!source.isEnabled && <p className="source-notice">Fonte desabilitada. Habilite a conexão para importar tabelas e executar relatórios.</p>}
 {source.readOnlyVerificationStatus !== "verified" && <p role="status" className="source-notice"><strong>Conexão salva; validação de somente leitura pendente.</strong> Você pode preparar o catálogo. A execução de relatórios exige a validação da conexão.</p>}
 <nav className="source-stepper" aria-label="Passos de configuração">{steps.map((s, i) => <Link key={s.id} aria-current={step.id === s.id ? "step" : undefined} to={href(s.id)}><strong>{i + 1}. {s.name}</strong><small>{i === 0 ? (source.readOnlyVerificationStatus === "verified" ? "Conexão salva e validada" : "Conexão salva; validar leitura") : i === 1 ? schemas.length + " tabelas cadastradas" : i === 2 ? "Revisão manual disponível" : granted === null ? "Permissões não verificadas" : granted ? "Há operações concedidas" : "Sem operações concedidas"}</small></Link>)}</nav>
 {library ? <section className="card source-panel"><h2>Modelos reutilizáveis</h2><p>Biblioteca global, compartilhada entre organizações. Modelos de catálogo copiam configurações de tabelas e campos. Excluir um modelo não remove cópias já aplicadas. Modelos de relacionamento definem como combinar tabelas nos relatórios; são avançados e opcionais.</p><Link to={href(step.id)}>Voltar à configuração da fonte</Link>{root ? <><nav className="source-model-tabs"><Link aria-current={library !== "relationships"} to={"?" + new URLSearchParams({ ...Object.fromEntries(params), library: "catalog" })}>Modelos de catálogo</Link><Link aria-current={library === "relationships"} to={"?" + new URLSearchParams({ ...Object.fromEntries(params), library: "relationships" })}>Modelos de relacionamento</Link></nav>{library === "relationships" ? <ReportJoinTemplatesPage embedded sourceId={source.id}/> : <CatalogTemplatesPage embedded/>}</> : <p role="alert">Somente root pode gerenciar modelos.</p>}</section> : <>
 <section className="card source-panel"><h2>{stepIndex + 1}. {step.name}</h2><p>{step.explanation}</p>
 {step.id === "connection" && <><dl><dt>Conexão administrativa</dt><dd>{source.adminConnectionStringMasked}</dd><dt>Conexão de execução</dt><dd>{source.executionConnectionStringMasked}</dd><dt>Validação de somente leitura</dt><dd>{source.readOnlyVerificationStatus === "verified" ? "Validada" : source.readOnlyVerificationStatus === "pending" ? "Pendente" : source.readOnlyVerificationStatus === "failed" ? "Falhou" : "Requer atenção"}</dd></dl>{root ? <div className="source-actions"><button className="btn btn-primary" disabled={busy} onClick={() => setModal("connection")}>Editar conexão</button><button className="btn btn-secondary" disabled={busy || !source.isEnabled} onClick={() => void action(async () => { const r = await catalogApi.verifyReadOnlyDataSource(source.id); return isErr(r) ? r : ok(undefined); })}>{busy ? "Validando conexão…" : "Validar somente leitura"}</button><SourceActionMenu label="Mais ações da conexão"><button className="btn btn-danger" disabled={busy} onClick={() => {setDeleteProblem(null);setDeletingSource(true);}}>Excluir fonte</button></SourceActionMenu></div> : <p>Somente root pode alterar a conexão e validar somente leitura.</p>}</>}
 {step.id === "tables" && <>{root ? <>
 <p className="source-table-catalog-status"><strong>{schemas.length?schemas.length+" tabelas cadastradas":"Catálogo vazio"}</strong><span>{schemas.length?"Você pode acrescentar tabelas pela importação.":"Escolha uma opção para cadastrar as primeiras tabelas."}</span></p>
 <div className="source-table-actions" role="group" aria-label="Cadastro de tabelas"><div className="source-table-actions__main"><button className="btn btn-primary" disabled={!source.isEnabled} onClick={()=>setModal("import")}><Database size={16} aria-hidden="true"/>Importar do banco</button><button className="btn btn-secondary" aria-describedby={schemas.length?"source-table-model-restriction":undefined} disabled={!source.isEnabled||schemas.length>0} onClick={()=>setModal("apply")}><Copy size={16} aria-hidden="true"/>Usar modelo de catálogo</button></div><SourceActionMenu label="Opções avançadas"><button className="btn btn-secondary" onClick={()=>{setEditing(undefined);setModal("schema");}}>Cadastrar tabela manualmente</button></SourceActionMenu></div>
 {schemas.length>0&&<p id="source-table-model-restriction" className="source-table-model-restriction">Modelos de catálogo só podem ser aplicados ao catálogo vazio. Para acrescentar tabelas, use Importar do banco.</p>}
 </> : <><p>Somente root pode cadastrar tabelas e campos. Você pode consultar o catálogo e configurar o acesso.</p><p>{schemas.length?schemas.length+" tabelas já cadastradas nesta fonte.":"Nenhuma tabela cadastrada. Solicite ao root o cadastro das tabelas."}</p></>}</>}
 {step.id === "fields" && <>{!schemas.length ? <p>Nenhuma tabela cadastrada. Volte a Escolher tabelas.</p> : <>
 {!root&&<button type="button" className="source-table-switch btn btn-secondary" aria-expanded={tablePickerOpen} aria-controls="source-table-picker" onClick={()=>setTablePickerOpen(v=>!v)}><span>Tabela: <strong>{selected?.publicName || "Escolher tabela"}</strong></span><span>{tablePickerOpen?"Fechar":"Trocar"}</span></button>}
 <div className="source-table-layout"><aside id="source-table-picker" className={"source-table-selector"+(tablePickerOpen?" is-open":"")}><h3>Tabelas <small>{schemas.length}</small><button className="source-table-close btn btn-secondary" aria-label="Fechar tabelas" onClick={()=>setTablePickerOpen(false)}>Fechar</button></h3><div className="source-table-search"><div className="search-input-clear"><input ref={tableSearchRef} className="form-input" aria-label="Buscar tabela" placeholder="Buscar tabela" value={query} onChange={e=>setQuery(e.target.value)}/><ClearSearchButton value={query} onClear={()=>setQuery("")}/></div><SearchMatchOptions matchCase={matchCase} exactMatch={exactMatch} onMatchCaseChange={setMatchCase} onExactMatchChange={setExactMatch}/></div><nav className="source-table-nav" aria-label="Tabelas desta fonte">{filtered.length===0&&<p>Nenhuma tabela corresponde à busca.</p>}{filtered.map(t=><Link key={t.id} to={href("fields",{schemaId:t.id})} onClick={()=>setTablePickerOpen(false)} aria-current={selected?.id===t.id}>{t.publicName}<small>{t.internalObjectName?t.internalSchemaName+"."+t.internalObjectName:"Tabela disponível"}</small></Link>)}</nav></aside>
 <div className="source-fields-content">{selected ? root ? <ReportFieldsPage embedded schemaId={selected.id} tableName={selected.publicName} physicalName={selected.internalSchemaName+"."+selected.internalObjectName} key={selected.id} onChanged={refresh} tableActions={<><button className="source-table-switch btn btn-secondary" aria-controls="source-table-picker" aria-expanded={tablePickerOpen} onClick={()=>setTablePickerOpen(true)}>Trocar tabela</button><button className="btn btn-secondary" onClick={()=>{setEditing(selected);setModal("schema");}}>Editar tabela</button><button className="btn btn-danger" disabled={busy} onClick={()=>{setDeleteProblem(null);setDeletingTable(selected);}}>Excluir tabela</button></>}/> : <><h3>{selected.publicName}</h3><ul>{available.find(t=>t.id===selected.id)?.fields.map(f=><li key={f.id}>{f.name} · {f.type}</li>)}</ul></> : <p role="alert">A tabela indicada na URL não pertence ao catálogo desta fonte.</p>}</div></div></>}</>}
 {step.id === "access" && <><div className="source-profile-toolbar"><label>Profile da organização<select className="form-input" value={profile?.id || ""} onChange={e => setParams(new URLSearchParams(href("access", { profileId: e.target.value }).slice(1)))}><option value="">Escolha um profile</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><div className="source-actions"><button className="btn btn-secondary" onClick={() => setCreatingProfile(true)}>Criar profile</button><Link to={"/organizations/" + organizationId + "/members"}>Associar membros ao profile</Link></div></div><p>As permissões das outras fontes deste profile serão preservadas. Nenhuma permissão é concedida automaticamente.</p>{params.get("profileId") && !profile && <p role="alert">Profile não encontrado nesta organização. Escolha um profile válido.</p>}{profile && <ProfileGrantsEditorPage embedded profileId={profile.id} sourceId={source.id} key={profile.id + source.id} onSaved={refresh}/>}<section className="source-notice"><h3>Configuração e pendências</h3><ul><li>Conexão cadastrada: {source.isEnabled ? "habilitada" : "habilitação pendente"}.</li><li>Somente leitura: {source.readOnlyVerificationStatus === "verified" ? "validada" : "validação pendente"}.</li><li>{schemas.length} tabelas e {fieldError ? "quantidade de campos não verificada" : fieldCount + " campos cadastrados"}. A existência de campos não confirma revisão humana.</li><li>{granted === null ? "Consulte novamente para atualizar o estado das permissões." : granted ? "Há operações concedidas a profiles. Verifique a associação dos membros." : "Permissões para esta fonte ainda não configuradas."}</li></ul><div className="source-summary-actions"><button className="btn btn-secondary" onClick={refresh}>Atualizar resumo</button><Link className="btn btn-primary" to={"/organizations/" + organizationId + "/creator"}>Ir para criação de relatórios</Link></div></section></>}
 </section><footer className="source-workspace__footer"><span>Passo {stepIndex + 1} de 4 · {source.name}</span><div className="source-workspace__navigation">{stepIndex > 0 && <Link className="btn btn-secondary" to={href(steps[stepIndex - 1].id)}>Voltar</Link>}{stepIndex < 3 && <Link className="btn btn-primary" to={href(steps[stepIndex + 1].id)}>Continuar: {steps[stepIndex + 1].name}</Link>}</div></footer></>}
 {creatingProfile && <OrganizationProfilesPage embedded createOnly sourceId={source.id} onCancelCreate={() => setCreatingProfile(false)} onCreated={p => { setCreatingProfile(false); setParams(new URLSearchParams(href("access", { profileId: p.id }).slice(1))); refresh(); }}/>}
 {root && modal === "connection" && <DataSourceModal organizationId={organizationId} dataSource={source} onClose={() => setModal(null)} onSubmitCreate={async () => false} onSubmitUpdate={async (id, data) => { const r = await catalogApi.updateDataSource(id, data); if (isErr(r)) {
                setError(r.error.detail || "Não foi possível salvar a conexão.");
                return false;
            } setModal(null); refresh(); return true; }}/>}
 {root && modal === "import" && <ImportSourceTablesModal sourceId={source.id} sourceName={source.name} onClose={() => setModal(null)} onChanged={refresh} onReview={schemaId=>reviewCreatedTable({schemaId},"Tabelas importadas. Revise os campos da tabela selecionada.")}/>}
 {root && (modal === "save" || modal === "apply") && <CatalogTemplateModal dataSourceId={source.id} dataSourceName={source.name} mode={modal} onClose={() => setModal(null)} onSuccess={refresh} onApplied={table=>reviewCreatedTable(table,"Modelo aplicado com sucesso. Revise os campos da tabela selecionada.")} catalogPath={base + "?library=catalog"} fieldsPath={base + "?step=fields"}/>}
 {root && deletingSource && <ConfirmDeleteModal isOpen title="Excluir fonte" itemName={source.name} warningText="A conexão e sua configuração serão removidas. Os dados do banco de origem não serão excluídos." problem={deleteProblem} onClose={()=>{setDeletingSource(false);setDeleteProblem(null);}} onConfirm={async()=>{
 if(actionLock.current)return false;actionLock.current=true;setBusy(true);setDeleteProblem(null);
 try {const result=await catalogApi.deleteDataSource(source.id);if(isErr(result)){setDeleteProblem(result.error);if(result.error.status===403)void refreshUser();return false;}navigate("/organizations/"+organizationId);return true;}
 finally{actionLock.current=false;setBusy(false);}
 }}/>}
 {root && deletingTable && <ConfirmDeleteModal isOpen onClose={()=>{setDeletingTable(null);setDeleteProblem(null);}} title="Excluir tabela" itemName={deletingTable.publicName} warningText="A tabela e seus campos serão removidos do catálogo desta fonte. A tabela e os dados do banco não serão excluídos." problem={deleteProblem} onConfirm={async()=>{
   if(actionLock.current)return false;
   actionLock.current=true;setBusy(true);setDeleteProblem(null);
   try {
     const result=await catalogApi.deleteReportSchema(deletingTable.id);
     if(isErr(result)){setDeleteProblem(result.error);if(result.error.status===403)void refreshUser();return false;}
     setSchemas(current=>current.filter(table=>table.id!==deletingTable.id));
     const next=new URLSearchParams(params);next.delete("schemaId");setParams(next);setCompletionMessage("");refresh();return true;
   } catch {setDeleteProblem({type:"about:blank",title:"Falha ao excluir tabela",status:0,detail:"Falha de comunicação. Consulte o catálogo antes de tentar novamente.",instance:""});return false;}
   finally {actionLock.current=false;setBusy(false);}
 }}/>}
 {root && modal === "schema" && <SourceSchemaEditorModal sourceId={source.id} schema={editing} onClose={() => setModal(null)} onSaved={saved=>{if(editing)refresh();else reviewCreatedTable({schemaId:saved.id},"Tabela cadastrada. Configure seus campos para continuar.");}}/>}
 </>}</>}
 </main></>;
}
