export type FilterFieldKind = "string" | "number" | "boolean" | "uuid" | "date" | "datetime" | "time";

const COMMON_EMPTY: Record<string, string> = { isnull: "Está vazio", isnotnull: "Não está vazio" };

const LABELS: Record<FilterFieldKind, Record<string, string>> = {
  string: { eq: "É exatamente", neq: "É diferente de", contains: "Contém", startswith: "Começa com", endswith: "Termina com", in: "É um dos valores", ...COMMON_EMPTY },
  number: { eq: "Igual a", neq: "Diferente de", gt: "Maior que", gte: "Maior ou igual a", lt: "Menor que", lte: "Menor ou igual a", between: "Está entre", in: "É um dos valores", ...COMMON_EMPTY },
  boolean: { eq: "É igual a", neq: "É diferente de", ...COMMON_EMPTY },
  uuid: { eq: "É exatamente", neq: "É diferente de", in: "É um dos valores", ...COMMON_EMPTY },
  date: { eq: "É exatamente", neq: "É diferente de", gt: "Depois de", gte: "A partir de", lt: "Antes de", lte: "Até", ...COMMON_EMPTY },
  datetime: { eq: "É exatamente", neq: "É diferente de", gt: "Depois de", gte: "A partir de", lt: "Antes de", lte: "Até", ...COMMON_EMPTY },
  time: { eq: "É exatamente", neq: "É diferente de", gt: "Depois de", gte: "A partir de", lt: "Antes de", lte: "Até", between: "Está entre", ...COMMON_EMPTY },
};

export function fieldKindFromType(type?: string): FilterFieldKind {
  const value = (type || "").toLowerCase();
  if (value.includes("timestamp") || value.includes("datetime")) return "datetime";
  if (value === "time" || value.includes("time without") || value.includes("time with")) return "time";
  if (value.includes("date")) return "date";
  if (value.includes("bool")) return "boolean";
  if (value.includes("uuid") || value.includes("guid")) return "uuid";
  if (["int", "decimal", "numeric", "float", "double", "number", "real"].some((item) => value.includes(item))) return "number";
  return "string";
}

export function visibleOperators(operators: string[], kind: FilterFieldKind): string[] {
  return kind === "date" || kind === "datetime" ? operators.filter((operator) => operator.toLowerCase() !== "between") : operators;
}

export function operatorLabel(operator: string, kind: FilterFieldKind): string {
  const normalized = operator.toLowerCase();
  return LABELS[kind][normalized] || humanizeOperator(operator);
}

function humanizeOperator(operator: string): string {
  const words = operator.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim().toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Condição desconhecida";
}
