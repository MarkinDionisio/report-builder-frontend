import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Fragment, useState } from "react";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import type { DateGranularity, ExecuteResponse } from "../types/creatorTypes";
import { formatReportResultValue } from "../utils/formatReportResultValue";
import { isReportNumericType } from "../utils/reportValueUtils";

interface Props {
  result: ExecuteResponse | null;
  loading: boolean;
  page: number;
  pageSize: number;
  groupColumnAlias: string;
  aggregationsByAlias?: Record<string, string | undefined>;
  dateGranularitiesByAlias?: Record<string, DateGranularity | undefined>;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

interface RowGroup {
  key: string;
  value: unknown;
  rows: Array<Record<string, unknown>>;
}

function valueKey(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  return `${typeof value}:${JSON.stringify(value)}`;
}

function groupRows(rows: Array<Record<string, unknown>>, alias: string): RowGroup[] {
  const groups: RowGroup[] = [];
  for (const row of rows) {
    const value = row[alias];
    const key = valueKey(value);
    const current = groups.at(-1);
    if (current?.key === key) current.rows.push(row);
    else groups.push({ key, value, rows: [row] });
  }
  return groups;
}

export function GroupedReportResultsTable({ result, loading, page, pageSize, groupColumnAlias, aggregationsByAlias = {}, dateGranularitiesByAlias = {}, onPageChange, onPageSizeChange }: Props) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  if (loading && !result) return <section className="report-results report-results--state" aria-live="polite"><NeutralLoader message="Executando relatório..." minHeight="auto"/><span>A consulta pode levar alguns instantes.</span></section>;
  if (!result) return <section className="report-results report-results--state"><strong>Pronto para executar</strong><span>Preencha os parâmetros necessários e execute o relatório.</span></section>;

  const groupColumn = result.columns.find((column) => column.alias === groupColumnAlias);
  const detailColumns = result.columns.filter((column) => column.alias !== groupColumnAlias);
  const groups = groupRows(result.rows, groupColumnAlias);
  const toggleGroup = (key: string) => setCollapsedGroups((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  return <section className="report-results report-results--grouped" aria-busy={loading}>
    <div className="report-results__summary"><div><strong>Resultado</strong><span>{result.rowCount} {result.rowCount === 1 ? "linha carregada" : "linhas carregadas"} · {result.durationMs} ms</span></div>{loading && <span className="report-results__updating">Atualizando...</span>}</div>
    {result.rows.length === 0 ? <div className="report-results__empty"><strong>Nenhum dado encontrado</strong><span>Tente alterar os parâmetros e executar novamente.</span></div> : <div className="report-results__scroller" tabIndex={0} aria-label="Resultados agrupados do relatório">
      <table className="report-results__table report-results__grouped-table">
        {detailColumns.length > 0 && <thead><tr>{detailColumns.map((column) => <th key={column.alias} title={column.alias} className={isReportNumericType(column.type) ? "report-results__numeric" : undefined}>{column.alias}</th>)}</tr></thead>}
        <tbody>{groups.map((group, groupIndex) => {
          const instanceKey = `${group.key}:${groupIndex}`;
          const collapsed = collapsedGroups.has(instanceKey);
          return <Fragment key={instanceKey}>
            <tr className="report-results__group-row"><td colSpan={Math.max(detailColumns.length, 1)}><button type="button" aria-expanded={!collapsed} onClick={() => toggleGroup(instanceKey)}><ChevronDown size={17} className={collapsed ? "report-results__group-chevron report-results__group-chevron--collapsed" : "report-results__group-chevron"}/><strong>{groupColumn ? formatReportResultValue(group.value, groupColumn.type, aggregationsByAlias[groupColumnAlias], dateGranularitiesByAlias[groupColumnAlias]) : String(group.value ?? "—")}</strong><span>{group.rows.length} {group.rows.length === 1 ? "item nesta página" : "itens nesta página"}</span></button></td></tr>
            {!collapsed && detailColumns.length > 0 && group.rows.map((row, rowIndex) => <tr key={`${instanceKey}:${rowIndex}`}>{detailColumns.map((column) => <td key={column.alias} className={isReportNumericType(column.type) ? "report-results__numeric" : undefined}>{formatReportResultValue(row[column.alias], column.type, aggregationsByAlias[column.alias], dateGranularitiesByAlias[column.alias])}</td>)}</tr>)}
          </Fragment>;
        })}</tbody>
      </table>
    </div>}
    <div className="report-results__footer"><label>Linhas por página<select className="form-input" value={pageSize} disabled={loading} onChange={(event) => onPageSizeChange(Number(event.target.value))}>{[25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label><div className="report-results__pagination"><button type="button" className="btn btn-secondary" disabled={loading || page === 1} onClick={() => onPageChange(page - 1)}><ChevronLeft size={16}/>Anterior</button><span>Página {page}</span><button type="button" className="btn btn-secondary" disabled={loading || result.rowCount < pageSize} onClick={() => onPageChange(page + 1)}>Próxima<ChevronRight size={16}/></button></div></div>
  </section>;
}
