import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ok, err } from "../../../shared/result/result";
import { exportApi } from "../api/exportApi";
import { ReportExportAction } from "./ReportExportAction";

vi.mock("../api/exportApi", () => ({ exportApi: { request: vi.fn(), forReport: vi.fn(), get: vi.fn(), download: vi.fn() } }));
const queued = { id: "job", reportId: "report", title: "Vendas", format: "csv" as const, status: "queued" as const, createdAt: new Date().toISOString(), expiresAt: null, error: null };
beforeEach(() => {
  vi.mocked(exportApi.forReport).mockResolvedValue(ok({ data: [], totalCount: 0, page: 1, pageSize: 1 }));
  vi.mocked(exportApi.get).mockResolvedValue(ok(queued));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });
describe("ReportExportAction", () => {
  it("requests all rows with the execution parameters and prevents repeat submission", async () => {
    let finish!: (value: ReturnType<typeof ok<{ id: string; status: "queued" }>>) => void;
    vi.mocked(exportApi.request).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<ReportExportAction reportId="report" parameters={{ store: "one" }} disabled={false}/>);
    fireEvent.click(screen.getByRole("button", { name: "Exportar dados" }));
    fireEvent.click(screen.getByRole("button", { name: "Excel (.xlsx)" }));
    expect(exportApi.request).toHaveBeenCalledExactlyOnceWith("report", "xlsx", { store: "one" });
    expect(screen.getByRole("button", { name: "Solicitando…" })).toBeDisabled();
    finish(ok({ id: "job", status: "queued" }));
    expect(await screen.findByText("Exportação na fila")).toBeVisible();
  });
  it("preserves the action and allows retry after admission fails", async () => {
    vi.mocked(exportApi.request).mockResolvedValueOnce(err({ type: "about:blank", title: "Fila cheia", status: 429, detail: "Queue limit reached.", code: "export.queue_limit", instance: "/exports" })).mockResolvedValueOnce(ok({ id: "job", status: "queued" }));
    render(<ReportExportAction reportId="report" parameters={{}} disabled={false}/>);
    fireEvent.click(screen.getByRole("button", { name: "Exportar dados" }));
    fireEvent.click(screen.getByRole("button", { name: "CSV (.csv)" }));
    await screen.findByText("O limite de exportações pendentes foi atingido. Tente novamente em instantes.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Exportar dados" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Exportar dados" }));
    fireEvent.click(screen.getByRole("button", { name: "CSV (.csv)" }));
    await screen.findByText("Exportação na fila");
  });
  it("resumes an old queued request and explains an unavailable generator without resubmitting", async () => {
    vi.mocked(exportApi.forReport).mockResolvedValue(ok({ data: [{ ...queued, serviceStatus: "unavailable", createdAt: new Date(Date.now() - 40 * 60_000).toISOString() }], totalCount: 1, page: 1, pageSize: 1 }));
    render(<ReportExportAction reportId="report" parameters={{}} disabled/>);
    expect(await screen.findByText(/O serviço de geração está indisponível/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Acompanhar exportações" })).toBeEnabled();
    expect(exportApi.request).not.toHaveBeenCalled();
  });
  it("tracks real status transitions and enables an explicit download", async () => {
    vi.useFakeTimers();
    vi.mocked(exportApi.request).mockResolvedValue(ok({ id: "job", status: "queued" }));
    vi.mocked(exportApi.get).mockResolvedValueOnce(ok(queued)).mockResolvedValueOnce(ok({ ...queued, status: "running" })).mockResolvedValue(ok({ ...queued, status: "ready", expiresAt: "2026-10-24T12:00:00Z" }));
    vi.mocked(exportApi.download).mockResolvedValue(ok(undefined));
    render(<ReportExportAction reportId="report" parameters={{}} disabled={false}/>);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "Exportar dados" }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "CSV (.csv)" })); });
    expect(screen.getByText("Exportação na fila")).toBeVisible();
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(screen.getByText("Gerando seu arquivo")).toBeVisible();
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(screen.getByText("Arquivo pronto para baixar")).toBeVisible();
    expect(exportApi.download).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Baixar arquivo" })); });
    expect(exportApi.download).toHaveBeenCalledOnce();
  });
});
