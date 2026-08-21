import type { ReactNode } from "react";
import type { DateGranularity } from "../types/creatorTypes";
import { formatReportNumber, isReportNumericType } from "./reportValueUtils";

export function formatReportResultValue(value: unknown, type: string, aggregation?: string, dateGranularity?: DateGranularity): ReactNode {
  if (value === null || value === undefined) return <span className="report-results__null">—</span>;
  if (type === "boolean") return <span className={`report-results__boolean report-results__boolean--${value ? "yes" : "no"}`}>{value ? "Sim" : "Não"}</span>;
  if (isReportNumericType(type)) return formatReportNumber(value, type, aggregation);
  if (type === "date") {
    const parsed = new Date(String(value).length === 10 ? `${value}T00:00:00` : String(value));
    if (Number.isNaN(parsed.getTime())) return String(value);
    if (dateGranularity === "month") return parsed.toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" });
    if (dateGranularity === "year") return parsed.toLocaleDateString("pt-BR", { year: "numeric" });
    return parsed.toLocaleDateString("pt-BR");
  }
  if (type === "datetime") {
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString("pt-BR");
  }
  if (type === "time") return String(value).replace(/:00$/, "");
  return String(value);
}
