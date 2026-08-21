import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Clock3, Play, SlidersHorizontal } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "../../../shared/components/Navbar";
import { Alert } from "../../../shared/components/Alert";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { isErr } from "../../../shared/result/result";
import { creatorApi } from "../api/creatorApi";
import { ExecutionParameterForm } from "../components/ExecutionParameterForm";
import { ReportPresentationRenderer } from "../components/ReportPresentationRenderer";
import { requiredParametersMissing } from "../utils/parameterUtils";
import type { ExecuteResponse, ReportDetail } from "../types/creatorTypes";

const capabilityLabels: Record<string, string> = {
  selectable: "seleção",
  filterable: "filtro",
  sortable: "ordenação",
  groupable: "agrupamento",
  aggregatable: "agregação",
};

function fieldBlockMessage(reason: string, capabilities: string[]) {
  if (reason === "field_grant_missing") return "acesso ao campo não concedido";
  if (reason === "field_unavailable") return "campo indisponível";
  if (reason === "capability_missing") return `permissões ausentes: ${capabilities.map((item) => capabilityLabels[item] || item).join(", ")}`;
  return "acesso insuficiente";
}

function schemaBlockMessage(reason: string) {
  if (reason === "schema_grant_missing") return "acesso ao schema não concedido";
  if (reason === "schema_unavailable") return "schema indisponível";
  return "um ou mais campos não estão disponíveis";
}

export function ReportRunnerPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [parameters, setParameters] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<ExecuteResponse | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [parametersExpanded, setParametersExpanded] = useState(true);
  const [lastExecutedAt, setLastExecutedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runExecution = useCallback(async (targetPage: number, targetPageSize: number, detail: ReportDetail, targetParameters: Record<string, unknown>) => {
    if (!reportId || !detail || detail.canExecute === false || requiredParametersMissing(detail.content.parameters || [], targetParameters)) return;
    setExecuting(true); setError(null);
    const response = await creatorApi.executeReport(reportId, { parameters: targetParameters, filters: [], page: targetPage, pageSize: targetPageSize });
    setExecuting(false);
    if (isErr(response)) setError(response.error.detail || "Não foi possível executar o relatório.");
    else { setResult(response.value); setPage(targetPage); setLastExecutedAt(new Date()); setParametersExpanded(false); }
  }, [reportId]);

  const execute = useCallback((targetPage: number, targetPageSize = pageSize) => {
    if (!report) return Promise.resolve();
    return runExecution(targetPage, targetPageSize, report, parameters);
  }, [pageSize, parameters, report, runExecution]);

  useEffect(() => {
    if (!reportId) { setLoading(false); setError("Relatório não especificado."); return; }
    void creatorApi.getReport(reportId).then(async (response) => {
      if (isErr(response)) { setLoading(false); setError(response.error.detail || "Relatório não encontrado ou sem acesso."); return; }
      const detail = response.value;
      setReport(detail); setLoading(false);
      if (detail.canExecute !== false && !requiredParametersMissing(detail.content.parameters || [], {})) await runExecution(1, 50, detail, {});
    });
  }, [reportId, runExecution]);

  const missingRequired = report ? requiredParametersMissing(report.content.parameters || [], parameters) : false;
  const changePageSize = (nextPageSize: number) => { setPageSize(nextPageSize); setResult(null); setPage(1); void execute(1, nextPageSize); };

  return <div className="report-runner"><Navbar/><main className="report-runner__main">
    {loading ? <div className="report-runner__page-state"><NeutralLoader/><span>Carregando relatório...</span></div> : !report ? <div className="report-runner__page-state">{error && <Alert type="error" message={error}/>}<Link className="btn btn-secondary" to="/dashboard">Voltar ao início</Link></div> : <>
      <header className="report-runner__header"><div><span className="report-runner__eyebrow">Relatório · {report.organizationName}</span><h1>{report.title}</h1><div className="report-runner__status"><Clock3 size={14}/>{executing ? "Executando agora..." : lastExecutedAt ? `Executado às ${lastExecutedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Ainda não executado"}</div></div><Link className="btn btn-secondary" to="/dashboard">Voltar</Link></header>
      {error && <Alert type="error" message={error}/>}
      {report.canExecute === false && <section className="report-execution-block" role="alert" aria-labelledby="execution-block-title">
        <div className="report-execution-block__header"><AlertTriangle size={20}/><div><strong id="execution-block-title">Este relatório não pode ser executado</strong><span>Solicite a um administrador acesso aos schemas e campos abaixo.</span></div></div>
        <ul className="report-execution-block__schemas">{report.blockedSchemas.map((schema) => <li key={schema.schemaId}>
          <div><strong>{schema.schemaName || "Schema sem nome"}</strong><code>{schema.schemaId}</code><span>{schemaBlockMessage(schema.reason)}</span></div>
          {schema.blockedFields.length > 0 && <ul>{schema.blockedFields.map((field) => <li key={field.fieldId}><span><strong>{field.fieldName || "Campo sem nome"}</strong> — {fieldBlockMessage(field.reason, field.missingCapabilities)}</span><code>{field.fieldId}</code></li>)}</ul>}
        </li>)}</ul>
      </section>}
      <section className={`report-parameters${parametersExpanded ? " report-parameters--expanded" : ""}`}>
        <button type="button" className="report-parameters__toggle" aria-expanded={parametersExpanded} onClick={() => setParametersExpanded((current) => !current)}><span><SlidersHorizontal size={18}/><span><strong>Parâmetros</strong><small>{missingRequired ? "Preencha os campos obrigatórios" : lastExecutedAt ? "Valores usados na execução" : "Revise antes de executar"}</small></span></span>{parametersExpanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</button>
        {parametersExpanded && <div className="report-parameters__content"><ExecutionParameterForm parameters={report.content.parameters || []} where={report.content.dataset.where} resolvedParameters={result?.resolvedParameters} values={parameters} onChange={(values) => { setParameters(values); setResult(null); setPage(1); setLastExecutedAt(null); setParametersExpanded(true); }}/>{missingRequired && <p className="report-parameters__required">Preencha os campos obrigatórios para executar.</p>}<div className="report-parameters__actions"><button className="btn btn-primary" disabled={executing || missingRequired || report.canExecute === false} onClick={() => void execute(1)}><Play size={16}/>{executing ? "Executando..." : "Executar relatório"}</button></div></div>}
      </section>
      {result?.warnings?.length ? <div className="report-runner__warnings">{result.warnings.map((warning) => <Alert key={`${warning.itemIndex}-${warning.fieldId}`} type="warning" message={warning.message}/>)}</div> : null}
      <ReportPresentationRenderer presentation={report.content.presentation} select={report.content.dataset.select} result={result} loading={executing} page={page} pageSize={pageSize} onPageChange={(targetPage) => void execute(targetPage)} onPageSizeChange={changePageSize}/>
    </>}
  </main></div>;
}
