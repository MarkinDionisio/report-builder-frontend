import { useEffect, useRef, useState } from "react";
import { catalogApi } from "../api/catalogApi";
import { isErr } from "../../../shared/result/result";
import { matchesTextSearch } from "../../../shared/utils/textSearch";
import { SearchMatchOptions } from "../../../shared/components/SearchMatchOptions";
import type { ImportSchemaPreview, IntrospectionObject } from "../types/catalogTypes";
interface Item { object: IntrospectionObject; preview?: ImportSchemaPreview; error?: string; imported?: boolean; }
const keyOf = (object: IntrospectionObject) => JSON.stringify([object.schemaName, object.objectName]);
export function ImportSourceTablesModal({ sourceId, sourceName, onClose, onChanged, onReview }: { sourceId: string; sourceName: string; onClose: () => void; onChanged: () => void; onReview?: () => void }) {
  const [objects, setObjects] = useState<IntrospectionObject[]>([]);
  const [selected, setSelected] = useState(new Set<string>());
  const [search, setSearch] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [exactMatch, setExactMatch] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [operation,setOperation]=useState<"objects"|"preview"|"import">("objects");
  const [busy, setBusy] = useState(true);
  const [stage, setStage] = useState<"choose" | "preview" | "result">("choose");
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    void catalogApi.listIntrospectionObjects(sourceId).then(result => {
      if (!active) return;
      if (isErr(result)) setError(result.error.detail || "Não foi possível consultar as tabelas do banco.");
      else setObjects(result.value);
      setBusy(false);
    }).catch(() => { if(active) { setError("Falha de comunicação ao consultar as tabelas do banco. Feche e tente novamente."); setBusy(false); } });
    return () => { active = false; };
  }, [sourceId]);
  const filtered = objects.filter(object => [object.schemaName, object.objectName, object.schemaName + "." + object.objectName].some(value => matchesTextSearch(value, search.trim(), { matchCase, exactMatch })));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 50) - 1));
  const request = (object: IntrospectionObject) => ({ dataSourceId: sourceId, internalSchemaName: object.schemaName, internalObjectName: object.objectName, publicType: "object" });
  async function preview() {
    if (lock.current || selected.size === 0) return;
    lock.current = true; setBusy(true); setOperation("preview"); setError("");
    try {
      const results: Item[] = [];
      for (const object of objects.filter(object => selected.has(keyOf(object)))) {
        const result = await catalogApi.previewImportSchema(request(object));
        results.push(isErr(result) ? { object, error: result.error.detail || "Falha ao gerar prévia." } : { object, preview: result.value });
      }
      setItems(results); setStage("preview");
    } catch { setError("Não foi possível gerar a prévia. Tente novamente."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function apply(retry: boolean) {
    if (lock.current) return;
    const pending = items.filter(item => !item.imported && (retry ? Boolean(item.error) : Boolean(item.preview)));
    if (pending.length === 0) return;
    lock.current = true; setBusy(true); setOperation("import"); setError("");
    let changed = false;
    try {
      const updated = [...items];
      for (const item of pending) {
        let next: Item;
        let draft = item;
        try {
          if(!item.preview) { const preview = await catalogApi.previewImportSchema(request(item.object)); if(isErr(preview)) { const index=updated.findIndex(v=>keyOf(v.object)===keyOf(item.object)); updated[index]={...item,error:preview.error.detail||"Falha ao gerar prévia."};setItems([...updated]);continue;} draft={...item,preview:preview.value}; }
          const result = await catalogApi.importSchema(request(item.object));
          next = isErr(result) ? { ...draft, error: result.error.detail || "Falha ao importar a tabela." } : { ...draft, imported: true, error: undefined };
        } catch { next = { ...item, error: "Falha de comunicação. Tente novamente esta tabela." }; }
        changed ||= Boolean(next.imported);
        updated[updated.findIndex(value => keyOf(value.object) === keyOf(item.object))] = next;
        setItems([...updated]);
      }
      setStage("result");
    } finally {
      if (changed) onChanged();
      lock.current = false; setBusy(false);
    }
  }
  return <div className="modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="source-import-title" className="modal-container catalog-template-workflow" style={{ maxWidth: 850 }}>
    <header className="modal-header"><h3 id="source-import-title">Importar do banco · {sourceName}</h3><button className="btn btn-secondary" disabled={busy} onClick={onClose}>Fechar</button></header>
    <div className="source-import-body">
      <p>Escolha as tabelas ou views que poderão ser usadas nos relatórios. Os campos serão cadastrados para revisão no próximo passo; os dados do banco não são copiados.</p>
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">{operation === "objects" ? "Consultando tabelas e views do banco…" : operation === "preview" ? "Preparando a prévia das tabelas selecionadas…" : "Importando tabelas e campos selecionados…"} Aguarde.</p>}
      {stage === "choose" ? <>
        <label>Buscar tabela ou view<input className="form-input" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></label>
        <SearchMatchOptions matchCase={matchCase} exactMatch={exactMatch} onMatchCaseChange={setMatchCase} onExactMatchChange={setExactMatch} />
        <div className="source-actions"><button className="btn btn-secondary" disabled={busy || filtered.length === 0} onClick={() => setSelected(previous => new Set([...previous, ...filtered.map(keyOf)]))}>Marcar resultados</button><button className="btn btn-secondary" disabled={busy || selected.size === 0} onClick={() => setSelected(previous => new Set([...previous].filter(id => !filtered.some(object => keyOf(object) === id))))}>Desmarcar resultados</button></div>
        <p>{filtered.length} tabelas/views encontradas · {selected.size} selecionadas, incluindo outras páginas e filtros.</p>
        {!busy && filtered.length === 0 && <p>Nenhuma tabela ou view encontrada.</p>}
        {filtered.slice(currentPage * 50, currentPage * 50 + 50).map(object => <label className="source-import-table" key={keyOf(object)}><input type="checkbox" disabled={busy} checked={selected.has(keyOf(object))} onChange={event => setSelected(previous => { const next = new Set(previous); if (event.target.checked) next.add(keyOf(object)); else next.delete(keyOf(object)); return next; })} /><span>{object.schemaName}.{object.objectName}<small>{object.objectType === "view" ? "View" : "Tabela"}</small></span></label>)}
        {filtered.length > 50 && <div className="source-actions"><button className="btn btn-secondary" disabled={currentPage === 0 || busy} onClick={() => setPage(currentPage - 1)}>Anterior</button><span>Página {currentPage + 1} de {Math.ceil(filtered.length / 50)}</span><button className="btn btn-secondary" disabled={(currentPage + 1) * 50 >= filtered.length || busy} onClick={() => setPage(currentPage + 1)}>Próxima</button></div>}
      </> : items.map(item => <article className="source-import-result" key={keyOf(item.object)}><strong>{item.object.schemaName}.{item.object.objectName}</strong>{item.preview && <p>{item.preview.fields.filter(field => !field.alreadyExists).length} novos campos · {item.preview.fields.filter(field => field.alreadyExists).length} campos já cadastrados. Configurações existentes serão preservadas.</p>}{item.preview && <details><summary>Revisar campos propostos de {item.object.objectName}</summary><ul>{item.preview.fields.map(field=><li key={field.internalFieldName}><strong>{field.publicName || field.internalFieldName}</strong> · {field.publicType} · {field.isNullable?"Aceita nulo":"Não nulo"} · {field.alreadyExists?"Já cadastrado; configuração preservada":"Novo campo"}</li>)}</ul></details>}{item.imported && <p>Importação concluída.</p>}{item.error && <p className="source-error">{item.error}</p>}</article>)}
    </div>
    <footer className="catalog-template-footer"><span>{stage === "result" ? `${items.filter(item => item.imported).length} tabelas importadas` : `${selected.size} tabelas selecionadas`}</span>
      {stage === "choose" && <button className="btn btn-primary" disabled={busy || selected.size === 0} onClick={() => void preview()}>Revisar prévia</button>}
      {stage === "preview" && <><button className="btn btn-secondary" disabled={busy} onClick={() => setStage("choose")}>Alterar seleção</button><button className="btn btn-primary" disabled={busy || !items.some(item => item.preview)} onClick={() => void apply(false)}>Importar tabelas compatíveis</button></>}
      {stage === "result" && <>{items.some(item => item.error && !item.imported) && <button className="btn btn-secondary" disabled={busy} onClick={() => void apply(true)}>Tentar novamente somente as falhas</button>}<button className="btn btn-primary" disabled={busy} onClick={onReview || onClose}>Revisar campos</button></>}
    </footer>
  </section></div>;
}
