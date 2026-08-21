import type { ReportContentV1, ReportPresentation, SelectItem } from "../types/creatorTypes";

export function aggregatedColumns(select: SelectItem[]): SelectItem[] {
  return select.filter((item) => Boolean(item.aggregation && item.alias?.trim()));
}

export function groupedTableColumns(select: SelectItem[]): SelectItem[] {
  return select.filter((item) => Boolean(!item.aggregation && item.fieldId && item.alias?.trim()));
}

function referenceKey(item: SelectItem): string {
  return `${item.joinAlias?.trim() || ""}:${item.fieldId || ""}:${item.dateGranularity || ""}`;
}

export function synchronizeGroupedTableOrderBy(content: ReportContentV1): ReportContentV1 {
  const presentation = content.presentation;
  if (presentation?.type !== "groupedTable") return content;
  const selected = groupedTableColumns(content.dataset.select).find((item) => item.alias === presentation.groupColumnAlias);
  if (!selected?.fieldId) return content;
  const groupOrder = {
    fieldId: selected.fieldId,
    ...(selected.joinAlias ? { joinAlias: selected.joinAlias } : {}),
    ...(selected.dateGranularity ? { dateGranularity: selected.dateGranularity } : {}),
    direction: presentation.direction,
  } as const;
  const selectedKey = referenceKey(selected);
  const remaining = (content.dataset.orderBy || []).filter((item) => item.aggregation || referenceKey(item) !== selectedKey);
  return { ...content, dataset: { ...content.dataset, orderBy: [groupOrder, ...remaining] } };
}

export function canUseMetric(select: SelectItem[], groupBy: unknown[] = []): boolean {
  return select.length > 0 && groupBy.length === 0 && select.every((item) => Boolean(item.aggregation && item.alias?.trim()));
}

export function validateReportPresentation(content: ReportContentV1, presentation: ReportPresentation = content.presentation || { type: "table" }): string | null {
  if (presentation.type === "table") return null;
  if (presentation.type === "groupedTable") {
    if (!groupedTableColumns(content.dataset.select).some((item) => item.alias === presentation.groupColumnAlias)) return "Selecione uma coluna de detalhes válida para agrupar a tabela.";
    if (presentation.direction !== "asc" && presentation.direction !== "desc") return "Selecione uma direção válida para o agrupamento.";
    return null;
  }
  if (!canUseMetric(content.dataset.select, content.dataset.groupBy || [])) return "Para usar um indicador, deixe apenas uma coluna com cálculo, como soma, média ou contagem. Remova as demais colunas selecionadas.";
  if (!aggregatedColumns(content.dataset.select).some((item) => item.alias === presentation.valueColumnAlias)) return "Selecione uma coluna agregada válida para o indicador.";
  return null;
}
