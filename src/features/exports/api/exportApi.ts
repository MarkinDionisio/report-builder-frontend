import { apiFetch } from "../../../shared/api/client";
import { err, isErr, ok } from "../../../shared/result/result";
import type { Result } from "../../../shared/result/result";
import type { ApiProblemDetails } from "../../../shared/api/types";
import type { RuntimeFilter } from "../../creator/types/creatorTypes";

export type ExportFormat = "xlsx" | "csv";
export interface ExportJob {
  id: string; reportId: string; title: string; format: ExportFormat;
  status: "queued" | "running" | "ready" | "failed" | "expired";
  createdAt: string; expiresAt: string | null; error: string | null;
}
export interface ExportNotice { id: string; jobId: string; message: string; createdAt: string; readAt: string | null }
export interface ExportPage<T> { data: T[]; totalCount: number; page: number; pageSize: number }
async function json<T>(path: string, init?: RequestInit): Promise<Result<T, ApiProblemDetails>> {
  const response = await apiFetch(path, init);
  if (isErr(response)) return response;
  try { return ok(await response.value.json() as T); }
  catch { return err({ title: "Resposta inválida", status: response.value.status, detail: "Não foi possível consultar as exportações.", type: "about:blank", instance: path }); }
}
export const exportApi = {
  request: (reportId: string, format: ExportFormat, parameters: Record<string, unknown>, filters: RuntimeFilter[] = []) =>
    json<{ id: string; status: ExportJob["status"] }>(`/api/v1/reports/${encodeURIComponent(reportId)}/exports`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ format, parameters, filters }),
    }),
  list: (page = 1, signal?: AbortSignal) => json<ExportPage<ExportJob>>(`/api/v1/report-exports?page=${page}&pageSize=20`, { signal }),
  notifications: (page = 1, signal?: AbortSignal) => json<ExportPage<ExportNotice> & { unreadCount: number }>(`/api/v1/notifications?page=${page}&pageSize=20`, { signal }),
  read: (id: string) => apiFetch(`/api/v1/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" }),
  async download(job: ExportJob): Promise<Result<void, ApiProblemDetails>> {
    const response = await apiFetch(`/api/v1/report-exports/${encodeURIComponent(job.id)}/download`);
    if (isErr(response)) return response;
    let url: string | undefined;
    const anchor = document.createElement("a");
    try {
      const blob = await response.value.blob();
      url = URL.createObjectURL(blob);
      const disposition = response.value.headers.get("Content-Disposition") || "";
      const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
      const filenameMatch = /filename=(?:"([^"]+)"|([^;]+))/i.exec(disposition);
      const plain = filenameMatch?.[1] || filenameMatch?.[2]?.trim();
      let name = plain || `${job.title}.${job.format}`;
      if (encoded) { try { name = decodeURIComponent(encoded); } catch { /* use plain filename */ } }
      anchor.href = url; anchor.download = Array.from(name, c => c === "/" || c === "\\" || c.charCodeAt(0) < 32 ? "_" : c).join("");
      document.body.appendChild(anchor); anchor.click();
      return ok(undefined);
    } catch { return err({ title: "Falha no download", status: 0, detail: "Não foi possível baixar o arquivo. Tente novamente.", type: "about:blank", instance: "/api/v1/report-exports" }); }
    finally { anchor.remove(); if (url) { const downloadedUrl = url; window.setTimeout(() => URL.revokeObjectURL(downloadedUrl), 1000); } }
  },
};
