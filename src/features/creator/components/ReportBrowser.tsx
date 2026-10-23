import { SourceActionMenu } from "../../catalog/components/SourceActionMenu";
import { ConfirmDeleteModal } from "../../organizations/components/ConfirmDeleteModal";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { creatorApi } from "../api/creatorApi";
import { isErr } from "../../../shared/result/result";
import { Alert } from "../../../shared/components/Alert";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { ClearSearchButton } from "../../../shared/components/ClearSearchButton";
import { SearchMatchOptions } from "../../../shared/components/SearchMatchOptions";
import { getResourceRoleLabel } from "../../../shared/utils/roles";
import type { ReportListItem, ReportTag } from "../types/creatorTypes";
import { ReportMetadata } from "./ReportMetadata";
import { TagChoices } from "./ReportTagPicker";

export function ReportBrowser({ organizationId, onTotal, version = 0 }: { organizationId?: string; onTotal?: (count: number) => void; version?: number }) {
  const [deleting, setDeleting] = useState<ReportListItem | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const deleteLock = useRef(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const [params, setParams] = useSearchParams();
  const search = params.get("search") || "";
  const matchCase = params.get("matchCase") === "true", exactMatch = params.get("exactMatch") === "true";
  const rawPage = Number(params.get("page"));
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const untagged = params.get("untagged") === "true";
  const selected = params.getAll("tagIds");
  const queryKey = params.toString();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [tags, setTags] = useState<ReportTag[]>([]);
  const [pages, setPages] = useState(0), [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [tagError, setTagError] = useState("");
  const [retry, setRetry] = useState(0);
  const [filtersExpanded, setFiltersExpanded] = useState(selected.length > 0 || untagged);
  function change(key: string, value: string | string[]) {
    const next = new URLSearchParams(params); next.delete(key); next.delete("page");
    for (const item of Array.isArray(value) ? value : [value]) if (item) next.append(key, item);
    setParams(next);
  }
  async function removeReport() {
    if (!deleting || deleteLock.current) return false;
    deleteLock.current = true;
    setDeleteError("");
    try {
      const result = await creatorApi.deleteReport(deleting.id);
      if (isErr(result)) { setDeleteError(result.error.detail || "Não foi possível excluir o relatório."); return false; }
      setReports(current => current.filter(report => report.id !== deleting.id));
      setNotice(`Relatório “${deleting.title}” excluído.`);
      if (reports.length === 1 && page > 1) {
        const next = new URLSearchParams(params); next.set("page", String(page - 1)); setParams(next);
      }
      setRetry(value => value + 1);
      searchInput.current?.focus();
      return true;
    } catch { setDeleteError("Falha de comunicação. Tente novamente."); return false; }
    finally { deleteLock.current = false; }
  }
  useEffect(() => {
    let active = true; setTagError("");
    void creatorApi.listReportTags(organizationId).then(result => {
      if (!active) return;
      if (isErr(result)) setTagError(result.error.detail || "Não foi possível consultar etiquetas.");
      else setTags(result.value);
    }).catch(() => { if (active) setTagError("Falha de comunicação ao consultar etiquetas."); });
    return () => { active = false; };
  }, [organizationId, retry, version]);
  useEffect(() => {
    let active = true; setLoading(true); setError("");
    const timer = window.setTimeout(() => {
      void creatorApi.listReports(page, 20, { organizationId, search, matchCase, exactMatch, tagIds: selected, untagged }).then(result => {
        if (!active) return;
        if (isErr(result)) setError(result.error.detail || "Não foi possível consultar os relatórios.");
        else { setReports(result.value.data); setPages(result.value.totalPages); setTotal(result.value.totalRecords); onTotal?.(result.value.totalRecords); }
      }).catch(() => { if (active) setError("Falha de comunicação ao consultar relatórios."); }).finally(() => { if (active) setLoading(false); });
    }, search ? 250 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  // The complete URL determines filters, including browser back/forward.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, organizationId, retry, version, onTotal]);
  return <div className="report-browser">
    <div className="report-browser-toolbar"><div className="report-search"><div className="search-input-clear"><input ref={searchInput} className="form-input" aria-label="Buscar relatórios" placeholder="Buscar título ou descrição" value={search} onChange={event => change("search", event.target.value)}/><ClearSearchButton value={search} onClear={() => change("search", "")}/></div><SearchMatchOptions matchCase={matchCase} exactMatch={exactMatch} onMatchCaseChange={value => change("matchCase", value ? "true" : "")} onExactMatchChange={value => change("exactMatch", value ? "true" : "")}/></div>
    <button type="button" className="btn btn-secondary report-filter-toggle" aria-controls="report-tag-filters" aria-expanded={filtersExpanded} onClick={() => setFiltersExpanded(value => !value)}><SlidersHorizontal size={16} aria-hidden="true"/>Filtrar por etiquetas ({selected.length})<ChevronDown size={16} aria-hidden="true"/></button></div>
    {filtersExpanded && <section id="report-tag-filters" className="report-filter-panel" aria-label="Filtros por etiquetas">{tagError ? <div><Alert type="error" message={tagError}/><button type="button" className="btn btn-secondary" onClick={() => setRetry(value => value + 1)}>Consultar etiquetas novamente</button></div> : <TagChoices tags={tags} showOrganization={!organizationId} selected={selected} disabled={untagged} onChange={ids => change("tagIds", ids)}/>}
      <div className="report-filter-footer"><label className="report-checkbox"><input type="checkbox" checked={untagged} onChange={event => change("untagged", event.target.checked ? "true" : "")}/> Sem etiquetas</label><p>Encontre relatórios com qualquer uma das etiquetas selecionadas.</p></div></section>}
    {notice && <p role="status">{notice}</p>}
    {loading ? <NeutralLoader message="Consultando relatórios com os filtros selecionados…"/> : error ? <div><Alert type="error" message={error}/><button type="button" className="btn btn-secondary" onClick={() => setRetry(value => value + 1)}>Consultar relatórios novamente</button></div> : <>
      <p role="status">{total} relatórios encontrados</p>
      {reports.length === 0 ? <div className="empty-state"><strong>{!search && selected.length === 0 && !untagged && page === 1 ? "Nenhum relatório disponível" : "Nenhum relatório encontrado"}</strong><p>Altere os filtros ou volte à primeira página. Relatórios compartilhados com você aparecerão aqui.</p></div> : <div className="report-browser-list">{reports.map(report => <article key={report.id} className="report-browser-row"><div><strong>{report.title}</strong><small>{report.organizationName} · {report.visibilityScope === "private" ? "Privado" : report.visibilityScope === "global" ? "Global" : "Organização"} · {getResourceRoleLabel(report.myRole)}</small><ReportMetadata description={report.description} tags={report.tags}/></div><div className="report-browser-actions"><Link className="btn btn-primary" to={'/reports/'+report.id+'/run'} aria-label={'Executar relatório '+report.title}>Abrir</Link>{organizationId && ["root", "administrator", "creator", "owner"].includes(report.myRole) && <SourceActionMenu label="Opções"><Link to={'/organizations/'+organizationId+'/creator/reports/'+report.id} aria-label={'Editar relatório '+report.title}>Editar relatório</Link><button type="button" className="btn-danger" aria-label={'Excluir relatório '+report.title} onClick={() => { setDeleting(report); setDeleteError(""); setNotice(""); }}>Excluir relatório</button></SourceActionMenu>}</div></article>)}</div>}
      {(pages > 1 || page > 1) && <nav className="report-pagination" aria-label="Páginas dos relatórios"><button className="btn btn-secondary" disabled={page <= 1} onClick={() => { const next = new URLSearchParams(params); next.set("page",String(page-1)); setParams(next); }}>Anterior</button><span>Página {page} de {pages || 1}</span><button className="btn btn-secondary" disabled={page >= pages} onClick={() => { const next = new URLSearchParams(params); next.set("page",String(page+1)); setParams(next); }}>Próxima</button></nav>}
    </>}
    <ConfirmDeleteModal isOpen={deleting !== null} onClose={() => setDeleting(null)} onConfirm={removeReport} title="Excluir relatório" itemName={deleting?.title || ""} warningText="O relatório deixará de estar disponível, inclusive para quem tem acesso compartilhado. Os dados da fonte e os outros relatórios serão preservados." problem={null} errorMessage={deleteError}/>
  </div>;
}
