import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ok, err } from "../../../shared/result/result";
import { exportApi } from "../api/exportApi";
import { ReportExportAction } from "./ReportExportAction";

vi.mock("../api/exportApi", () => ({ exportApi: { request: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
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
    expect(await screen.findByText(/Exportação solicitada/)).toBeVisible();
  });
  it("preserves the action and allows retry after admission fails", async () => {
    vi.mocked(exportApi.request).mockResolvedValueOnce(err({ type: "about:blank", title: "Fila cheia", status: 429, detail: "Tente novamente em instantes.", instance: "/exports" })).mockResolvedValueOnce(ok({ id: "job", status: "queued" }));
    render(<ReportExportAction reportId="report" parameters={{}} disabled={false}/>);
    fireEvent.click(screen.getByRole("button", { name: "Exportar dados" }));
    fireEvent.click(screen.getByRole("button", { name: "CSV (.csv)" }));
    await screen.findByText("Tente novamente em instantes.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Exportar dados" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Exportar dados" }));
    fireEvent.click(screen.getByRole("button", { name: "CSV (.csv)" }));
    await screen.findByText(/Exportação solicitada/);
  });
});
