import { ContentSkeleton } from "../../../shared/components/ContentSkeleton";
import { ReportTagPicker } from "./ReportTagPicker";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { ClearSearchButton } from "../../../shared/components/ClearSearchButton";
import { Fragment, useEffect, useRef, useState } from "react";
import { Check, ChevronRight, FileBarChart, Search } from "lucide-react";
import { Alert, ProblemAlert } from "../../../shared/components/Alert";
import type { ApiProblemDetails } from "../../../shared/api/types";
import { isErr } from "../../../shared/result/result";
import { creatorApi } from "../api/creatorApi";
import type { GlobalReportTemplate, ReportDetail, ReportImportCheck, ReportImportDataSource } from "../types/creatorTypes";
import "./GlobalReportCatalog.css";

interface Props { organizationId: string; onClose: () => void; onImported: (report: ReportDetail) => void; }
const steps = [{ id: 1, label: "Escolher relatório" }, { id: 2, label: "Configurar importação" }] as const;

export function GlobalReportCatalog({ organizationId, onClose, onImported }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [templates, setTemplates] = useState<GlobalReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<GlobalReportTemplate | null>(null);
  const [sources, setSources] = useState<ReportImportDataSource[]>([]);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [dataSourceId, setDataSourceId] = useState("");
  const [title, setTitle] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [tagsReady, setTagsReady] = useState(false);
  const [check, setCheck] = useState<ReportImportCheck | null>(null);
  const [problem, setProblem] = useState<ApiProblemDetails | null>(null);
  const [loadingSources, setLoadingSources] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    body.current?.scrollTo?.({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [step]);

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
    const timer = window.setTimeout(() => {
      void creatorApi.listGlobalTemplates(page, search.trim()).then(result => {
        if (!active) return;
        setLoading(false);
        if (isErr(result)) setProblem(result.error);
        else { setTemplates(result.value.data); setPages(result.value.totalPages); setTotal(result.value.totalRecords); }
      });
    }, search.trim() ? 300 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [page, search]);

  function chooseTemplate(template: GlobalReportTemplate) {
    if (pending.current) return;
    if (template.id !== selectedTemplate?.id) {
      setTitle(template.title);
      setCheck(null);
      setProblem(null);
    }
    setSelectedTemplate(template);
    setStep(2);
  }

  function changePage(next: number) {
    setLoading(true); setTemplates([]); setPage(next);
  }

  async function submit() {
    if (pending.current || step !== 2 || !selectedTemplate || !dataSourceId || !title.trim() || !tagsReady) return;
    const importing = check?.canImport === true;
    pending.current = true; setBusy(true); setProblem(null);
    try {
      const request = { organizationId, dataSourceId, title: title.trim(), tagIds };
      if (importing) {
        const result = await creatorApi.importReport(selectedTemplate.id, request);
        if (isErr(result)) { setProblem(result.error); setCheck(null); }
        else onImported(result.value);
      } else {
        const result = await creatorApi.checkReportImport(selectedTemplate.id, request);
        if (isErr(result)) { setProblem(result.error); setCheck(null); }
        else setCheck(result.value);
      }
    } catch {
      setProblem({ type: "about:blank", instance: "", title: "Erro de conexão", code: "report_import.connection_failed", status: 0, detail: "Não foi possível concluir. Tente novamente." });
      setCheck(null);
    } finally { pending.current = false; setBusy(false); }
  }

  return <section aria-labelledby="global-catalog-title" className="global-report-import">
    <header className="global-report-import__header">
      <h1 id="global-catalog-title">Catálogo de relatórios globais</h1>
      <p>Crie uma cópia independente com os dados e as permissões desta organização.</p>
    </header>
    <nav className="global-report-import__steps" aria-label="Etapas da importação">
      {steps.map((item, index) => <Fragment key={item.id}>
        <button type="button" className="global-report-import__step" aria-current={step === item.id ? "step" : undefined}
          data-completed={step > item.id} disabled={busy || (item.id === 2 && !selectedTemplate)} onClick={() => setStep(item.id)}>
          <span className="global-report-import__step-number" aria-hidden="true">{step > item.id ? <Check size={14}/> : item.id}</span>
          <span>{item.label}</span>
        </button>
        {index === 0 && <ChevronRight size={16} className="global-report-import__step-arrow" aria-hidden="true"/>}
      </Fragment>)}
    </nav>
    <div className="global-report-import__body" ref={body}>
      <div className="global-report-import__content">
        <h2 ref={heading} tabIndex={-1} className="global-report-import__section-title">{step === 1 ? "Escolher relatório" : "Configurar importação"}</h2>
        <ProblemAlert problem={problem}/>
        {step === 1 ? <section aria-label="Modelos disponíveis" className="global-report-catalog">
          <p className="global-report-import__hint">Busque pelo título e selecione um modelo para continuar.</p>
          <div className="global-report-catalog__search"><Search size={18} aria-hidden="true"/><div className="search-input-clear"><input id="global-template-search" aria-label="Buscar relatórios globais" placeholder="Buscar pelo título do relatório..." value={search} onChange={event => { setSearch(event.target.value); setPage(1); setLoading(true); setTemplates([]); }}/><ClearSearchButton value={search} onClear={()=>{setSearch("");setPage(1);setLoading(true);setTemplates([]);}}/></div></div>
          {loading ? <ContentSkeleton variant="list" rows={4} columns={4} message="Consultando modelos de relatórios globais…"/> : <>
            <p className="global-report-catalog__count" role="status">{total} {total === 1 ? "modelo encontrado" : "modelos encontrados"}</p>
            {templates.length === 0 ? <div className="global-report-catalog__empty"><FileBarChart size={32} aria-hidden="true"/><p>{search.trim() ? "Nenhum modelo encontrado para esta busca." : "Nenhum modelo global disponível."}</p>{search.trim() && <small>Tente outro título ou limpe a busca.</small>}</div> : <div className="global-report-catalog__grid">
              {templates.map(template => <button type="button" key={template.id} className="global-report-catalog__card" aria-label={`Selecionar modelo ${template.title}`} aria-pressed={selectedTemplate?.id === template.id} onClick={() => chooseTemplate(template)}>
                <span className="global-report-catalog__icon"><FileBarChart size={22} aria-hidden="true"/></span>
                <span className="global-report-catalog__details"><strong>{template.title}</strong>{template.description && <span className="report-description report-description--summary">{template.description}</span>}<small>Atualizado em {new Date(template.updatedAt).toLocaleDateString("pt-BR")}</small></span>
                {selectedTemplate?.id === template.id ? <Check size={20} className="global-report-catalog__selected" aria-hidden="true"/> : <ChevronRight size={20} aria-hidden="true"/>}
              </button>)}
            </div>}
            {pages > 1 && <nav aria-label="Páginas do catálogo" className="global-report-catalog__pagination"><button className="btn btn-secondary" disabled={page <= 1} onClick={() => changePage(page - 1)}>Anterior</button><span>Página {page} de {pages}</span><button className="btn btn-secondary" disabled={page >= pages} onClick={() => changePage(page + 1)}>Próxima</button></nav>}
          </>}
        </section> : <section aria-label="Configuração da importação" className="global-report-import__configuration">
          <div className="global-report-import__summary">
            <FileBarChart size={22} aria-hidden="true"/>
            <div><span>Modelo escolhido</span><strong>{selectedTemplate?.title}</strong></div>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setStep(1)}>Trocar relatório</button>
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="import-source">Data source de destino</label>
            <select className="form-input" id="import-source" value={dataSourceId} disabled={busy || loadingSources} onChange={event => { setDataSourceId(event.target.value); setCheck(null); }}><option value="">Selecione um data source</option>{sources.map(source => <option key={source.id} value={source.id}>{source.name}</option>)}</select>
            {loadingSources ? <NeutralLoader compact message="Consultando fontes ativas e validadas para importação…"/> : sources.length === 0 && <p className="global-report-import__hint">Nenhum data source ativo e verificado disponível. Solicite a configuração ao administrador.</p>}
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="import-title">Título da cópia</label>
            <input className="form-input" id="import-title" value={title} disabled={busy} onChange={event => setTitle(event.target.value)}/>
          </div>
          {selectedTemplate?.description && <p className="report-description">{selectedTemplate.description}</p>}
          <ReportTagPicker organizationId={organizationId} selected={tagIds} onReady={setTagsReady} onChange={ids => { setTagIds(ids); setCheck(null); }} disabled={busy}/>
          {check && <div className="global-report-import__diagnostics" aria-live="polite">
            {check.joinModels && check.joinModels.length>0&&<section><h3>Junções da organização</h3><p>A importação reutiliza ou cria cópias locais, sem conceder permissões.</p><ul>{check.joinModels.map((model,index)=><li key={index}>{model.name} · {model.action==="create"?"Será criada uma cópia independente":"Modelo local será reutilizado"}</li>)}</ul></section>}
            {check.canImport ? <Alert type="success" message="Modelo compatível. A cópia será criada como privada."/> : <div role="alert"><p>Não é possível importar:</p><ul>{check.issues.map((issue, index) => <li key={index}>{issue.message} <small>({issue.path})</small></li>)}</ul></div>}
          </div>}
        </section>}
      </div>
    </div>
    <footer className="global-report-import__footer">
      <button type="button" className="btn btn-secondary" disabled={busy} onClick={step === 1 ? onClose : () => setStep(1)}>{step === 1 ? "Voltar à organização" : "Voltar"}</button>
      {step === 1 ? selectedTemplate && <button className="btn btn-primary" onClick={() => setStep(2)}>Continuar</button> :
        <button type="button" className="btn btn-primary" disabled={busy || loadingSources || !dataSourceId || !title.trim() || !tagsReady} onClick={() => void submit()}>
          {busy ? (check?.canImport ? "Importando..." : "Verificando...") : check?.canImport ? "Importar relatório" : "Verificar compatibilidade"}
        </button>}
    </footer>
  </section>;
}
