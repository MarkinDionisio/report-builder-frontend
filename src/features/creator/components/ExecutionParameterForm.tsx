import { useState } from "react";
import type { ReportParameterDefinition } from "../types/creatorTypes";

interface Props { parameters: ReportParameterDefinition[]; values: Record<string, unknown>; onChange: (values: Record<string, unknown>) => void; }

export function ExecutionParameterForm({ parameters, values, onChange }: Props) {
  const [manualOverrides, setManualOverrides] = useState<Set<string>>(new Set());
  const editable = parameters.filter((parameter) => parameter.source === "input" || parameter.allowOverride);
  if (editable.length === 0) return <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>Variáveis automáticas serão resolvidas pelo backend no fuso da organização.</p>;
  const setValue = (parameter: ReportParameterDefinition, raw: string) => {
    const next = { ...values };
    if (raw === "") delete next[parameter.name];
    else if (parameter.type === "integer") next[parameter.name] = Number.parseInt(raw, 10);
    else if (parameter.type === "number") next[parameter.name] = Number(raw);
    else if (parameter.type === "boolean") next[parameter.name] = raw === "true";
    else if (parameter.type === "datetime") next[parameter.name] = new Date(raw).toISOString();
    else if (parameter.type === "time") next[parameter.name] = raw.length === 5 ? `${raw}:00` : raw;
    else next[parameter.name] = raw;
    onChange(next);
  };
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: ".75rem" }}>
    {editable.map((parameter) => {
      const showInput = parameter.source === "input" || manualOverrides.has(parameter.name);
      return <div key={parameter.name} style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".85rem" }}>
        <strong>{parameter.label || humanize(parameter.name)}{parameter.source === "input" ? " *" : ""}</strong>
        {parameter.description && <small style={{ color: "var(--text-muted)" }}>{parameter.description}</small>}
        {parameter.source === "system" && <label style={{ display: "flex", gap: ".4rem", alignItems: "center" }}><input type="checkbox" checked={showInput} onChange={(e) => { const next = new Set(manualOverrides); if (e.target.checked) next.add(parameter.name); else { next.delete(parameter.name); setValue(parameter, ""); } setManualOverrides(next); }}/>{showInput ? "Informar outro valor" : "Usar valor automático"}</label>}
        {showInput && (parameter.type === "boolean" ? <select aria-label={parameter.label || humanize(parameter.name)} className="form-input" value={values[parameter.name] === undefined ? "" : String(values[parameter.name])} onChange={(e) => setValue(parameter, e.target.value)}><option value="">Selecione</option><option value="true">Sim</option><option value="false">Não</option></select> : <input aria-label={parameter.label || humanize(parameter.name)} className="form-input" placeholder={parameter.placeholder} type={inputType(parameter.type)} step={parameter.type === "integer" ? "1" : parameter.type === "number" ? "any" : undefined} required={parameter.source === "input"} value={displayValue(parameter, values[parameter.name])} onChange={(e) => setValue(parameter, e.target.value)} />)}
      </div>;
    })}
  </div>;
}

function humanize(name: string): string { return name.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

function inputType(type: ReportParameterDefinition["type"]): string {
  if (type === "integer" || type === "number") return "number";
  if (type === "date") return "date";
  if (type === "datetime") return "datetime-local";
  if (type === "time") return "time";
  return "text";
}

function displayValue(parameter: ReportParameterDefinition, value: unknown): string {
  if (value === undefined || value === null) return "";
  if (parameter.type === "datetime") {
    const date = new Date(String(value));
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }
  return String(value).replace(/:00$/, parameter.type === "time" ? "" : ":00");
}
