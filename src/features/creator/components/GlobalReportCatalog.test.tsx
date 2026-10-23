import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { creatorApi } from "../api/creatorApi";
import { GlobalReportCatalog } from "./GlobalReportCatalog";
import type { ReportDetail } from "../types/creatorTypes";

vi.mock("../api/creatorApi", () => ({ creatorApi: { listReportTags: vi.fn(), listGlobalTemplates: vi.fn(), getImportDataSources: vi.fn(), checkReportImport: vi.fn(), importReport: vi.fn() } }));
const onImported = vi.fn();
const onClose = vi.fn();
const templates = { page: 1, pageSize: 10, totalPages: 2, totalRecords: 11, data: [{ id: "global", title: "Vendas", updatedAt: "2026-10-20" }, { id: "other", title: "Compras", updatedAt: "2026-10-20" }] };
function show() { return render(<GlobalReportCatalog organizationId="target" onClose={onClose} onImported={onImported}/>); }
async function select() {
  fireEvent.click(await screen.findByRole("button", { name: "Selecionar modelo Vendas" }));
  await screen.findByRole("option", { name: "Base local" });
  await screen.findByRole("textbox", { name: "Buscar etiquetas" });
  fireEvent.change(screen.getByLabelText("Data source de destino"), { target: { value: "source" } });
}
async function verify() {
  fireEvent.click(screen.getByRole("button", { name: "Verificar compatibilidade" }));
  await screen.findByRole("button", { name: "Importar relatório" });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(creatorApi.listReportTags).mockResolvedValue({ ok: true, value: [] });
  vi.mocked(creatorApi.listGlobalTemplates).mockResolvedValue({ ok: true, value: templates });
  vi.mocked(creatorApi.getImportDataSources).mockResolvedValue({ ok: true, value: [{ id: "source", name: "Base local" }, { id: "second", name: "Outra base" }] });
  vi.mocked(creatorApi.checkReportImport).mockResolvedValue({ ok: true, value: { canImport: true, issues: [] } });
});

