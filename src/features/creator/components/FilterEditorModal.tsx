import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { DesignerField, RelativePeriodPreset, ReportParameterDefinition, WhereNode } from "../types/creatorTypes";
import type { FieldOption } from "./SearchableFieldSelect";
import { SearchableFieldSelect } from "./SearchableFieldSelect";
import { DateFilterInput } from "./DateFilterInput";
import { createInputParameter, createRelativePeriod, nextParameterName, parameterTypeForField, PERIOD_PRESETS } from "../utils/filterParameterUtils";
import { fieldKindFromType, operatorLabel, visibleOperators, type FilterFieldKind } from "../utils/filterOperatorUtils";

type ValueMode = "fixed" | "input" | "automatic";

interface Props {
  condition?: WhereNode;
  fieldOptions: FieldOption[];
  parameters: ReportParameterDefinition[];
  resolveField: (fieldId: string) => DesignerField | null;
  onClose: () => void;
  onSave: (result: { condition: WhereNode; parameters: ReportParameterDefinition[] }) => void;
}

export function FilterEditorModal({ condition, fieldOptions, parameters, resolveField, onClose, onSave }: Props) {
  const initial = useMemo(() => readInitialState(condition, parameters), [condition, parameters]);
  const [fieldKey, setFieldKey] = useState(initial.fieldKey);
  const [operator, setOperator] = useState(initial.operator);
  const [mode, setMode] = useState<ValueMode>(initial.mode);
  const [value, setValue] = useState<unknown>(initial.value);
  const [preset, setPreset] = useState<RelativePeriodPreset>(initial.preset);
  const [label, setLabel] = useState(initial.label);
  const [description, setDescription] = useState(initial.description);
  const [placeholder, setPlaceholder] = useState(initial.placeholder);
  const [required, setRequired] = useState(initial.required);
  const [caseSensitive, setCaseSensitive] = useState(condition?.caseSensitive ?? false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const [fieldId, joinAlias = ""] = fieldKey.split("|");
  const field = fieldId ? resolveField(fieldId) : null;
  const parsedType = fieldKindFromType(field?.type);
  const isDate = parsedType === "date" || parsedType === "datetime";
  const catalogOperators = field?.allowedOperators?.length ? field.allowedOperators : ["eq", "neq", "gt", "gte", "lt", "lte", "contains", "startsWith", "endsWith", "between", "in", "isNull", "isNotNull"];
  const allowedOperators = visibleOperators(catalogOperators, parsedType);
  const activeOperator = allowedOperators.find((item) => item.toLowerCase() === operator.toLowerCase()) || allowedOperators[0] || "";
  const normalizedOperator = activeOperator.toLowerCase();
  const isNoValue = normalizedOperator === "isnull" || normalizedOperator === "isnotnull";
  const isBetween = normalizedOperator === "between";
  const isList = normalizedOperator === "in" || normalizedOperator === "not in";
  const supportsMode = !isNoValue && !isBetween && !isList;
  const effectiveMode = supportsMode ? mode : "fixed";
  const valid = Boolean(field && activeOperator) && (isNoValue || effectiveMode !== "fixed" || hasLiteralValue(value, isBetween, isList));

  const changeField = (next: string) => {
    const [nextFieldId] = next.split("|");
    const nextField = resolveField(nextFieldId);
    setFieldKey(next);
    const nextKind = fieldKindFromType(nextField?.type);
    const nextOperators = visibleOperators(nextField?.allowedOperators?.length ? nextField.allowedOperators : ["eq"], nextKind);
    setOperator(nextOperators[0] || "eq");
    setMode("fixed");
    setValue("");
    setLabel(nextField?.name || "");
    setDescription(nextField ? `Informe ${nextField.name.toLowerCase()} para executar o relatório.` : "");
    setPlaceholder(nextField?.name || "");
  };

  const changeOperator = (next: string) => {
    setOperator(next);
    if (["between", "in", "not in"].includes(next.toLowerCase())) setMode("fixed");
    setValue(next.toLowerCase() === "between" ? ["", ""] : next.toLowerCase() === "in" || next.toLowerCase() === "not in" ? [] : "");
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!field || !valid) return;
    const reference = { fieldId, ...(joinAlias ? { joinAlias } : {}), ...(parsedType === "string" && !isNoValue ? { caseSensitive } : {}) };
    if (effectiveMode === "fixed") {
      onSave({ condition: { ...reference, operator: activeOperator, ...(isNoValue ? {} : { value }) }, parameters });
      return;
    }
    if (effectiveMode === "input") {
      const existingName = getParameterName(condition?.ui?.kind === "relativePeriod" ? undefined : condition?.value);
      const existing = parameters.find((parameter) => parameter.name === existingName && parameter.source === "input");
      const parameter = existing ? { ...existing, type: parameterTypeForField(field.type), label: label || field.name, description, placeholder, required } : { ...createInputParameter(parameters, field.type, field.name), label: label || field.name, description, placeholder, required };
      const nextParameters = existing ? parameters.map((item) => item.name === existing.name ? parameter : item) : [...parameters, parameter];
      onSave({ condition: { ...reference, operator: activeOperator, value: { parameter: parameter.name } }, parameters: nextParameters });
      return;
    }
    if (parameterTypeForField(field.type) === "date") {
      const parameter: ReportParameterDefinition = { name: nextParameterName(parameters, "current_date"), type: "date", source: "system", variable: "currentDate" };
      onSave({ condition: { ...reference, operator: "eq", value: { parameter: parameter.name } }, parameters: [...parameters, parameter] });
      return;
    }
    const generated = createRelativePeriod(fieldId, joinAlias || undefined, preset, parameters, label || field.name);
    onSave(generated);
  };

  return <div className="modal-backdrop filter-editor-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-container filter-editor" role="dialog" aria-modal="true" aria-labelledby="filter-editor-title">
      <div className="modal-header">
        <div><h2 id="filter-editor-title">{condition ? "Editar filtro" : "Adicionar filtro"}</h2><p>Defina como este filtro deve restringir os dados do relatório.</p></div>
        <button type="button" className="btn-icon" aria-label="Fechar editor de filtro" onClick={onClose}><X size={20} /></button>
      </div>
      <form onSubmit={submit} className="filter-editor__form">
        <div className="filter-editor__body">
          <div className="filter-editor__control filter-editor__field">
            <label className="form-label">Campo *</label>
            <SearchableFieldSelect options={fieldOptions} value={fieldKey} onChange={changeField} placeholder="Selecione o campo que deseja filtrar..." inlineMenu />
          </div>
          {field && <>
            {supportsMode && <div className="filter-editor__control">
              <label className="form-label" htmlFor="filter-editor-mode">Como definir o valor? *</label>
              <select id="filter-editor-mode" className="form-input" value={mode} onChange={(event) => { const nextMode = event.target.value as ValueMode; setMode(nextMode); setValue(""); if (nextMode !== "automatic" && !allowedOperators.some((item) => item.toLowerCase() === activeOperator.toLowerCase())) setOperator(allowedOperators.find((item) => item.toLowerCase() === "eq") || allowedOperators[0]); }}><option value="fixed">Valor fixo</option><option value="input">Perguntar ao executar</option>{isDate && <option value="automatic">Data/período automático</option>}</select>
            </div>}
            {mode !== "automatic" && <div className="filter-editor__control">
              <label className="form-label" htmlFor="filter-editor-operator">Condição *</label>
              <select id="filter-editor-operator" className="form-input" value={activeOperator} onChange={(event) => changeOperator(event.target.value)}>{allowedOperators.map((item) => <option key={item} value={item}>{operatorLabel(item, parsedType)}</option>)}</select>
            </div>}
            {parsedType === "string" && !isNoValue && <label><input type="checkbox" checked={caseSensitive} onChange={(event) => setCaseSensitive(event.target.checked)} /> Diferenciar maiúsculas/minúsculas</label>}
            {!isNoValue && <div className="filter-editor__control filter-editor__value">
              <label className="form-label">{effectiveMode === "automatic" ? "Período *" : effectiveMode === "input" ? "Apresentação para o usuário" : "Valor *"}</label>
              {effectiveMode === "automatic" ? <div className="filter-editor__metadata"><input className="form-input" aria-label="Rótulo personalizado" placeholder="Rótulo exibido" value={label} onChange={(event) => setLabel(event.target.value)} /><select aria-label="Período" className="form-input" value={preset} onChange={(event) => setPreset(event.target.value as RelativePeriodPreset)}>{(parsedType === "date" ? PERIOD_PRESETS.filter((item) => item.value === "today") : PERIOD_PRESETS).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div> : effectiveMode === "input" ? <div className="filter-editor__metadata">
                <label><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} /> Obrigatório na execução</label>
                <small>Se opcional e vazio, este filtro não será aplicado.</small>
                <input className="form-input" aria-label="Rótulo para o usuário" placeholder="Rótulo exibido" value={label} onChange={(event) => setLabel(event.target.value)} />
                <input className="form-input" aria-label="Exemplo do valor" placeholder="Exemplo ou placeholder" value={placeholder} onChange={(event) => setPlaceholder(event.target.value)} />
                <input className="form-input filter-editor__description" aria-label="Texto de ajuda" placeholder="Explique o que deve ser informado (opcional)" value={description} onChange={(event) => setDescription(event.target.value)} />
              </div> : <LiteralValueInput fieldType={parsedType} operator={activeOperator} value={value} onChange={setValue} />}
            </div>}
          </>}
        </div>
        <div className="filter-editor__footer"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={!valid}>Salvar filtro</button></div>
      </form>
    </div>
  </div>;
}

