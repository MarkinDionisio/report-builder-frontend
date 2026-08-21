import { useState } from "react";
import type { ReportParameterDefinition, WhereNode } from "../types/creatorTypes";
import { DatePickerInput } from "./DatePickerInput";

interface Props { parameters: ReportParameterDefinition[]; values: Record<string, unknown>; onChange: (values: Record<string, unknown>) => void; where?: WhereNode; resolvedParameters?: Record<string, unknown>; }

export function ExecutionParameterForm({ parameters, values, onChange, where, resolvedParameters }: Props) {
  const [manualOverrides, setManualOverrides] = useState<Set<string>>(new Set());
  const editable = parameters.filter((parameter) => parameter.source === "input" || parameter.allowOverride);
  const periods = collectRelativePeriods(where);
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
  return <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
    {periods.length > 0 && <div style={{ display: "grid", gap: ".5rem" }}>{periods.map((period, index) => {
      const start = getParameterName(period.conditions?.[0]?.value);
      const end = getParameterName(period.conditions?.[1]?.value);
      const resolvedStart = start ? resolvedParameters?.[start] : undefined;
      const resolvedEnd = end ? resolvedParameters?.[end] : undefined;
      return <div key={`${period.ui?.label || "period"}-${index}`} style={{ fontSize: ".85rem" }}>
        <strong>{period.ui?.label || "Período"}</strong>
        <div style={{ color: "var(--text-muted)", marginTop: ".2rem" }}>{resolvedStart !== undefined && resolvedEnd !== undefined ? formatResolvedPeriod(resolvedStart, resolvedEnd) : "O período será calculado automaticamente no fuso da organização."}</div>
      </div>;
    })}</div>}
    {periods.length === 0 && editable.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: ".85rem", margin: 0 }}>Variáveis automáticas serão resolvidas pelo backend no fuso da organização.</p>}
    {editable.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: ".75rem" }}>{editable.map((parameter) => {
      const showInput = parameter.source === "input" || manualOverrides.has(parameter.name);
      return <div key={parameter.name} style={{ display: "flex", flexDirection: "column", gap: ".3rem", fontSize: ".85rem" }}>
        <strong>{parameter.label || humanize(parameter.name)}{parameter.source === "input" ? " *" : ""}</strong>
        {parameter.description && <small style={{ color: "var(--text-muted)" }}>{parameter.description}</small>}
        {parameter.source === "system" && <label style={{ display: "flex", gap: ".4rem", alignItems: "center" }}><input type="checkbox" checked={showInput} onChange={(e) => { const next = new Set(manualOverrides); if (e.target.checked) next.add(parameter.name); else { next.delete(parameter.name); setValue(parameter, ""); } setManualOverrides(next); }}/>{showInput ? "Informar outro valor" : "Usar valor automático"}</label>}
        {showInput && (parameter.type === "boolean" ? <select aria-label={parameter.label || humanize(parameter.name)} className="form-input" value={values[parameter.name] === undefined ? "" : String(values[parameter.name])} onChange={(e) => setValue(parameter, e.target.value)}><option value="">Selecione</option><option value="true">Sim</option><option value="false">Não</option></select> : parameter.type === "date" || parameter.type === "datetime" ? <DatePickerInput type={parameter.type} value={values[parameter.name] === undefined ? "" : String(values[parameter.name])} onChange={(value) => setValue(parameter, value)} ariaLabel={parameter.label || humanize(parameter.name)} placeholder={parameter.placeholder} required={parameter.source === "input"} /> : <input aria-label={parameter.label || humanize(parameter.name)} className="form-input" placeholder={parameter.placeholder} type={inputType(parameter.type)} step={parameter.type === "integer" ? "1" : parameter.type === "number" ? "any" : undefined} required={parameter.source === "input"} value={displayValue(parameter, values[parameter.name])} onChange={(e) => setValue(parameter, e.target.value)} />)}
      </div>;
    })}</div>}
  </div>;
}

function collectRelativePeriods(where: WhereNode | undefined, result: WhereNode[] = []): WhereNode[] {
  if (!where) return result;
  if (where.ui?.kind === "relativePeriod") result.push(where);
  else where.conditions?.forEach((condition) => collectRelativePeriods(condition, result));
  return result;
}

function getParameterName(value: unknown): string | undefined {
  return value && typeof value === "object" && !Array.isArray(value) && "parameter" in value ? String((value as { parameter: string }).parameter) : undefined;
}

function formatResolvedPeriod(startValue: unknown, exclusiveEndValue: unknown): string {
  if (typeof startValue !== "string" || typeof exclusiveEndValue !== "string") return `${String(startValue)} a ${String(exclusiveEndValue)}`;
  const start = calendarDate(startValue);
  const exclusiveEnd = calendarDate(exclusiveEndValue);
  if (!start || !exclusiveEnd || exclusiveEnd <= start) return `${startValue} a ${exclusiveEndValue}`;
  const inclusiveEnd = new Date(exclusiveEnd.getTime() - 86_400_000);
  const formatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" });
  const startText = formatter.format(start);
  const endText = formatter.format(inclusiveEnd);
  return startText === endText ? startText : `De ${startText} a ${endText}`;
}

function calendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function humanize(name: string): string { return name.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

function inputType(type: ReportParameterDefinition["type"]): string {
  if (type === "integer" || type === "number") return "number";
  if (type === "time") return "time";
  return "text";
}

function displayValue(parameter: ReportParameterDefinition, value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).replace(/:00$/, parameter.type === "time" ? "" : ":00");
}