describe("GlobalReportCatalog steps", () => {
  it("shows reused local models and planned copies without granting access", async () => {
    vi.mocked(creatorApi.checkReportImport).mockResolvedValue({ ok: true, value: { canImport: true, issues: [], joinModels: [
      { name: "Cliente local", action: "reuse", modelId: "local" },
      { name: "Filial (2)", action: "create", modelId: null },
    ] } });
    show(); await select(); await verify();
    expect(screen.getByText(/Cliente local · Modelo local será reutilizado/)).toBeVisible();
    expect(screen.getByText(/Filial \(2\) · Será criada uma cópia independente/)).toBeVisible();
    expect(screen.getByText(/sem conceder permissões/)).toBeVisible();
    fireEvent.change(screen.getByLabelText("Data source de destino"), { target: { value: "second" } });
    expect(screen.queryByText(/Filial \(2\)/)).not.toBeInTheDocument();
  });
  it("blocks step two without a template and manages focus when navigating steps", async () => {
    show();
    expect(screen.getByRole("button", { name: "Configurar importação" })).toBeDisabled();
    expect(screen.queryByLabelText("Data source de destino")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Escolher relatório" })).toHaveAttribute("aria-current", "step");
    await select();
    expect(screen.getByRole("heading", { name: "Configurar importação" })).toHaveFocus();
    expect(screen.queryByRole("textbox", { name: "Buscar relatórios globais" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Configurar importação" })).toHaveAttribute("aria-current", "step");
    fireEvent.click(screen.getByRole("button", { name: "Escolher relatório" }));
    expect(screen.getByRole("heading", { name: "Escolher relatório" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Selecionar modelo Vendas" })).toHaveAttribute("aria-pressed", "true");
  });
  it("checks before importing with one primary action and fixed current organization", async () => {
    const report = { id: "copy" } as ReportDetail;
    vi.mocked(creatorApi.importReport).mockResolvedValue({ ok: true, value: report });
    show(); await select();
    expect(screen.getByLabelText("Título da cópia")).toHaveValue("Vendas");
    expect(screen.queryByRole("button", { name: "Importar relatório" })).not.toBeInTheDocument();
    await verify();
    expect(screen.queryByRole("button", { name: "Verificar compatibilidade" })).not.toBeInTheDocument();
    expect(creatorApi.checkReportImport).toHaveBeenCalledWith("global", { organizationId: "target", dataSourceId: "source", title: "Vendas", tagIds: [] });
    fireEvent.click(screen.getByRole("button", { name: "Importar relatório" }));
    await waitFor(() => expect(onImported).toHaveBeenCalledWith(report));
  });
  it("preserves search, page, title, destination, and compatibility when going back", async () => {
    show(); await screen.findByRole("button", { name: "Próxima" });
    fireEvent.change(screen.getByRole("textbox", { name: "Buscar relatórios globais" }), { target: { value: "Vendas" } });
    await waitFor(() => expect(creatorApi.listGlobalTemplates).toHaveBeenCalledWith(1, "Vendas"));
    fireEvent.click(await screen.findByRole("button", { name: "Próxima" }));
    await waitFor(() => expect(creatorApi.listGlobalTemplates).toHaveBeenCalledWith(2, "Vendas"));
    await select();
    fireEvent.change(screen.getByLabelText("Título da cópia"), { target: { value: "Vendas da filial" } });
    await verify();
    fireEvent.click(screen.getByRole("button", { name: "Trocar relatório" }));
    expect(screen.getByRole("textbox", { name: "Buscar relatórios globais" })).toHaveValue("Vendas");
    expect(screen.getByText("Página 2 de 2")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Configurar importação" }));
    expect(screen.getByLabelText("Título da cópia")).toHaveValue("Vendas da filial");
    expect(screen.getByLabelText("Data source de destino")).toHaveValue("source");
    await waitFor(() => expect(screen.getByRole("button", { name: "Importar relatório" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Trocar relatório" }));
    fireEvent.click(screen.getByRole("button", { name: "Selecionar modelo Vendas" }));
    expect(screen.getByLabelText("Título da cópia")).toHaveValue("Vendas da filial");
  });
  it("invalidates checks after changing destination or template", async () => {
    show(); await select(); await verify();
    fireEvent.change(screen.getByLabelText("Data source de destino"), { target: { value: "second" } });
    expect(screen.queryByRole("button", { name: "Importar relatório" })).not.toBeInTheDocument();
    await verify();
    fireEvent.click(screen.getByRole("button", { name: "Trocar relatório" }));
    fireEvent.click(screen.getByRole("button", { name: "Selecionar modelo Compras" }));
    expect(screen.getByLabelText("Título da cópia")).toHaveValue("Compras");
    expect(screen.queryByText(/Modelo compatível/)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Verificar compatibilidade" })).toBeEnabled());
  });
  it("shows incompatibilities beside the form without offering import", async () => {
    vi.mocked(creatorApi.checkReportImport).mockResolvedValue({ ok: true, value: { canImport: false, issues: [{ code: "field_incompatible", path: "dataset.select[0]", referenceId: "field", message: "The target field is incompatible." }] } });
    show(); await select(); fireEvent.click(screen.getByRole("button", { name: "Verificar compatibilidade" }));
    await screen.findByText("Campo ausente, ambíguo ou com tipo incompatível no destino.");
    expect(screen.queryByRole("button", { name: "Importar relatório" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verificar compatibilidade" })).toBeEnabled();
  });
  it("requires another check when the catalog changes before import", async () => {
    vi.mocked(creatorApi.importReport).mockResolvedValue({ ok: false, error: { type: "about:blank", instance: "", status: 409, title: "Conflict", code: "report_import.incompatible", detail: "Verifique a compatibilidade novamente." } });
    show(); await select(); await verify();
    fireEvent.click(screen.getByRole("button", { name: "Importar relatório" }));
    await screen.findByText(/Verifique a compatibilidade novamente/);
    expect(screen.getByRole("button", { name: "Verificar compatibilidade" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Importar relatório" })).not.toBeInTheDocument();
    expect(onImported).not.toHaveBeenCalled();
  });
  it("shows empty lists and permission errors without enabling configuration", async () => {
    vi.mocked(creatorApi.listGlobalTemplates).mockResolvedValue({ ok: true, value: { ...templates, data: [], totalPages: 0 } });
    vi.mocked(creatorApi.getImportDataSources).mockResolvedValue({ ok: false, error: { type: "about:blank", instance: "", status: 403, title: "Forbidden", code: "report_import.forbidden", detail: "Sem permissão para importar." } });
    show(); await screen.findByText("Nenhum modelo global disponível.");
    await screen.findByText(/É necessário acesso de creator/);
    expect(screen.getByRole("button", { name: "Configurar importação" })).toBeDisabled();
  });
  it("disables navigation and fields during requests and prevents duplicate submission", async () => {
    vi.mocked(creatorApi.checkReportImport).mockImplementation(() => new Promise(() => {}));
    show(); await select(); const button = screen.getByRole("button", { name: "Verificar compatibilidade" });
    fireEvent.click(button); fireEvent.click(button);
    expect(creatorApi.checkReportImport).toHaveBeenCalledTimes(1);
    for (const label of ["Trocar relatório", "Voltar", "Escolher relatório", "Configurar importação", "Verificando..."]) expect(screen.getByRole("button", { name: label })).toBeDisabled();
    expect(screen.getByLabelText("Data source de destino")).toBeDisabled();
    expect(screen.getByLabelText("Título da cópia")).toBeDisabled();
  });
  it("searches the entire catalog and resets pagination", async () => {
    show(); await screen.findByRole("button", { name: "Próxima" });
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    await waitFor(() => expect(creatorApi.listGlobalTemplates).toHaveBeenCalledWith(2, ""));
    await screen.findByRole("button", { name: "Selecionar modelo Vendas" });
    vi.mocked(creatorApi.listGlobalTemplates).mockResolvedValue({ ok: true, value: { ...templates, page: 1, totalPages: 0, totalRecords: 0, data: [] } });
    fireEvent.change(screen.getByRole("textbox", { name: "Buscar relatórios globais" }), { target: { value: "  Estoque  " } });
    await waitFor(() => expect(creatorApi.listGlobalTemplates).toHaveBeenCalledWith(1, "Estoque"));
    await screen.findByText("Nenhum modelo encontrado para esta busca.");
    expect(screen.getByRole("button", { name: "Configurar importação" })).toBeDisabled();
  });
});
