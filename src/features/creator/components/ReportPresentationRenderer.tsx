import type { ExecuteResponse, ReportPresentation, SelectItem } from "../types/creatorTypes";
import { formatReportNumber, isReportNumericType } from "../utils/reportValueUtils";
import { ReportResultsTable } from "./ReportResultsTable";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { GroupedReportResultsTable } from "./GroupedReportResultsTable";

interface Props {
  presentation?: ReportPresentation;
  select: SelectItem[];
  result: ExecuteResponse | null;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function ReportPresentationRenderer({ presentation = { type: "table" }, select, result, loading, page, pageSize, onPageChange, onPageSizeChange }: Props) {
  const aggregations = Object.fromEntries(select.filter((item) => item.alias).map((item) => [item.alias!, item.aggregation]));
  const dateGranularities = Object.fromEntries(select.filter((item) => item.alias).map((item) => [item.alias!, item.dateGranularity]));
  if (presentation.type === "table") return <ReportResultsTable result={result} loading={loading} page={page} pageSize={pageSize} aggregationsByAlias={aggregations} dateGranularitiesByAlias={dateGranularities} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange}/>;
  if (presentation.type === "groupedTable") return <GroupedReportResultsTable result={result} loading={loading} page={page} pageSize={pageSize} groupColumnAlias={presentation.groupColumnAlias} aggregationsByAlias={aggregations} dateGranularitiesByAlias={dateGranularities} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange}/>;
  if (loading && !result) return <section className="report-metric report-metric--state"><NeutralLoader/><span>Calculando indicador...</span></section>;
  if (!result) return <section className="report-metric report-metric--state"><strong>Pronto para executar</strong><span>Execute o relatório para calcular o indicador.</span></section>;
  if (result.rows.length > 1) return <section className="report-metric report-metric--error" role="alert"><strong>Não foi possível apresentar o indicador</strong><span>O relatório retornou mais de uma linha.</span></section>;
  const column = result.columns.find((item) => item.alias === presentation.valueColumnAlias);
  if (!column) return <section className="report-metric report-metric--error" role="alert"><strong>Coluna do indicador indisponível</strong><span>Revise a configuração da apresentação.</span></section>;
  const value = result.rows[0]?.[column.alias];
  return <section className="report-metric" aria-busy={loading}><span className="report-metric__label">{presentation.label?.trim() || column.alias}</span><strong className="report-metric__value">{formatMetricValue(value, column.type, aggregations[column.alias])}</strong><small>{result.durationMs} ms{loading ? " · Atualizando..." : ""}</small></section>;
}

function formatMetricValue(value: unknown, type: string, aggregation?: string): string {
  if (value === null || value === undefined) return "—";
  if (isReportNumericType(type)) return formatReportNumber(value, type, aggregation);
  return String(value);
}
