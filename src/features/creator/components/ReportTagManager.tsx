import { Pencil, Tag, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { creatorApi } from "../api/creatorApi";
import { isErr } from "../../../shared/result/result";
import { Alert } from "../../../shared/components/Alert";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { ClearSearchButton } from "../../../shared/components/ClearSearchButton";
import { SearchMatchOptions } from "../../../shared/components/SearchMatchOptions";
import { matchesTextSearch } from "../../../shared/utils/textSearch";
import { useModalFocus } from "../../../shared/hooks/useModalFocus";
import { ConfirmDeleteModal } from "../../organizations/components/ConfirmDeleteModal";
import type { ReportTag } from "../types/creatorTypes";
import "../styles/reportMetadata.css";

export function ReportTagManager({ organizationId, onClose, onChanged }: { organizationId: string; onClose: () => void; onChanged: () => void }) {
  const [tags, setTags] = useState<ReportTag[]>([]), [editing, setEditing] = useState<ReportTag | null>(null), [deleting, setDeleting] = useState<ReportTag | null>(null);
  const [name, setName] = useState(""), [search, setSearch] = useState("");
  const [matchCase, setMatchCase] = useState(false), [exactMatch, setExactMatch] = useState(false);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(""), [deleteError, setDeleteError] = useState("");
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState(""), [retry, setRetry] = useState(0);
  const lock = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const filteredTags = tags.filter(tag => matchesTextSearch(tag.name, search, { matchCase, exactMatch }));
  const dialog = useModalFocus(true, onClose, busy);
  useEffect(() => {
    let active = true; setLoading(true); setError(""); setReady(false);
    void creatorApi.listReportTags(organizationId).then(result => {
      if (!active) return;
      if (isErr(result)) setError(result.error.detail || "Não foi possível consultar etiquetas."); else { setTags(result.value); setReady(true); }
    }).catch(() => { if (active) setError("Falha de comunicação ao consultar etiquetas."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [organizationId, retry]);
  async function save() {
    if (lock.current || !ready || loading || !name.trim()) return;
    lock.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const result = await creatorApi.saveReportTag(organizationId, name.trim(), editing?.id);
      if (isErr(result)) setError(result.error.detail || "Não foi possível salvar a etiqueta.");
      else { setTags(current => [...current.filter(tag => tag.id !== result.value.id), result.value].sort((a,b) => a.name.localeCompare(b.name,"pt-BR"))); setEditing(null); setName(""); setNotice("Etiqueta salva."); onChanged(); }
    } catch { setError("Falha de comunicação. Seus dados foram preservados; tente novamente."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function remove() {
    if (!deleting || lock.current) return false;
    lock.current = true; setBusy(true); setDeleteError("");
    try {
      const result = await creatorApi.deleteReportTag(organizationId, deleting.id);
      if (isErr(result)) { setDeleteError(result.error.detail || "Não foi possível excluir a etiqueta."); return false; }
      setTags(current => current.filter(tag => tag.id !== deleting.id));
      if (editing?.id === deleting.id) { setEditing(null); setName(""); }
      setNotice("Etiqueta excluída. Os relatórios foram preservados."); onChanged(); return true;
    } catch { setDeleteError("Falha de comunicação. Tente novamente."); return false; }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="report-tag-manager"><div className="card organization-dialog report-tag-manager-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="tag-manager-title" tabIndex={-1}>
    <header className="report-tag-manager-header"><div><div className="report-tag-manager-heading"><Tag size={22} aria-hidden="true"/><h2 id="tag-manager-title">Gerenciar etiquetas</h2></div><p>Organize os relatórios desta organização com etiquetas.</p></div><button type="button" className="report-tag-icon-button" aria-label="Fechar gerenciamento de etiquetas" disabled={busy} onClick={onClose}><X size={20}/></button></header>
    <div className="report-tag-manager-body">{error && <Alert type="error" message={error}/>} {notice && <p role="status">{notice}</p>}
      {loading ? <NeutralLoader message="Consultando etiquetas da organização…"/> : <>
        <form className="report-tag-form" onSubmit={event => { event.preventDefault(); void save(); }}><div className="input-group"><label className="input-label" htmlFor="report-tag-name">{editing ? "Renomear etiqueta" : "Nova etiqueta"}</label><input ref={nameInput} id="report-tag-name" className="input-field" placeholder="Ex.: Vendas, Compras, Financeiro" maxLength={100} value={name} onChange={event => setName(event.target.value)} disabled={busy}/></div><div className="report-tag-form-actions"><button className="btn btn-primary" disabled={busy || !ready || !name.trim()}>{busy ? "Salvando…" : "Salvar etiqueta"}</button>{editing && <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => { setEditing(null); setName(""); }}>Cancelar edição</button>}</div></form>
        <section className="report-tag-catalog" aria-labelledby="tag-catalog-title"><div className="report-tag-catalog-heading"><h3 id="tag-catalog-title">Etiquetas cadastradas</h3><span>{tags.length}</span></div><div className="report-search"><div className="search-input-clear"><input className="form-input" aria-label="Buscar etiquetas" placeholder="Buscar etiquetas" value={search} onChange={event => setSearch(event.target.value)}/><ClearSearchButton value={search} onClear={() => setSearch("")}/></div><SearchMatchOptions matchCase={matchCase} exactMatch={exactMatch} onMatchCaseChange={setMatchCase} onExactMatchChange={setExactMatch}/></div>
        <ul className="report-tag-manager-list">{filteredTags.map(tag => <li key={tag.id}><div className="report-tag-manager-name"><Tag size={16} aria-hidden="true"/><span>{tag.name}</span></div><div className="report-tag-row-actions"><button type="button" className="report-tag-icon-button" disabled={busy} onClick={() => { setEditing(tag); setName(tag.name); setError(""); nameInput.current?.focus(); }} aria-label={"Renomear "+tag.name} title="Renomear etiqueta"><Pencil size={17}/></button><button type="button" className="report-tag-icon-button report-tag-delete" disabled={busy} onClick={() => { setDeleting(tag); setDeleteError(""); }} aria-label={"Excluir "+tag.name} title="Excluir etiqueta"><Trash2 size={17}/></button></div></li>)}</ul>{ready && filteredTags.length === 0 && <div className="empty-state"><strong>{tags.length === 0 ? "Nenhuma etiqueta cadastrada" : "Nenhuma etiqueta encontrada"}</strong><p>{tags.length === 0 ? "Cadastre a primeira etiqueta no formulário acima." : "Altere ou limpe a busca para ver outras etiquetas."}</p></div>}</section>
      </>}
      {error && <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setRetry(value => value + 1)}>Consultar etiquetas novamente</button>}
    </div><footer className="report-tag-manager-footer"><small>Etiquetas não alteram permissões dos relatórios.</small><button className="btn btn-secondary" disabled={busy} onClick={onClose}>Fechar</button></footer>
    <ConfirmDeleteModal isOpen={deleting !== null} onClose={() => setDeleting(null)} onConfirm={remove} title="Excluir etiqueta" itemName={deleting?.name || ""} warningText="A etiqueta será retirada de todos os relatórios desta organização. Os relatórios e suas permissões serão preservados." problem={null} errorMessage={deleteError}/>
  </div></div>;
}
