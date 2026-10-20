import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Alert, ProblemAlert } from "../../../shared/components/Alert";
import type { ApiProblemDetails } from "../../../shared/api/types";
import { isErr } from "../../../shared/result/result";
import { creatorApi } from "../api/creatorApi";
import type { GlobalReportTemplate, ReportDetail, ReportImportCheck, ReportImportDataSource } from "../types/creatorTypes";

interface Props { organizationId: string; onClose: () => void; onImported: (report: ReportDetail) => void; }

export function ImportGlobalReportModal({ organizationId, onClose, onImported }: Props) {
  const [templates, setTemplates] = useState<GlobalReportTemplate[]>([]);
  const [sources, setSources] = useState<ReportImportDataSource[]>([]);
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
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => { const el = dialog.current; el?.showModal(); return () => el?.close(); }, []);
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
    void creatorApi.listGlobalTemplates(page).then(result => {
      if (!active) return;
      setLoading(false);
      if (isErr(result)) setProblem(result.error);
      else { setTemplates(result.value.data); setPages(result.value.totalPages); }
    });
    return () => { active = false; };
  }, [page]);

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

  return <dialog ref={dialog} aria-labelledby="import-global-title" className="glass-card" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} style={{ width: "min(640px, calc(100vw - 2rem))", maxHeight: "85vh", overflowY: "auto", padding: "1.75rem", margin: "auto", color: "var(--text-primary)", background: "var(--surface-color)", border: "1px solid var(--border-color)", borderRadius: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2 id="import-global-title">Importar relatório global</h2><button className="btn-icon" aria-label="Fechar importação" disabled={busy} onClick={onClose}><X size={20}/></button></div>
    <p>Crie uma cópia independente nesta organização. As permissões e os dados serão os da organização atual.</p>
    <ProblemAlert problem={problem}/>
    {loading ? <p role="status">Carregando modelos...</p> : templates.length === 0 ? <p>Nenhum modelo global disponível.</p> : <>
      <label className="form-label" htmlFor="import-template">Modelo global</label>
      <select className="form-input" id="import-template" value={templateId} disabled={busy} onChange={event => { const id = event.target.value; setTemplateId(id); setTitle(templates.find(t => t.id === id)?.title || ""); setCheck(null); }}>
        <option value="">Selecione um modelo</option>{templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
      </select>
      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "0.75rem 0" }}><button className="btn btn-secondary" disabled={busy || page <= 1} onClick={() => { setLoading(true); setTemplates([]); setProblem(null); setPage(page - 1); setTemplateId(""); setCheck(null); }}>Anterior</button><span>Página {page} de {pages}</span><button className="btn btn-secondary" disabled={busy || page >= pages} onClick={() => { setLoading(true); setTemplates([]); setProblem(null); setPage(page + 1); setTemplateId(""); setCheck(null); }}>Próxima</button></div>
    </>}
    <label className="form-label" htmlFor="import-source">Data source de destino</label>
    <select className="form-input" id="import-source" value={dataSourceId} disabled={busy || loadingSources} onChange={event => { setDataSourceId(event.target.value); setCheck(null); }}><option value="">Selecione um data source</option>{sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
    {loadingSources ? <p role="status">Carregando data sources...</p> : sources.length === 0 && <p>Nenhum data source ativo e verificado disponível. Solicite a configuração ao administrador.</p>}
    <label className="form-label" htmlFor="import-title">Título da cópia</label><input className="form-input" id="import-title" value={title} disabled={busy} onChange={event => setTitle(event.target.value)}/>
    {check && (check.canImport ? <Alert type="success" message="Modelo compatível. A cópia será criada como privada."/> : <div role="alert"><p>Não é possível importar:</p><ul>{check.issues.map((issue, i) => <li key={i}>{issue.message} <small>({issue.path})</small></li>)}</ul></div>)}
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
      <button className="btn btn-secondary" disabled={busy} onClick={onClose}>Cancelar</button>
      <button className="btn btn-secondary" disabled={busy || loading || !templateId || !dataSourceId} onClick={() => void submit(false)}>Verificar compatibilidade</button>
      <button className="btn btn-primary" disabled={busy || !check?.canImport || !title.trim()} onClick={() => void submit(true)}>{busy ? "Processando..." : "Importar"}</button>
    </div>
  </dialog>;
}
