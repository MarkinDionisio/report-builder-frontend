export function formatReportNumber(value: unknown, type: string, aggregation?: string): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  const normalizedType = type.toLowerCase();
  const count = aggregation === "count" || aggregation === "countDistinct";
  if (count || normalizedType === "integer" || normalizedType.includes("int")) {
    return number.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  }
  return number.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function isReportNumericType(type: string): boolean {
  const normalized = type.toLowerCase();
  return normalized === "number" || normalized === "integer" || ["decimal", "numeric", "float", "double", "real"].some((item) => normalized.includes(item)) || normalized.includes("int");
}
