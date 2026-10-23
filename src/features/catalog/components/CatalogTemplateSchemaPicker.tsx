import { diagnosticMessage } from "../../../shared/presentation/messages";
import { ClearSearchButton } from "../../../shared/components/ClearSearchButton";
import { SearchMatchOptions } from "../../../shared/components/SearchMatchOptions";
import { matchesTextSearch } from "../../../shared/utils/textSearch";
import { useId, useState } from "react";
import { ChevronDown, ChevronRight, Database, Search } from "lucide-react";
import type { CatalogTemplateSchema } from "../types/catalogTemplateTypes";

const PAGE_SIZE = 25;
type FieldFilter = "all" | "selected" | "incompatible";
interface Props {
  schemas: CatalogTemplateSchema[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
  disabled: boolean;
}

function SchemaGroup({ schema, fields, selected, onChange, disabled, initiallyOpen }: {
  schema: CatalogTemplateSchema;
  fields: CatalogTemplateSchema["fields"];
  selected: Set<string>;
  onChange: Props["onChange"];
  disabled: boolean;
  initiallyOpen: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [page, setPage] = useState(0);
  const eligible = schema.fields.filter(field => schema.compatible && field.compatible);
  const selectedCount = eligible.filter(field => selected.has(field.id)).length;
  const incompatibleCount = schema.fields.length - eligible.length;
  const pageCount = Math.max(1, Math.ceil(fields.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * PAGE_SIZE;
  const visibleFields = fields.slice(start, start + PAGE_SIZE);
  const groupId = `template-fields-${schema.id}`;
  return <section className="catalog-schema-group" aria-label={`Tabela ${schema.publicName}`}>
    <div className="catalog-schema-group__header">
      <input type="checkbox" aria-label={`Selecionar todos os campos compatíveis da tabela ${schema.publicName}`}
        checked={eligible.length > 0 && selectedCount === eligible.length}
        ref={element => { if (element) element.indeterminate = selectedCount > 0 && selectedCount < eligible.length; }}
        disabled={disabled || eligible.length === 0}
        onChange={event => {
          const next = new Set(selected);
          eligible.forEach(field => event.target.checked ? next.add(field.id) : next.delete(field.id));
          onChange(next);
        }} />
      <button type="button" className="catalog-schema-group__toggle" aria-expanded={open} aria-controls={groupId} aria-label={`${open ? 'Recolher' : 'Ver'} campos de ${schema.publicName}`} onClick={() => setOpen(value => !value)}>
        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <Database size={18} aria-hidden="true" />
        <span><strong>{schema.publicName}</strong><code>{schema.internalSchemaName}.{schema.internalObjectName}</code></span>
      </button>
      <span className="catalog-schema-group__count">{selectedCount}/{eligible.length} compatíveis selecionados{incompatibleCount > 0 ? ` · ${incompatibleCount} incompatíveis` : ''}</span>
    </div>
    {schema.reason && <p className="catalog-schema-group__reason">{diagnosticMessage(schema.reasonCode, "Tabela ou view indisponível no destino.")}</p>}
    {open && <div id={groupId} className="catalog-schema-group__fields">
      {schema.description && <p className="catalog-schema-group__description">{schema.description}</p>}
      {fields.length === 0 && <p>Nenhum campo corresponde a este filtro.</p>}
      {visibleFields.map(field => <div className="catalog-template-field" key={field.id}>
        <label>
          <input type="checkbox" aria-label={`${field.publicName} (${field.internalFieldName}) da tabela ${schema.publicName}`} checked={selected.has(field.id)} disabled={disabled || !schema.compatible || !field.compatible} onChange={event => {
            const next = new Set(selected);
            if (event.target.checked) next.add(field.id); else next.delete(field.id);
            onChange(next);
          }} />
          <span><strong>{field.publicName}</strong><small>{field.internalFieldName} · {field.publicType}{field.isNullable ? ' · aceita nulo' : ''}{field.isSensitive ? ' · sensível' : ''}{!field.isEnabled ? ' · desabilitado' : ''}</small></span>
        </label>
        {field.reason && <p className="catalog-schema-group__reason">{diagnosticMessage(field.reasonCode, "Campo ausente ou com tipo incompatível no destino.")}</p>}
        <details><summary>Configurações de {field.publicName}</summary>
          <p>Selecionável: {field.isSelectable ? 'sim' : 'não'}; Filtrável: {field.isFilterable ? 'sim' : 'não'}; Ordenável: {field.isSortable ? 'sim' : 'não'}; Agrupável: {field.isGroupable ? 'sim' : 'não'}; Agregável: {field.isAggregatable ? 'sim' : 'não'}</p>
          <p>Operadores: {field.allowedOperators.join(', ')}; Agregações: {field.allowedAggregations.join(', ') || 'nenhuma'}</p>
        </details>
      </div>)}
      {pageCount > 1 && <nav className="catalog-schema-group__pagination" aria-label={`Páginas dos campos de ${schema.publicName}`}>
        <span>Campos {start + 1}–{Math.min(start + PAGE_SIZE, fields.length)} de {fields.length}</span>
        <div>
          <button type="button" className="btn btn-secondary" disabled={currentPage === 0} aria-label={`Página anterior de ${schema.publicName}`} onClick={() => setPage(currentPage - 1)}>Anterior</button>
          <button type="button" className="btn btn-secondary" disabled={currentPage + 1 === pageCount} aria-label={`Próxima página de ${schema.publicName}`} onClick={() => setPage(currentPage + 1)}>Próxima</button>
        </div>
      </nav>}
    </div>}
  </section>;
}

export function CatalogTemplateSchemaPicker({ schemas, selected, onChange, disabled }: Props) {
  const searchId = useId();
  const bulkHintId = useId();
  const [search, setSearch] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [exactMatch, setExactMatch] = useState(false);
  const [filter, setFilter] = useState<FieldFilter>("all");
  const query = search.trim();
  const matches = (value: string) => matchesTextSearch(value, query, { matchCase, exactMatch });
  const groups = schemas.flatMap(schema => {
    const tableMatches = matches(schema.publicName) || matches(schema.internalSchemaName) || matches(schema.internalObjectName) || matches(schema.internalSchemaName + "." + schema.internalObjectName);
    const fields = schema.fields.filter(field =>
      (tableMatches || matches(field.publicName) || matches(field.internalFieldName)) &&
      (filter === "all" || (filter === "selected" ? selected.has(field.id) : !schema.compatible || !field.compatible))
    );
    return fields.length > 0 || (filter === "all" && tableMatches) ? [{ schema, fields }] : [];
  });
  const shownIds = new Set(groups.flatMap(group => group.fields.map(field => field.id)));
  const hiddenSelected = [...selected].filter(id => !shownIds.has(id)).length;
  const eligibleIds = groups.flatMap(({ schema, fields }) => schema.compatible ? fields.filter(field => field.compatible).map(field => field.id) : []);
  const canSelectMore = eligibleIds.some(id => !selected.has(id));
  const canDeselect = [...shownIds].some(id => selected.has(id));
  const filtered = Boolean(query) || filter !== "all";
  function selectAll(mark: boolean) {
    const next = new Set(selected);
    if (mark) eligibleIds.forEach(id => next.add(id));
    else shownIds.forEach(id => next.delete(id));
    onChange(next);
  }
  return <section className="catalog-schema-picker" aria-label="Seleção de tabelas e campos">
    <div className="catalog-schema-picker__toolbar">
      <div className="catalog-schema-picker__search">
        <label htmlFor={searchId}>Buscar tabela ou campo</label>
        <div>
          <Search size={18} aria-hidden="true" />
          <div className="search-input-clear"><input id={searchId} className="form-input" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome público ou nome no banco" />
          <ClearSearchButton value={search} onClear={()=>setSearch("")}/></div>
          <SearchMatchOptions matchCase={matchCase} exactMatch={exactMatch} onMatchCaseChange={setMatchCase} onExactMatchChange={setExactMatch} />
        </div>
      </div>
      <label>Mostrar campos<select className="form-select" value={filter} onChange={event => setFilter(event.target.value as FieldFilter)}>
        <option value="all">Todos</option><option value="selected">Selecionados</option><option value="incompatible">Incompatíveis</option>
      </select></label>
    </div>
    <div className="catalog-schema-picker__bulk">
      <div role="group" aria-label="Seleção em lote" aria-describedby={bulkHintId}>
        <button type="button" className="btn btn-secondary" disabled={disabled || !canSelectMore} onClick={() => selectAll(true)}>Marcar todos</button>
        <button type="button" className="btn btn-secondary" disabled={disabled || !canDeselect} onClick={() => selectAll(false)}>Desmarcar todos</button>
      </div>
      <p id={bulkHintId}>{filtered ? 'Ações nos resultados filtrados, incluindo todas as páginas.' : 'Ações em todas as tabelas e páginas.'} Somente campos compatíveis podem ser marcados.</p>
    </div>
    <p className="catalog-schema-picker__hint">{groups.length} de {schemas.length} tabelas. Abra uma tabela para revisar os campos. A seleção da tabela abrange todos os seus campos compatíveis.</p>
    {hiddenSelected > 0 && <p className="catalog-schema-picker__notice">{hiddenSelected} campos selecionados estão fora do filtro e continuam incluídos na aplicação.</p>}
    {groups.length === 0 && <p role="status">Nenhuma tabela ou campo encontrado para esta busca e filtro.</p>}
    {groups.map(({ schema, fields }) => <SchemaGroup key={`${schema.id}:${query}:${filter}:${matchCase}:${exactMatch}`} schema={schema} fields={fields} selected={selected} onChange={onChange} disabled={disabled} initiallyOpen={Boolean(query) || filter !== "all"} />)}
  </section>;
}
