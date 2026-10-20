import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { creatorApi } from "../api/creatorApi";
import { ImportGlobalReportModal } from "./ImportGlobalReportModal";
import type { ReportDetail } from "../types/creatorTypes";

vi.mock("../api/creatorApi", () => ({ creatorApi: { listGlobalTemplates: vi.fn(), getImportDataSources: vi.fn(), checkReportImport: vi.fn(), importReport: vi.fn() } }));
const onImported = vi.fn();
const templates = { page: 1, pageSize: 10, totalPages: 2, totalRecords: 11, data: [{ id: "global", title: "Vendas", updatedAt: "2026-10-20" }, { id: "other", title: "Compras", updatedAt: "2026-10-20" }] };
function show() { return render(<ImportGlobalReportModal organizationId="target" onClose={vi.fn()} onImported={onImported}/>); }
async function select() {
  await screen.findByRole("option", { name: "Vendas" });
  fireEvent.change(screen.getByLabelText("Modelo global"), { target: { value: "global" } });
  fireEvent.change(screen.getByLabelText("Data source de destino"), { target: { value: "source" } });
}
beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  vi.mocked(creatorApi.listGlobalTemplates).mockResolvedValue({ ok: true, value: templates });
  vi.mocked(creatorApi.getImportDataSources).mockResolvedValue({ ok: true, value: [{ id: "source", name: "Base local" }, { id: "second", name: "Outra base" }] });
  vi.mocked(creatorApi.checkReportImport).mockResolvedValue({ ok: true, value: { canImport: true, issues: [] } });
});
describe("ImportGlobalReportModal", () => {
  it("verifica antes de importar e fixa a organização atual", async () => {
    const report = { id: "copy" } as ReportDetail;
    vi.mocked(creatorApi.importReport).mockResolvedValue({ ok: true, value: report });
    show(); await select();
    expect(screen.getByLabelText("Título da cópia")).toHaveValue("Vendas");
    expect(screen.getByRole("button", { name: "Importar" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Verificar compatibilidade" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Importar" })).toBeEnabled());
    expect(creatorApi.checkReportImport).toHaveBeenCalledWith("global", { organizationId: "target", dataSourceId: "source", title: "Vendas" });
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    await waitFor(() => expect(onImported).toHaveBeenCalledWith(report));
  });
  it("invalida a verificação ao trocar destino ou modelo e suporta paginação", async () => {
    show(); await select();
    fireEvent.click(screen.getByRole("button", { name: "Verificar compatibilidade" }));
    await screen.findByText(/Modelo compatível/);
    fireEvent.change(screen.getByLabelText("Data source de destino"), { target: { value: "second" } });
    expect(screen.getByRole("button", { name: "Importar" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Verificar compatibilidade" }));
    await screen.findByText(/Modelo compatível/);
    fireEvent.change(screen.getByLabelText("Modelo global"), { target: { value: "other" } });
    expect(screen.getByRole("button", { name: "Importar" })).toBeDisabled();
    expect(screen.getByLabelText("Título da cópia")).toHaveValue("Compras");
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    await waitFor(() => expect(creatorApi.listGlobalTemplates).toHaveBeenCalledWith(2));
  });
  it("mostra incompatibilidades e não permite importar", async () => {
    vi.mocked(creatorApi.checkReportImport).mockResolvedValue({ ok: true, value: { canImport: false, issues: [{ code: "field_incompatible", path: "dataset.select[0]", referenceId: "field", message: "Campo incompatível no destino." }] } });
    show(); await select(); fireEvent.click(screen.getByRole("button", { name: "Verificar compatibilidade" }));
    await screen.findByText("Campo incompatível no destino.");
    expect(screen.getByRole("button", { name: "Importar" })).toBeDisabled();
  });
  it("invalida a verificação se o catálogo mudar antes da importação", async () => {
    vi.mocked(creatorApi.importReport).mockResolvedValue({ ok: false, error: { type: "about:blank", instance: "", status: 409, title: "Conflict", code: "report_import.incompatible", detail: "Verifique a compatibilidade novamente." } });
    show(); await select(); fireEvent.click(screen.getByRole("button", { name: "Verificar compatibilidade" }));
    await screen.findByText(/Modelo compatível/); fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    await screen.findByText(/Verifique a compatibilidade novamente/);
    expect(screen.getByRole("button", { name: "Importar" })).toBeDisabled();
    expect(onImported).not.toHaveBeenCalled();
  });
  it("mostra listas vazias e erros de permissão", async () => {
    vi.mocked(creatorApi.listGlobalTemplates).mockResolvedValue({ ok: true, value: { ...templates, data: [], totalPages: 0 } });
    vi.mocked(creatorApi.getImportDataSources).mockResolvedValue({ ok: false, error: { type: "about:blank", instance: "", status: 403, title: "Forbidden", code: "report_import.forbidden", detail: "Sem permissão para importar." } });
    show(); await screen.findByText("Nenhum modelo global disponível.");
    await screen.findByText(/É necessário acesso de creator/);
    expect(screen.getByRole("button", { name: "Verificar compatibilidade" })).toBeDisabled();
  });
  it("desabilita ações durante a verificação e impede submissões duplicadas", async () => {
    vi.mocked(creatorApi.checkReportImport).mockImplementation(() => new Promise(() => {}));
    show(); await select(); const button = screen.getByRole("button", { name: "Verificar compatibilidade" });
    fireEvent.click(button); fireEvent.click(button);
    expect(creatorApi.checkReportImport).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Modelo global")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  });
});
