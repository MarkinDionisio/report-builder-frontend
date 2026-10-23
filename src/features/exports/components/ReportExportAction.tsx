import { problemMessage } from "../../../shared/presentation/messages";
import { useRef, useState } from "react";
import { SourceActionMenu } from "../../catalog/components/SourceActionMenu";
import { Alert } from "../../../shared/components/Alert";
import { isErr } from "../../../shared/result/result";
import { exportApi, type ExportFormat } from "../api/exportApi";

export function ReportExportAction({ reportId, parameters, disabled }: { reportId: string; parameters: Record<string, unknown>; disabled: boolean }) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);
  async function request(format: ExportFormat) {
    if (lock.current || disabled) return;
    lock.current = true; setBusy(true); setError(null); setRequested(false);
    try {
      const result = await exportApi.request(reportId, format, parameters);
      if (isErr(result)) setError(problemMessage(result.error, "Não foi possível solicitar a exportação."));
      else { setRequested(true); window.dispatchEvent(new Event("report-export-requested")); }
    } catch { setError("Falha de comunicação ao solicitar a exportação. Tente novamente."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="report-export-action" aria-label="Exportação de dados" aria-busy={busy}>
    <div><SourceActionMenu label={busy ? "Solicitando…" : "Exportar dados"} disabled={disabled || busy}>
      <button type="button" onClick={() => void request("xlsx")}>Excel (.xlsx)</button>
      <button type="button" onClick={() => void request("csv")}>CSV (.csv)</button>
    </SourceActionMenu><p>Exporta todas as linhas em uma nova consulta com os parâmetros informados na última execução. Períodos automáticos são calculados ao solicitar.</p></div>
    {busy && <span role="status">Solicitando exportação…</span>}
    {requested && <p role="status">Exportação solicitada. Você será avisado quando estiver disponível.</p>}
    {error && <Alert type="error" message={error}/>}
  </section>;
}
