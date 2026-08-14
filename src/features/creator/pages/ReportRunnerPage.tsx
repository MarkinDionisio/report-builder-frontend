import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "../../../shared/components/Navbar";
import { Alert } from "../../../shared/components/Alert";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { isErr } from "../../../shared/result/result";
import { creatorApi } from "../api/creatorApi";
import { ExecutionParameterForm } from "../components/ExecutionParameterForm";
import { requiredParametersMissing } from "../utils/parameterUtils";
import type { ExecuteResponse, ReportDetail } from "../types/creatorTypes";

export function ReportRunnerPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [parameters, setParameters] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<ExecuteResponse | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (targetPage: number, detail = report) => {
    if (!reportId || !detail || requiredParametersMissing(detail.content.parameters || [], parameters)) return;
    setExecuting(true); setError(null);
    const response = await creatorApi.executeReport(reportId, { parameters, filters: [], page: targetPage, pageSize });
    setExecuting(false);
    if (isErr(response)) setError(response.error.detail || "Não foi possível executar o relatório.");
    else { setResult(response.value); setPage(targetPage); }
  }, [pageSize, parameters, report, reportId]);

  useEffect(() => {
    if (!reportId) return;
    void creatorApi.getReport(reportId).then((response) => {
      setLoading(false);
      if (isErr(response)) { setError(response.error.detail || "Relatório não encontrado ou sem acesso."); return; }
      setReport(response.value);
      if (!requiredParametersMissing(response.value.content.parameters || [], {})) {
        void creatorApi.executeReport(reportId, { parameters: {}, filters: [], page: 1, pageSize: 50 }).then((execution) => {
          if (isErr(execution)) setError(execution.error.detail || "Não foi possível executar o relatório.");
          else setResult(execution.value);
        });
      }
    });
  }, [reportId]);

  return <div style={{ minHeight: "100vh" }}><Navbar/><main style={{ maxWidth: 1200, margin: "2rem auto", padding: "0 1.5rem" }}>
    {loading ? <NeutralLoader/> : report && <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}><div><h1>{report.title}</h1><p style={{ color: "var(--text-muted)" }}>{report.organizationName}</p></div><Link className="btn btn-secondary" to="/dashboard">Voltar</Link></div>
      {error && <Alert type="error" message={error}/>}
      <div className="card" style={{ marginBottom: "1rem" }}><h3 style={{ marginTop: 0 }}>Parâmetros</h3><ExecutionParameterForm parameters={report.content.parameters || []} values={parameters} onChange={(values) => { setParameters(values); setResult(null); setPage(1); }}/><button className="btn btn-primary" style={{ marginTop: "1rem" }} disabled={executing || requiredParametersMissing(report.content.parameters || [], parameters)} onClick={() => void execute(1)}>{executing ? "Executando..." : "Executar"}</button></div>
      {result && <div className="card" style={{ overflow: "hidden", padding: 0 }}><div style={{ overflowX: "auto" }}><table className="table" style={{ width: "100%" }}><thead><tr>{result.columns.map((column) => <th key={column.alias}>{column.alias}</th>)}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={index}>{result.columns.map((column) => <td key={column.alias}>{formatValue(row[column.alias], column.type)}</td>)}</tr>)}</tbody></table></div>
        {result.warnings?.map((warning) => <div key={`${warning.itemIndex}-${warning.fieldId}`} className="alert alert-warning">{warning.message}</div>)}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem" }}><span>{result.rowCount} linhas nesta página · {result.durationMs} ms</span><div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}><select className="form-input" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setResult(null); setPage(1); }}>{[25, 50, 100].map((size) => <option key={size}>{size}</option>)}</select><button className="btn btn-secondary" disabled={executing || page === 1} onClick={() => void execute(page - 1)}>Anterior</button><span>Página {page}</span><button className="btn btn-secondary" disabled={executing || result.rowCount < pageSize} onClick={() => void execute(page + 1)}>Próxima</button></div></div>
      </div>}
    </>}
  </main></div>;
}

function formatValue(value: unknown, type: string): string {
  if (value === null || value === undefined) return "—";
  if (type === "boolean") return value ? "Sim" : "Não";
  if (type === "number" || type === "integer") return Number(value).toLocaleString("pt-BR");
  if (type === "date" || type === "datetime") return new Date(String(value)).toLocaleString("pt-BR");
  return String(value);
}
