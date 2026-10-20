import { useEffect, useRef, useState } from "react";
import { Check, FileBarChart, Search } from "lucide-react";
import { Alert, ProblemAlert } from "../../../shared/components/Alert";
import type { ApiProblemDetails } from "../../../shared/api/types";
import { isErr } from "../../../shared/result/result";
import { creatorApi } from "../api/creatorApi";
import type { GlobalReportTemplate, ReportDetail, ReportImportCheck, ReportImportDataSource } from "../types/creatorTypes";

import "./GlobalReportCatalog.css";

interface Props { organizationId: string; onClose: () => void; onImported: (report: ReportDetail) => void; }

export function GlobalReportCatalog({ organizationId, onClose, onImported }: Props) {
  const [templates, setTemplates] = useState<GlobalReportTemplate[]>([]);
  const [sources, setSources] = useState<ReportImportDataSource[]>([]);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [templateId, setTemplateId] = useState("");
  const [dataSourceId, setDataSourceId] = useState("");
  const [title, setTitle] = useState("");
  const [check, setCheck] = useState<ReportImportCheck | null>(null);
  const [problem, setProblem] = useState<ApiProblemDetails | null>(null);
  const [loadingSources, setLoadingSources] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  useEffect(() => {
    let active = true;
    void creatorApi.getImportDataSources(organizationId).then(result => {
      if (!active) return;
      setLoadingSources(false);
      if (isErr(result)) setProblem(result.error);
      else setSources(result.value);
    });
    return () => { active = false; };
  }, [organizationId]);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => { void creatorApi.listGlobalTemplates(page, search.trim()).then(result => {
      if (!active) return;
      setLoading(false);
      if (isErr(result)) setProblem(result.error);
      else { setTemplates(result.value.data); setPages(result.value.totalPages); setTotal(result.value.totalRecords); }
    }); }, search.trim() ? 300 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [page, search]);

  function changePage(next: number) {
    setLoading(true); setTemplates([]); setProblem(null); setPage(next); setTemplateId(""); setTitle(""); setCheck(null);
  }

  async function submit(importing: boolean) {
    if (pending.current || !templateId || !dataSourceId || (importing && !check?.canImport)) return;
    pending.current = true; setBusy(true); setProblem(null);
    try {
      const request = { organizationId, dataSourceId, title: title.trim() };
      if (importing) {
        const result = await creatorApi.importReport(templateId, request);
        if (isErr(result)) { setProblem(result.error); setCheck(null); }
        else onImported(result.value);
      } else {
        const result = await creatorApi.checkReportImport(templateId, request);
        if (isErr(result)) { setProblem(result.error); setCheck(null); }
        else setCheck(result.value);
      }
    } catch { setProblem({ type: "about:blank", instance: "", title: "Erro de conexão", code: "report_import.connection_failed", status: 0, detail: "Não foi possível concluir. Tente novamente." }); setCheck(null); }
    finally { pending.current = false; setBusy(false); }
  }

  return <section aria-labelledby="global-catalog-title" className="glass-card" style={{ padding: "1.75rem" }}>
    <h1 id="global-catalog-title">Catálogo de relatórios globais</h1>
    <p>Crie uma cópia independente nesta organização. As permissões e os dados serão os da organização atual.</p>
    <ProblemAlert problem={problem}/>
    <section aria-label="Catálogo de relatórios globais" className="global-report-catalog">
      <div className="global-report-catalog__heading"><h2>Modelos disponíveis</h2><span>Escolha um modelo para sua organização</span></div>
      <div className="global-report-catalog__search"><Search size={18} aria-hidden="true"/><input id="global-template-search" aria-label="Buscar relatórios globais" placeholder="Buscar pelo título do relatório..." value={search} disabled={busy} onChange={event => { setSearch(event.target.value); setPage(1); setLoading(true); setTemplates([]); setProblem(null); setTemplateId(""); setTitle(""); setCheck(null); }}/></div>
      {loading ? <p role="status">Buscando modelos...</p> : <>
        <p className="global-report-catalog__count" role="status">{total} {total === 1 ? "modelo encontrado" : "modelos encontrados"}</p>
        {templates.length === 0 ? <div className="global-report-catalog__empty"><FileBarChart size={32} aria-hidden="true"/><p>{search.trim() ? "Nenhum modelo encontrado para esta busca." : "Nenhum modelo global disponível."}</p>{search.trim() && <small>Tente outro título ou limpe a busca.</small>}</div> : <div className="global-report-catalog__grid">
          {templates.map(template => <button type="button" key={template.id} className="global-report-catalog__card" aria-label={`Selecionar modelo ${template.title}`} aria-pressed={templateId === template.id} disabled={busy} onClick={() => { setTemplateId(template.id); setTitle(template.title); setCheck(null); }}>
            <span className="global-report-catalog__icon"><FileBarChart size={22} aria-hidden="true"/></span>
            <span className="global-report-catalog__details"><strong>{template.title}</strong><small>Atualizado em {new Date(template.updatedAt).toLocaleDateString("pt-BR")}</small></span>
            {templateId === template.id && <Check size={20} className="global-report-catalog__selected" aria-hidden="true"/>}
          </button>)}
        </div>}
        {pages > 1 && <nav aria-label="Páginas do catálogo" className="global-report-catalog__pagination"><button className="btn btn-secondary" disabled={busy || page <= 1} onClick={() => changePage(page - 1)}>Anterior</button><span>Página {page} de {pages}</span><button className="btn btn-secondary" disabled={busy || page >= pages} onClick={() => changePage(page + 1)}>Próxima</button></nav>}
      </>}
    </section>
    <label className="form-label" htmlFor="import-source">Data source de destino</label>
    <select className="form-input" id="import-source" value={dataSourceId} disabled={busy || loadingSources} onChange={event => { setDataSourceId(event.target.value); setCheck(null); }}><option value="">Selecione um data source</option>{sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
    {loadingSources ? <p role="status">Carregando data sources...</p> : sources.length === 0 && <p>Nenhum data source ativo e verificado disponível. Solicite a configuração ao administrador.</p>}
    <label className="form-label" htmlFor="import-title">Título da cópia</label><input className="form-input" id="import-title" value={title} disabled={busy} onChange={event => setTitle(event.target.value)}/>
    {check && (check.canImport ? <Alert type="success" message="Modelo compatível. A cópia será criada como privada."/> : <div role="alert"><p>Não é possível importar:</p><ul>{check.issues.map((issue, i) => <li key={i}>{issue.message} <small>({issue.path})</small></li>)}</ul></div>)}
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
      <button className="btn btn-secondary" disabled={busy} onClick={onClose}>Voltar</button>
      <button className="btn btn-secondary" disabled={busy || loading || !templateId || !dataSourceId} onClick={() => void submit(false)}>Verificar compatibilidade</button>
      <button className="btn btn-primary" disabled={busy || !check?.canImport || !title.trim()} onClick={() => void submit(true)}>{busy ? "Processando..." : "Importar"}</button>
    </div>
  </section>;
}