function LiteralValueInput({ fieldType, operator, value, onChange }: { fieldType: FilterFieldKind; operator: string; value: unknown; onChange: (value: unknown) => void }) {
  const normalized = operator.toLowerCase();
  const between = normalized === "between";
  if (fieldType === "date" || fieldType === "datetime" || fieldType === "time") return <DateFilterInput operator={operator} value={value} fieldType={fieldType} onChange={onChange} onOperatorChange={() => undefined} />;
  if (fieldType === "boolean") return <select className="form-input" aria-label="Valor do filtro" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}><option value="">Selecione</option><option value="true">Sim</option><option value="false">Não</option></select>;
  if (normalized === "in" || normalized === "not in") return <textarea className="form-input" aria-label="Valores da lista" rows={3} placeholder="Separe os valores por vírgula" value={Array.isArray(value) ? value.join(", ") : String(value || "")} onChange={(event) => onChange(event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} />;
  if (between) {
    const values = Array.isArray(value) ? value : ["", ""];
    return <div className="filter-editor__between"><input type={fieldType === "number" ? "number" : "text"} className="form-input" aria-label="Valor inicial" value={String(values[0] || "")} onChange={(event) => onChange([event.target.value, values[1]])} /><span>e</span><input type={fieldType === "number" ? "number" : "text"} className="form-input" aria-label="Valor final" value={String(values[1] || "")} onChange={(event) => onChange([values[0], event.target.value])} /></div>;
  }
  return <input type={fieldType === "number" ? "number" : "text"} className="form-input" aria-label="Valor do filtro" value={String(value || "")} onChange={(event) => onChange(event.target.value)} />;
}

