import { Plus, X } from "lucide-react";
import type { ReportParameterDefinition, ReportParameterType, ReportSystemVariable } from "../types/creatorTypes";
import { validateParameters } from "../utils/parameterUtils";

const TYPES: ReportParameterType[] = ["string", "integer", "number", "boolean", "uuid", "date", "datetime", "time"];
const VARIABLES: Array<{ value: ReportSystemVariable; label: string; type: "date" | "datetime" }> = [
  { value: "now", label: "Agora", type: "datetime" }, { value: "currentDate", label: "Data atual", type: "date" },
  { value: "startOfToday", label: "Início de hoje", type: "datetime" }, { value: "startOfTomorrow", label: "Início de amanhã", type: "datetime" },
  { value: "startOfYesterday", label: "Início de ontem", type: "datetime" }, { value: "startOfWeek", label: "Início da semana", type: "datetime" },
  { value: "startOfNextWeek", label: "Início da próxima semana", type: "datetime" }, { value: "startOfPreviousWeek", label: "Início da semana anterior", type: "datetime" },
  { value: "startOfMonth", label: "Início do mês", type: "datetime" }, { value: "startOfNextMonth", label: "Início do próximo mês", type: "datetime" },
  { value: "startOfPreviousMonth", label: "Início do mês anterior", type: "datetime" }, { value: "startOfYear", label: "Início do ano", type: "datetime" },
  { value: "startOfNextYear", label: "Início do próximo ano", type: "datetime" }, { value: "startOfPreviousYear", label: "Início do ano anterior", type: "datetime" },
];

interface Props { parameters: ReportParameterDefinition[]; onChange: (parameters: ReportParameterDefinition[]) => void; referencedNames: Set<string>; }

export function ParameterEditor({ parameters, onChange, referencedNames }: Props) {
  const update = (index: number, patch: Partial<ReportParameterDefinition>) => onChange(parameters.map((item, i) => i === index ? { ...item, ...patch } : item));
  const errors = validateParameters(parameters);
  return <details className="card" style={{ marginBottom: "1rem" }}>
    <summary style={{ cursor: "pointer", fontWeight: 600 }}>Configuração avançada de parâmetros <small style={{ color: "var(--text-muted)", fontWeight: 400 }}>({parameters.length})</small></summary>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "1rem 0" }}>
      <div><small style={{ color: "var(--text-muted)" }}>Use apenas para reutilização, ajustes técnicos ou diagnóstico.</small></div>
      <button className="btn btn-secondary" onClick={() => onChange([...parameters, { name: `parameter${parameters.length + 1}`, type: "string", source: "input" }])}><Plus size={14}/> Adicionar</button>
    </div>
    {parameters.map((parameter, index) => {
      const availableVariables = VARIABLES.filter((item) => item.type === parameter.type);
      return <div key={index} style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1.5fr auto auto", gap: ".5rem", alignItems: "center", marginBottom: ".5rem" }}>
        <input className="form-input" aria-label={`Nome do parâmetro ${index + 1}`} value={parameter.name} onChange={(e) => update(index, { name: e.target.value })} placeholder="nomeDoParametro" />
        <select className="form-input" value={parameter.type} onChange={(e) => { const type = e.target.value as ReportParameterType; update(index, { type, variable: parameter.source === "system" ? VARIABLES.find((v) => v.type === type)?.value : undefined }); }}>{TYPES.map((type) => <option key={type}>{type}</option>)}</select>
        <select className="form-input" value={parameter.source} onChange={(e) => { const source = e.target.value as "input" | "system"; update(index, source === "input" ? { source, variable: undefined, allowOverride: undefined } : { source, type: "datetime", variable: "startOfToday", allowOverride: false }); }}><option value="input">Entrada</option><option value="system">Automático</option></select>
        {parameter.source === "system" ? <select className="form-input" value={parameter.variable} onChange={(e) => update(index, { variable: e.target.value as ReportSystemVariable })}>{availableVariables.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select> : <span style={{ color: "var(--text-muted)", fontSize: ".8rem" }}>Obrigatório na execução</span>}
        {parameter.source === "system" ? <label style={{ fontSize: ".8rem", whiteSpace: "nowrap" }}><input type="checkbox" checked={parameter.allowOverride ?? false} onChange={(e) => update(index, { allowOverride: e.target.checked })}/> Permitir override</label> : <span />}
        <button className="btn-icon" title={referencedNames.has(parameter.name) ? "Remova as referências antes" : "Remover"} disabled={referencedNames.has(parameter.name)} onClick={() => onChange(parameters.filter((_, i) => i !== index))}><X size={15}/></button>
      </div>;
    })}
    {errors.length > 0 && <div className="alert alert-danger" style={{ marginTop: ".75rem" }}>{errors.join(" • ")}</div>}
  </details>;
}
