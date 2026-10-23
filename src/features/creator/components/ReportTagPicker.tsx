import { useEffect, useState } from "react";
import { creatorApi } from "../api/creatorApi";
import { isErr } from "../../../shared/result/result";
import { Alert } from "../../../shared/components/Alert";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { ClearSearchButton } from "../../../shared/components/ClearSearchButton";
import { SearchMatchOptions } from "../../../shared/components/SearchMatchOptions";
import { matchesTextSearch } from "../../../shared/utils/textSearch";
import type { ReportTag } from "../types/creatorTypes";
import "../styles/reportMetadata.css";

export function TagChoices({ tags, selected, onChange, disabled = false }: { tags: ReportTag[]; selected: string[]; onChange: (ids: string[]) => void; disabled?: boolean }) {
  const [search, setSearch] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [exactMatch, setExactMatch] = useState(false);
  const filtered = tags.filter(tag => matchesTextSearch(tag.name, search, { matchCase, exactMatch }));
  const allSelected = filtered.length > 0 && filtered.every(tag => selected.includes(tag.id));
  return <fieldset className="report-tag-picker" disabled={disabled}><legend>Etiquetas</legend>
    <div className="report-search"><div className="search-input-clear"><input className="form-input" aria-label="Buscar etiquetas" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar etiquetas"/><ClearSearchButton value={search} onClear={() => setSearch("")}/></div><SearchMatchOptions matchCase={matchCase} exactMatch={exactMatch} onMatchCaseChange={setMatchCase} onExactMatchChange={setExactMatch}/></div>
    <p>{selected.length} selecionadas. A seleção é mantida ao buscar.</p>
    {filtered.length > 0 && <button type="button" className="btn btn-secondary" onClick={() => onChange(allSelected ? selected.filter(id => !filtered.some(tag => tag.id === id)) : [...new Set([...selected, ...filtered.map(tag => tag.id)])])}>{allSelected ? "Desmarcar resultados da busca" : "Marcar resultados da busca"}</button>}
    <div className="report-tag-choices">{filtered.map(tag => <label key={tag.id}><input type="checkbox" checked={selected.includes(tag.id)} onChange={event => onChange(event.target.checked ? [...selected, tag.id] : selected.filter(id => id !== tag.id))}/><span>{tag.name}</span></label>)}</div>
    {filtered.length === 0 && <p>Nenhuma etiqueta encontrada.</p>}
    {selected.some(id => !tags.some(tag => tag.id === id)) && <button type="button" className="btn btn-secondary" onClick={() => onChange(selected.filter(id => tags.some(tag => tag.id === id)))}>Remover etiquetas indisponíveis da seleção</button>}
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
