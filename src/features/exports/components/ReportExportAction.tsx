import { problemMessage } from "../../../shared/presentation/messages";
import { useEffect, useRef, useState } from "react";
import { SourceActionMenu } from "../../catalog/components/SourceActionMenu";
import { Alert } from "../../../shared/components/Alert";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { isErr } from "../../../shared/result/result";
import { exportApi, type ExportFormat, type ExportJob } from "../api/exportApi";
import { ExportProgressCard } from "./ExportProgressCard";

export function ReportExportAction({ reportId, parameters, disabled }: { reportId: string; parameters: Record<string, unknown>; disabled: boolean }) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [requested, setRequested] = useState(false);
  const [job, setJob] = useState<ExportJob | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const progress = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true, inFlight = false;
    const controller = new AbortController();
    async function refresh() {
      if (!active || inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        if (jobId) {
          const response = await exportApi.get(jobId, controller.signal);
          if (!active) return;
          if (isErr(response)) setTrackingError(problemMessage(response.error, "Não foi possível atualizar o andamento. Seu pedido permanece registrado."));
          else { setJob(response.value); setTrackingError(null); }
        } else {
          const response = await exportApi.forReport(reportId, controller.signal);
          if (!active) return;
          if (isErr(response)) setTrackingError(problemMessage(response.error, "Não foi possível consultar as exportações deste relatório."));
          else { setJob(response.value.data.find(item => item.reportId === reportId) ?? null); setTrackingError(null); }
        }
      } catch { if (active) setTrackingError("Não foi possível atualizar o andamento. Consulte as exportações ou tente atualizar novamente."); }
      finally { inFlight = false; if (active) setChecking(false); }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15000);
    const visible = () => void refresh();
    document.addEventListener("visibilitychange", visible);
    return () => { active = false; controller.abort(); window.clearInterval(interval); document.removeEventListener("visibilitychange", visible); };
  }, [jobId, reportId, refreshVersion]);
  async function request(format: ExportFormat) {
    if (lock.current || disabled) return;
    lock.current = true; setBusy(true); setError(null); setRequested(false);
    try {
      const result = await exportApi.request(reportId, format, parameters);
      if (isErr(result)) setError(problemMessage(result.error, "Não foi possível solicitar a exportação."));
      else {
        setRequested(true); setJobId(result.value.id); setJob(null);
        window.dispatchEvent(new Event("report-export-requested"));
        progress.current?.focus({ preventScroll: true });
      }
    } catch { setError("Falha de comunicação ao solicitar a exportação. Tente novamente."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function download() {
    if (!job || lock.current) return;
    lock.current = true; setDownloading(true); setError(null);
    try { const response = await exportApi.download(job); if (isErr(response)) setError(problemMessage(response.error, "Não foi possível baixar o arquivo. Tente novamente.")); }
    finally { lock.current = false; setDownloading(false); }
  }
  const open = () => window.dispatchEvent(new Event("report-export-open"));
  return <section className="report-export-action" aria-label="Exportação de dados" aria-busy={busy}>
    <div><SourceActionMenu label={busy ? "Solicitando…" : "Exportar dados"} disabled={disabled || busy}>
      <button type="button" onClick={() => void request("xlsx")}>Excel (.xlsx)</button>
      <button type="button" onClick={() => void request("csv")}>CSV (.csv)</button>
    </SourceActionMenu><p>Exporta todas as linhas em uma nova consulta com os parâmetros informados na última execução. Períodos automáticos são calculados ao solicitar.</p></div>
    {disabled && <p>Execute o relatório com dados para habilitar uma nova exportação. Os pedidos anteriores continuam disponíveis abaixo e no sino.</p>}
    <div ref={progress} tabIndex={-1} className="export-progress-anchor">
      {checking && !busy && !requested && !job && <NeutralLoader compact message="Consultando exportações anteriores deste relatório…"/>}
      {busy && <NeutralLoader compact message="Solicitando exportação…"/>}
      {requested && !job && <div className="export-progress" role="status"><strong>Exportação solicitada</strong><p>Seu pedido foi registrado. Consultando o andamento…</p><button type="button" className="btn btn-secondary" onClick={open}>Acompanhar exportações</button></div>}
      {job && <ExportProgressCard job={job} downloading={downloading} onDownload={() => void download()} onOpen={open}/>}
    </div>
    {(error || trackingError) && <div className="report-export-feedback"><Alert type="error" message={error || trackingError || "Não foi possível atualizar a exportação."}/><button type="button" className="btn btn-secondary" onClick={() => setRefreshVersion(value => value + 1)}>Atualizar andamento</button></div>}
  </section>;
}
