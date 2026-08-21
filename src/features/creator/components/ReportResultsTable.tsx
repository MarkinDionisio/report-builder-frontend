import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import type { DateGranularity, ExecuteResponse } from "../types/creatorTypes";
import { formatReportNumber, isReportNumericType } from "../utils/reportValueUtils";

interface Props {
  result: ExecuteResponse | null;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  aggregationsByAlias?: Record<string, string | undefined>;
  dateGranularitiesByAlias?: Record<string, DateGranularity | undefined>;
}

export function ReportResultsTable({ result, loading, page, pageSize, onPageChange, onPageSizeChange, aggregationsByAlias = {}, dateGranularitiesByAlias = {} }: Props) {
  if (loading && !result) return <section className="report-results report-results--state" aria-live="polite"><NeutralLoader /><strong>Executando relatório...</strong><span>A consulta pode levar alguns instantes.</span></section>;
  if (!result) return <section className="report-results report-results--state"><strong>Pronto para executar</strong><span>Preencha os parâmetros necessários e execute o relatório.</span></section>;

  return <section className="report-results" aria-busy={loading}>
    <div className="report-results__summary">
      <div><strong>Resultado</strong><span>{result.rowCount} {result.rowCount === 1 ? "linha carregada" : "linhas carregadas"} · {result.durationMs} ms</span></div>
      {loading && <span className="report-results__updating">Atualizando...</span>}
    </div>
    {result.rows.length === 0 ? <div className="report-results__empty"><strong>Nenhum dado encontrado</strong><span>Tente alterar os parâmetros e executar novamente.</span></div> : <div className="report-results__scroller" tabIndex={0} aria-label="Resultados do relatório">
      <table className="report-results__table">
        <thead><tr>{result.columns.map((column) => <th key={column.alias} title={column.alias} className={isReportNumericType(column.type) ? "report-results__numeric" : undefined}>{column.alias}</th>)}</tr></thead>
        <tbody>{result.rows.map((row, rowIndex) => <tr key={rowIndex}>{result.columns.map((column) => <td key={column.alias} className={isReportNumericType(column.type) ? "report-results__numeric" : undefined}>{formatResultValue(row[column.alias], column.type, aggregationsByAlias[column.alias], dateGranularitiesByAlias[column.alias])}</td>)}</tr>)}</tbody>
      </table>
    </div>}
    <div className="report-results__footer">
      <label>Linhas por página<select className="form-input" value={pageSize} disabled={loading} onChange={(event) => onPageSizeChange(Number(event.target.value))}>{[25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
      <div className="report-results__pagination"><button type="button" className="btn btn-secondary" disabled={loading || page === 1} onClick={() => onPageChange(page - 1)}><ChevronLeft size={16}/>Anterior</button><span>Página {page}</span><button type="button" className="btn btn-secondary" disabled={loading || result.rowCount < pageSize} onClick={() => onPageChange(page + 1)}>Próxima<ChevronRight size={16}/></button></div>
    </div>
  </section>;
}

function formatResultValue(value: unknown, type: string, aggregation?: string, dateGranularity?: DateGranularity): ReactNode {
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
