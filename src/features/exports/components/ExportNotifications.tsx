import { problemMessage } from "../../../shared/presentation/messages";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Bell, X } from "lucide-react";
import { useModalFocus } from "../../../shared/hooks/useModalFocus";
import { useAuth } from "../../auth/context/AuthContext";
import { Alert } from "../../../shared/components/Alert";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { isErr } from "../../../shared/result/result";
import { exportApi, type ExportJob, type ExportNotice } from "../api/exportApi";

const labels: Record<ExportJob["status"], string> = { queued: "Na fila", running: "Gerando", ready: "Disponível", failed: "Falhou", expired: "Expirada" };
export function ExportNotifications() {
  const { state } = useAuth();
  const userId = state.status === "authenticated" ? state.user?.id : undefined;
  return userId ? <UserExportNotifications key={userId}/> : null;
}
function UserExportNotifications() {
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [notices, setNotices] = useState<ExportNotice[]>([]);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [noticePage, setNoticePage] = useState(1);
  const [noticeTotal, setNoticeTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const actionLock = useRef(false);
  const modal = useModalFocus(open, () => setOpen(false));
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    const show = () => { setOpen(true); setPage(1); setNoticePage(1); refreshRef.current(); };
    window.addEventListener("report-export-open", show);
    return () => window.removeEventListener("report-export-open", show);
  }, []);
  useEffect(() => {
    let active = true;
    let inFlight = false;
    const abort = new AbortController();
    async function refresh() {
      if (!active || inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const [exports, notifications] = await Promise.all([exportApi.list(page, abort.signal), exportApi.notifications(noticePage, abort.signal)]);
        if (!active) return;
        if (isErr(exports)) setError(problemMessage(exports.error, "Não foi possível consultar as exportações."));
        else { setJobs(exports.value.data); setTotal(exports.value.totalCount); }
        if (isErr(notifications)) setError(problemMessage(notifications.error, "Não foi possível consultar os avisos."));
        else { setNotices(notifications.value.data); setUnread(notifications.value.unreadCount); setNoticeTotal(notifications.value.totalCount); }
        if (!isErr(exports) && !isErr(notifications)) setError(null);
      } catch { if (active) setError("Falha de comunicação ao consultar exportações. Tente novamente."); }
      finally { inFlight = false; if (active) setLoading(false); }
    }
    refreshRef.current = () => { void refresh(); };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15000);
    const update = () => void refresh();
    document.addEventListener("visibilitychange", update);
    window.addEventListener("report-export-requested", update);
    return () => { active = false; abort.abort(); window.clearInterval(interval); document.removeEventListener("visibilitychange", update); window.removeEventListener("report-export-requested", update); };
  }, [page, noticePage]);
  const refresh = useCallback(() => refreshRef.current(), []);
  async function download(job: ExportJob) {
    if (actionLock.current) return;
    actionLock.current = true; setBusyId(job.id); setError(null);
    try { const result = await exportApi.download(job); if (isErr(result)) setError(problemMessage(result.error, "Não foi possível baixar o arquivo.")); }
    finally { actionLock.current = false; setBusyId(null); }
  }
  async function read(id: string) {
    if (actionLock.current) return;
    actionLock.current = true; setBusyId(id); setError(null);
    try { const result = await exportApi.read(id); if (isErr(result)) setError(problemMessage(result.error, "Não foi possível marcar o aviso como lido.")); else refresh(); }
    finally { actionLock.current = false; setBusyId(null); }
  }
  const pending = jobs.filter(job => job.status === "queued" || job.status === "running").length;
  return <>
    <button type="button" className="btn btn-secondary export-bell" aria-label={`Exportações e notificações${unread ? `, ${unread} não lidas` : ""}${pending ? `, ${pending} em andamento` : ""}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => { setOpen(true); refresh(); }}><Bell size={19}/>{(unread > 0 || pending > 0) && <span className="export-bell__count">{unread || pending}</span>}</button>
    <span className="loading-sr-only" role="status">{unread > 0 ? `${unread} notificações de exportação não lidas.` : ""}</span>
    {open && createPortal(<div className="export-notifications-backdrop" onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div ref={modal} role="dialog" aria-modal="true" aria-labelledby="export-notifications-title" className="export-notifications" tabIndex={-1}>
        <header><h2 id="export-notifications-title">Exportações e notificações</h2><button type="button" className="btn btn-secondary" aria-label="Fechar notificações" onClick={() => setOpen(false)}><X size={18}/></button></header>
        <div className="export-notifications__body">
          {error && <><Alert type="error" message={error}/><button className="btn btn-secondary" onClick={refresh}>Tentar novamente</button></>}
          {loading ? <NeutralLoader message="Consultando exportações e notificações…"/> : error && jobs.length === 0 && notices.length === 0 ? null : <>
            <section aria-label="Arquivos exportados"><h3>Arquivos</h3>{jobs.length === 0 && <p>Nenhuma exportação solicitada.</p>}
              {jobs.map(job => <article key={job.id} className="export-notice"><strong>{job.title}</strong><small>Organização: {job.organizationName?.trim() || "Organização indisponível"}</small><span>{job.format.toUpperCase()} · {labels[job.status]}</span>
                <time dateTime={job.createdAt}>Solicitada em {new Date(job.createdAt).toLocaleString("pt-BR")}</time>
                {(job.status === "queued" || job.status === "running") && (job.serviceStatus === "unavailable" ? <Alert type="warning" message="O serviço de geração está indisponível. Seu pedido permanece registrado. Avise o administrador; não é necessário solicitar novamente."/> : <NeutralLoader compact message={job.status === "queued" ? "Aguardando processamento. Você pode continuar usando o sistema." : "Gerando o arquivo. O download aparecerá aqui quando terminar."}/>)}
                {job.expiresAt && <small>Disponível até {new Date(job.expiresAt).toLocaleString("pt-BR")}</small>}
                {job.error && <p>{problemMessage({ code: job.errorCode }, "Não foi possível gerar o arquivo. Revise os parâmetros e tente novamente.")}</p>}
                {job.status === "ready" && <button type="button" className="btn btn-secondary" disabled={busyId !== null} onClick={() => void download(job)}>{busyId === job.id ? "Baixando…" : "Baixar arquivo"}</button>}
                {(job.status === "failed" || job.status === "expired") && <Link className="btn btn-secondary" to={`/reports/${job.reportId}/run`} onClick={() => setOpen(false)}>Abrir relatório para exportar novamente</Link>}
              </article>)}
              {total > 20 && <div className="export-notifications__pages"><button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</button><span>Página {page}</span><button className="btn btn-secondary" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Próxima</button></div>}
            </section>
            <section aria-label="Avisos"><h3>Avisos</h3>{notices.length === 0 && <p>Nenhum aviso de exportação.</p>}
              {notices.map(notice => <article key={notice.id} className="export-notice"><p>{notice.message}</p><time dateTime={notice.createdAt}>{new Date(notice.createdAt).toLocaleString("pt-BR")}</time>{!notice.readAt && <button type="button" className="btn btn-secondary" disabled={busyId !== null} onClick={() => void read(notice.id)}>{busyId === notice.id ? "Salvando…" : "Marcar como lida"}</button>}</article>)}
              {noticeTotal > 20 && <div className="export-notifications__pages"><button className="btn btn-secondary" disabled={noticePage === 1} onClick={() => setNoticePage(p => p - 1)}>Avisos anteriores</button><span>Página {noticePage}</span><button className="btn btn-secondary" disabled={noticePage * 20 >= noticeTotal} onClick={() => setNoticePage(p => p + 1)}>Mais avisos</button></div>}
            </section>
          </>}
        </div><footer>Os arquivos ficam disponíveis por 24 horas após a conclusão.</footer>
      </div>
    </div>, document.body)}
  </>;
}
