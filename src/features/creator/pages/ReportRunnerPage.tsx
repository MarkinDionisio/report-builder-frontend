import { diagnosticMessage } from "../../../shared/presentation/messages";
import { problemMessage } from "../../../shared/presentation/messages";
import { ReportMetadata } from "../components/ReportMetadata";
import { ReportExportAction } from "../../exports/components/ReportExportAction";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Clock3, Play, SlidersHorizontal } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "../../../shared/components/Navbar";
import { Alert } from "../../../shared/components/Alert";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { isErr } from "../../../shared/result/result";
import { creatorApi } from "../api/creatorApi";
import { ExecutionParameterForm } from "../components/ExecutionParameterForm";
import { ReportPresentationRenderer } from "../components/ReportPresentationRenderer";
import { ReportAccessBlockPanel } from "../components/ReportAccessBlockPanel";
import { requiredParametersMissing } from "../utils/parameterUtils";
import type { ExecuteResponse, ReportDetail } from "../types/creatorTypes";

export function ReportRunnerPage() {
  const { reportId } = useParams<{ reportId: string }>();
  return <ReportRunnerContent key={reportId}/>;
}

function ReportRunnerContent() {
  const executionLock = useRef(false);
  const parameterVersion = useRef(0);
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [parameters, setParameters] = useState<Record<string, unknown>>({});
  const [lastExecutionParameters, setLastExecutionParameters] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<ExecuteResponse | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [parametersExpanded, setParametersExpanded] = useState(true);
  const [lastExecutedAt, setLastExecutedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runExecution = useCallback(async (targetPage: number, targetPageSize: number, detail: ReportDetail, targetParameters: Record<string, unknown>) => {
    if (executionLock.current || !reportId || !detail || detail.canExecute === false || requiredParametersMissing(detail.content.parameters || [], targetParameters)) return;
    executionLock.current = true;
    const inputVersion = parameterVersion.current;
    setExecuting(true); setError(null);
    try {
      const response = await creatorApi.executeReport(reportId, { parameters: targetParameters, filters: [], page: targetPage, pageSize: targetPageSize });
      if (inputVersion !== parameterVersion.current) return;
      setExecuting(false);
      if (isErr(response)) {
        setError(problemMessage(response.error, "Não foi possível executar o relatório."));
        if (response.error.code === "report_execution.global_template_requires_import") {
          setReport(current => current ? { ...current, canExecute: false, executionBlockCode: response.error.code! } : current);
        }
      }
      else { setResult(response.value); setLastExecutionParameters(structuredClone(targetParameters)); setPage(targetPage); setLastExecutedAt(new Date()); setParametersExpanded((detail.content.parameters?.length ?? 0) > 0); }
    } catch { setError("Falha de comunicação ao executar relatório. Tente novamente."); }
    finally { executionLock.current = false; setExecuting(false); }
  }, [reportId]);

  const execute = useCallback((targetPage: number, targetPageSize = pageSize) => {
    if (!report) return Promise.resolve();
    return runExecution(targetPage, targetPageSize, report, parameters);
  }, [pageSize, parameters, report, runExecution]);

  useEffect(() => {
    if (!reportId) { setLoading(false); setError("Relatório não especificado."); return; }
    let active = true;
    void creatorApi.getReport(reportId).then(async (response) => {
      if (!active) return;
      if (isErr(response)) { setLoading(false); setError(problemMessage(response.error, "Relatório não encontrado ou sem acesso.")); return; }
      const detail = response.value;
      setReport(detail); setLoading(false);
      if (detail.canExecute !== false && (detail.content.parameters?.length ?? 0) === 0) await runExecution(1, 50, detail, {});
    }).catch(() => { if (active) { setLoading(false); setError("Falha de comunicação ao consultar relatório."); } });
    return () => { active = false; };
  }, [reportId, runExecution]);

  const missingRequired = report ? requiredParametersMissing(report.content.parameters || [], parameters) : false;
  const changePageSize = (nextPageSize: number) => { setPageSize(nextPageSize); void execute(1, nextPageSize); };

  return <div className="report-runner"><Navbar/><main className="report-runner__main">
    {loading ? <div className="report-runner__page-state"><NeutralLoader message="Consultando configuração e parâmetros do relatório…" minHeight="auto"/></div> : !report ? <div className="report-runner__page-state">{error && <Alert type="error" message={error}/>}<Link className="btn btn-secondary" to="/dashboard">Voltar ao início</Link></div> : <>
      <header className="report-runner__header"><div><span className="report-runner__eyebrow">Relatório · {report.organizationName}</span><h1>{report.title}</h1><ReportMetadata description={report.description} tags={report.tags} full/><div className="report-runner__status"><Clock3 size={14}/>{executing ? "Executando agora…" : lastExecutedAt ? `Executado às ${lastExecutedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Ainda não executado"}</div></div><Link className="btn btn-secondary" to="/dashboard">Voltar</Link></header>
      {error && <Alert type="error" message={error}/>}
      {report.executionBlockCode === "report_execution.global_template_requires_import" && <Alert type="info" message="Este relatório é um modelo global. Na área de criação da sua organização, acesse Catálogo de relatórios globais para criar e executar uma cópia com os seus dados."/>}
      {report.canExecute === false && report.executionBlockCode !== "report_execution.global_template_requires_import" && <ReportAccessBlockPanel blockedSchemas={report.blockedSchemas} title="Execução bloqueada" description="Você pode consultar este relatório, mas ainda não possui acesso para executá-lo. Solicite ao administrador da organização as permissões indicadas abaixo."/>}
      <section className={`report-parameters${parametersExpanded ? " report-parameters--expanded" : ""}`}>
        <button type="button" className="report-parameters__toggle" aria-expanded={parametersExpanded} onClick={() => setParametersExpanded((current) => !current)}><span><SlidersHorizontal size={18}/><span><strong>Parâmetros</strong><small>{missingRequired ? "Preencha os campos obrigatórios" : lastExecutedAt ? "Valores usados na execução" : "Revise antes de executar"}</small></span></span>{parametersExpanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</button>
        {parametersExpanded && <div className="report-parameters__content"><ExecutionParameterForm parameters={report.content.parameters || []} where={report.content.dataset.where} resolvedParameters={result?.resolvedParameters} values={parameters} onChange={(values) => { parameterVersion.current++; setParameters(values); setResult(null); setPage(1); setLastExecutedAt(null); setParametersExpanded(true); }}/>{missingRequired && <p className="report-parameters__required">Preencha os campos obrigatórios para executar.</p>}<div className="report-parameters__actions">{report.executionBlockCode !== "report_execution.global_template_requires_import" && <button className="btn btn-primary" disabled={executing || missingRequired || report.canExecute === false} onClick={() => void execute(1)}><Play size={16}/>{executing ? "Executando…" : "Executar relatório"}</button>}</div></div>}
      </section>
      {result?.warnings?.length ? <div className="report-runner__warnings">{result.warnings.map((warning) => <Alert key={`${warning.itemIndex}-${warning.fieldId}`} type="warning" message={diagnosticMessage(warning.code, "Um item da consulta requer revisão.")}/>)}</div> : null}
      {reportId && report.canExecute !== false && <ReportExportAction key={`${reportId}-${lastExecutedAt?.getTime()}`} reportId={reportId} parameters={lastExecutionParameters} disabled={executing || !result || result.rows.length === 0}/>}
      <ReportPresentationRenderer presentation={report.content.presentation} select={report.content.dataset.select} result={result} loading={executing} page={page} pageSize={pageSize} onPageChange={(targetPage) => void execute(targetPage)} onPageSizeChange={changePageSize}/>
    </>}
  </main></div>;
}
