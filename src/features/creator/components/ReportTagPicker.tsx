import { ChevronDown, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { creatorApi } from "../api/creatorApi";
import { isErr } from "../../../shared/result/result";
import { Alert } from "../../../shared/components/Alert";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { ClearSearchButton } from "../../../shared/components/ClearSearchButton";
import { SearchMatchOptions } from "../../../shared/components/SearchMatchOptions";
import { matchesTextSearch } from "../../../shared/utils/textSearch";
import type { ReportTag } from "../types/creatorTypes";
import "../styles/reportMetadata.css";

export function TagChoices({ tags, selected, onChange, disabled = false, showOrganization = false }: { tags: ReportTag[]; selected: string[]; onChange: (ids: string[]) => void; disabled?: boolean; showOrganization?: boolean }) {
  const [search, setSearch] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [exactMatch, setExactMatch] = useState(false);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLFieldSetElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const panelId = useId();
  const tagLabel = (tag: ReportTag) => showOrganization ? `${tag.name} · ${tag.organizationName?.trim() || "Empresa indisponível"}` : tag.name;
  const filtered = tags.filter(tag => matchesTextSearch(tagLabel(tag), search, { matchCase, exactMatch }));
  const allSelected = filtered.length > 0 && filtered.every(tag => selected.includes(tag.id));
  useEffect(() => {
    const outside = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("click", outside);
    return () => document.removeEventListener("click", outside);
  }, []);
  return <fieldset ref={root} className="report-tag-picker" disabled={disabled} onKeyDown={event => {
    if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); input.current?.focus(); setOpen(false); }
  }}><legend>Etiquetas</legend>
    <div className="report-tag-select-field">
      <div className="report-tag-select-values">{selected.map(id => {
        const tag = tags.find(tag => tag.id === id);
        return <span className="report-tag-selected-chip" key={id}><span>{tag ? tagLabel(tag) : "Etiqueta indisponível"}</span><button type="button" aria-label={"Remover etiqueta " + (tag ? tagLabel(tag) : "indisponível")} onClick={() => onChange(selected.filter(value => value !== id))}><X size={14} aria-hidden="true"/></button></span>;
      })}<div className="search-input-clear"><input ref={input} aria-label="Buscar etiquetas" aria-controls={panelId} aria-expanded={open && !disabled} value={search} onFocus={() => setOpen(true)} onChange={event => { setSearch(event.target.value); setOpen(true); }} onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); } }} placeholder={selected.length ? "Adicionar etiqueta…" : "Selecionar etiquetas…"}/><ClearSearchButton value={search} onClear={() => setSearch("")}/></div></div>
      <div className="report-tag-select-actions">{selected.length > 0 && <button type="button" aria-label="Limpar etiquetas selecionadas" onClick={() => onChange([])}><X size={18} aria-hidden="true"/></button>}<button type="button" aria-label={open ? "Fechar opções de etiquetas" : "Abrir opções de etiquetas"} aria-expanded={open && !disabled} aria-controls={panelId} onClick={() => setOpen(value => !value)}><ChevronDown size={18} aria-hidden="true"/></button></div>
    </div>
    {open && !disabled && <div id={panelId} className="report-tag-select-dropdown" role="group" aria-label="Opções de etiquetas">
      <div className="report-tag-select-toolbar"><span role="status">{selected.length} selecionadas</span><SearchMatchOptions matchCase={matchCase} exactMatch={exactMatch} onMatchCaseChange={setMatchCase} onExactMatchChange={setExactMatch}/></div>
      {filtered.length > 0 && <button type="button" className="report-tag-bulk" onClick={() => onChange(allSelected ? selected.filter(id => !filtered.some(tag => tag.id === id)) : [...new Set([...selected, ...filtered.map(tag => tag.id)])])}>{allSelected ? "Desmarcar resultados da busca" : "Marcar resultados da busca"}</button>}
      <div className="report-tag-select-options">{filtered.map(tag => <label key={tag.id} className="report-tag-select-option"><input type="checkbox" checked={selected.includes(tag.id)} onChange={event => onChange(event.target.checked ? [...selected, tag.id] : selected.filter(id => id !== tag.id))}/><span>{tagLabel(tag)}</span></label>)}</div>
      {filtered.length === 0 && <p className="report-tag-select-empty">Nenhuma etiqueta encontrada.</p>}
    </div>}
  </fieldset>;
}

export function ReportTagPicker({ organizationId, selected, onChange, disabled, onReady }: { organizationId: string; selected: string[]; onChange: (ids: string[]) => void; disabled?: boolean; onReady?: (ready: boolean) => void }) {
  const [tags, setTags] = useState<ReportTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError(""); onReady?.(false);
    void creatorApi.listReportTags(organizationId).then(result => {
      if (!active) return;
      if (isErr(result)) setError(result.error.detail || "Não foi possível consultar etiquetas.");
      else { setTags(result.value); onReady?.(true); }
    }).catch(() => { if (active) setError("Falha de comunicação ao consultar etiquetas."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [organizationId, retry, onReady]);
  if (loading) return <NeutralLoader compact message="Consultando etiquetas da organização…"/>;
  if (error) return <div><Alert type="error" message={error}/><button type="button" className="btn btn-secondary" onClick={() => setRetry(value => value + 1)}>Consultar etiquetas novamente</button></div>;
  return <TagChoices tags={tags} selected={selected} onChange={onChange} disabled={disabled}/>;
}
