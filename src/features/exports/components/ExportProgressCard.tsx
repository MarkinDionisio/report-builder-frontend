import { CheckCircle2, Clock3, Download, FileClock, TriangleAlert } from "lucide-react";
import { NeutralLoader } from "../../../shared/components/NeutralLoader";
import { useEffect, useState } from "react";
import type { ExportJob } from "../api/exportApi";

export function ExportProgressCard({ job, downloading, onDownload, onOpen }: {
  job: ExportJob; downloading: boolean; onDownload: () => void; onOpen: () => void;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 15000); return () => window.clearInterval(timer); }, []);
  const queued = job.status === "queued", running = job.status === "running", ready = job.status === "ready";
  const delayed = (queued || running) && now - Date.parse(job.startedAt || job.createdAt) > 5 * 60_000;
  const unavailable = (queued || running) && job.serviceStatus === "unavailable";
  const title = ready ? "Arquivo pronto para baixar" : queued ? "Exportação na fila" : running ? "Gerando seu arquivo" : job.status === "expired" ? "Arquivo expirado" : "Não foi possível gerar o arquivo";
  return <div className={`export-progress export-progress--${unavailable || delayed ? "warning" : job.status}`} aria-label="Andamento da exportação">
    <div className="export-progress__heading">{ready ? <CheckCircle2 size={22}/> : unavailable || delayed || job.status === "failed" ? <TriangleAlert size={22}/> : <FileClock size={22}/>}<div role="status"><strong>{title}</strong><span>{job.format.toUpperCase()} · Solicitada em {new Date(job.createdAt).toLocaleString("pt-BR")}</span></div></div>
    <ol className="export-progress__steps" aria-label="Etapas da exportação"><li data-active={queued || running || ready}><Clock3 size={16}/>Na fila</li><li data-active={running || ready}>Gerando arquivo</li><li data-active={ready}>Pronto para baixar</li></ol>
    {unavailable ? <p role="alert">O serviço de geração está indisponível. Seu pedido permanece na fila. Não é necessário solicitar novamente; avise o administrador para restabelecer o serviço.</p> : delayed ? <p role="alert">A exportação está demorando mais que o esperado. Seu pedido continua registrado. Acompanhe as exportações e, se a situação persistir, avise o administrador.</p> : queued ? <p>Seu pedido foi recebido e aguarda processamento. Você pode continuar usando o sistema; não precisa enviar novamente.</p> : running ? <NeutralLoader compact message="Consultando os dados e preparando o arquivo…"/> : ready ? <p>O download está disponível até {job.expiresAt ? new Date(job.expiresAt).toLocaleString("pt-BR") : "o prazo indicado nas exportações"}. Clique em Baixar arquivo para salvar no seu computador.</p> : <p>{job.status === "expired" ? "O prazo de download terminou. Você pode solicitar uma nova exportação." : "Revise os parâmetros e solicite uma nova exportação. Se a falha persistir, avise o administrador."}</p>}
    <div className="export-progress__actions">{ready && <button type="button" className="btn btn-primary" disabled={downloading} onClick={onDownload}><Download size={16}/>{downloading ? "Baixando…" : "Baixar arquivo"}</button>}<button type="button" className="btn btn-secondary" onClick={onOpen}>Acompanhar exportações</button><small>Atualização automática a cada 15 segundos. O aviso também aparece no sino.</small></div>
  </div>;
}