function readInitialState(condition: WhereNode | undefined, parameters: ReportParameterDefinition[]) {
  const base = condition?.ui?.kind === "relativePeriod" ? condition.conditions?.[0] : condition;
  const fieldKey = base?.fieldId ? `${base.fieldId}|${base.joinAlias || ""}` : "";
  const parameterName = getParameterName(base?.value);
  const parameter = parameters.find((item) => item.name === parameterName);
  const mode: ValueMode = condition?.ui?.kind === "relativePeriod" || parameter?.source === "system" ? "automatic" : parameter ? "input" : "fixed";
  return { fieldKey, operator: condition?.ui?.kind === "relativePeriod" ? "eq" : base?.operator || "", mode, value: mode === "fixed" ? base?.value ?? "" : "", preset: condition?.ui?.preset || "today" as RelativePeriodPreset, label: condition?.ui?.label || parameter?.label || "", description: parameter?.description || "", placeholder: parameter?.placeholder || "", required: parameter?.required !== false };
}

function getParameterName(value: unknown): string | undefined { return value && typeof value === "object" && !Array.isArray(value) && "parameter" in value ? String((value as { parameter: string }).parameter) : undefined; }
function hasLiteralValue(value: unknown, between: boolean, list: boolean): boolean { if (between) return Array.isArray(value) && value.length === 2 && value.every((item) => item !== ""); if (list) return Array.isArray(value) && value.length > 0; return value !== "" && value !== undefined && value !== null; }
