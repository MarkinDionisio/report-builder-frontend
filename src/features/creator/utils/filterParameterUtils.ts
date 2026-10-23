import type { RelativePeriodPreset, ReportParameterDefinition, ReportParameterType, WhereNode } from "../types/creatorTypes";

export const PERIOD_PRESETS: Array<{ value: RelativePeriodPreset; label: string }> = [
  { value: "last12Months", label: "Últimos 12 meses (mês atual parcial)" },
  { value: "today", label: "Hoje" }, { value: "yesterday", label: "Ontem" },
  { value: "currentWeek", label: "Semana atual" }, { value: "previousWeek", label: "Semana anterior" },
  { value: "currentMonth", label: "Mês atual" }, { value: "previousMonth", label: "Mês anterior" },
  { value: "currentYear", label: "Ano atual" }, { value: "previousYear", label: "Ano anterior" },
];

const BOUNDARIES = {
  last12Months: ["startOfLast12Months", "startOfNextMonth"],
  today: ["startOfToday", "startOfTomorrow"], yesterday: ["startOfYesterday", "startOfToday"],
  currentWeek: ["startOfWeek", "startOfNextWeek"], previousWeek: ["startOfPreviousWeek", "startOfWeek"],
  currentMonth: ["startOfMonth", "startOfNextMonth"], previousMonth: ["startOfPreviousMonth", "startOfMonth"],
  currentYear: ["startOfYear", "startOfNextYear"], previousYear: ["startOfPreviousYear", "startOfYear"],
} as const;

export function parameterTypeForField(fieldType: string): ReportParameterType {
  const normalized = fieldType.toLowerCase();
  if (["string", "integer", "number", "boolean", "uuid", "date", "datetime", "time"].includes(normalized)) return normalized as ReportParameterType;
  if (normalized.includes("int")) return "integer";
  if (["decimal", "numeric", "float", "double", "real"].some((type) => normalized.includes(type))) return "number";
  if (normalized.includes("timestamp")) return "datetime";
  return "string";
}

export function nextParameterName(parameters: ReportParameterDefinition[], prefix = "input"): string {
  let index = 1;
  while (parameters.some((parameter) => parameter.name === `${prefix}_${index}`)) index++;
  return `${prefix}_${index}`;
}

export function createInputParameter(parameters: ReportParameterDefinition[], fieldType: string, fieldLabel: string): ReportParameterDefinition {
  return { name: nextParameterName(parameters), type: parameterTypeForField(fieldType), source: "input", label: fieldLabel, description: `Informe ${fieldLabel.toLowerCase()} para executar o relatório.`, placeholder: fieldLabel };
}

export function createRelativePeriod(fieldId: string, joinAlias: string | undefined, preset: RelativePeriodPreset, parameters: ReportParameterDefinition[], label?: string) {
  const [startVariable, endVariable] = BOUNDARIES[preset];
  const start: ReportParameterDefinition = { name: nextParameterName(parameters, "period_start"), type: "datetime", source: "system", variable: startVariable };
  const end: ReportParameterDefinition = { name: nextParameterName([...parameters, start], "period_end"), type: "datetime", source: "system", variable: endVariable };
  const reference = { fieldId, ...(joinAlias ? { joinAlias } : {}) };
  const condition: WhereNode = { operator: "and", ui: { kind: "relativePeriod", preset, ...(label ? { label } : {}) }, conditions: [
    { ...reference, operator: "gte", value: { parameter: start.name } },
    { ...reference, operator: "lt", value: { parameter: end.name } },
  ] };
  return { condition, parameters: [...parameters, start, end] };
}

export function collectParameterReferences(value: unknown, result = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((item) => collectParameterReferences(item, result));
  else if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (typeof object.parameter === "string") result.add(object.parameter);
    else Object.values(object).forEach((item) => collectParameterReferences(item, result));
  }
  return result;
}

export function removeOrphanParameters(parameters: ReportParameterDefinition[], where: WhereNode | undefined, candidates?: Set<string>): ReportParameterDefinition[] {
  const references = collectParameterReferences(where);
  return parameters.filter((parameter) => !candidates?.has(parameter.name) || references.has(parameter.name));
}

export function removeEmptyLogicalGroups(where: WhereNode | undefined): WhereNode | undefined {
  if (!where || !Array.isArray(where.conditions)) return where;

  const conditions = where.conditions
    .map(removeEmptyLogicalGroups)
    .filter((condition): condition is WhereNode => condition !== undefined);

  return conditions.length > 0 ? { ...where, conditions } : undefined;
}

export function renameParameterReferences(where: WhereNode, renames: Record<string, string>): WhereNode {
  const rewrite = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(rewrite);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, key === "parameter" && typeof item === "string" ? renames[item] || item : rewrite(item)]));
  };
  return rewrite(where) as WhereNode;
}
