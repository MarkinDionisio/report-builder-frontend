import type { ReportContentV1, ReportPresentation, SelectItem } from "../types/creatorTypes";

export function aggregatedColumns(select: SelectItem[]): SelectItem[] {
  return select.filter((item) => Boolean(item.aggregation && item.alias?.trim()));
}

export function canUseMetric(select: SelectItem[], groupBy: unknown[] = []): boolean {
  return select.length > 0 && groupBy.length === 0 && select.every((item) => Boolean(item.aggregation && item.alias?.trim()));
}

export function validateReportPresentation(content: ReportContentV1, presentation: ReportPresentation = content.presentation || { type: "table" }): string | null {
  if (presentation.type === "table") return null;
  if (!canUseMetric(content.dataset.select, content.dataset.groupBy || [])) return "O indicador exige um relatório sem agrupamento e apenas com colunas agregadas.";
  if (!aggregatedColumns(content.dataset.select).some((item) => item.alias === presentation.valueColumnAlias)) return "Selecione uma coluna agregada válida para o indicador.";
  return null;
}
