import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { creatorApi } from "../api/creatorApi";
import { ReportRunnerPage } from "./ReportRunnerPage";
import { exportApi } from "../../exports/api/exportApi";

vi.mock("../api/creatorApi", () => ({ creatorApi: { getReport: vi.fn(), executeReport: vi.fn() } }));
vi.mock("../../../shared/components/Navbar", () => ({ Navbar: () => null }));
vi.mock("../../exports/api/exportApi", () => ({ exportApi: { request: vi.fn() } }));

const result = { columns: [], rows: [], page: 1, pageSize: 50, rowCount: 0, durationMs: 1, resolvedParameters: {} };
function renderRunner() {
  return render(<MemoryRouter initialEntries={["/reports/report-1/run"]}><Routes><Route path="/reports/:reportId/run" element={<ReportRunnerPage />} /></Routes></MemoryRouter>);
}

beforeEach(() => vi.clearAllMocks());

it("exports the successful input parameters without sending locked resolved parameters", async () => {
  vi.mocked(creatorApi.getReport).mockResolvedValue({ ok: true, value: {
    id: "report-1", title: "Vendas", organizationId: "org", organizationName: "Organização", visibilityScope: "organization", myRole: "viewer", canExecute: true, canEdit: false, executionBlockCode: null, blockedSchemas: [], allowedFilters: [],
    content: { version: 1, parameters: [{ name: "store", type: "string", source: "input", required: false, label: "Filial" }], dataset: { schemaId: "schema", select: [] } },
  } });
  vi.mocked(creatorApi.executeReport).mockResolvedValue({ ok: true, value: { ...result, columns: [{ alias: "Total", type: "number", fieldId: null, joinAlias: null }], rows: [{ Total: 10 }], rowCount: 1, resolvedParameters: { store: "one", lockedInstant: "2026-10-23T12:00:00Z" } } });
  vi.mocked(exportApi.request).mockResolvedValue({ ok: true, value: { id: "job", status: "queued" } });
  renderRunner();
  fireEvent.change(await screen.findByLabelText("Filial"), { target: { value: "one" } });
  fireEvent.click(screen.getByRole("button", { name: "Executar relatório" }));
  fireEvent.click(await screen.findByRole("button", { name: "Exportar dados" }));
  fireEvent.click(screen.getByRole("button", { name: "CSV (.csv)" }));
  await waitFor(() => expect(exportApi.request).toHaveBeenCalledWith("report-1", "csv", { store: "one" }));
  fireEvent.change(screen.getByLabelText("Filial"), { target: { value: "two" } });
  expect(screen.queryByRole("button", { name: "Exportar dados" })).not.toBeInTheDocument();
});

it("discards a pending execution when its parameters change", async () => {
  vi.mocked(creatorApi.getReport).mockResolvedValue({ ok: true, value: {
    id: "report-1", title: "Vendas", organizationId: "org", organizationName: "Organização", visibilityScope: "organization", myRole: "viewer", canExecute: true, canEdit: false, executionBlockCode: null, blockedSchemas: [], allowedFilters: [],
    content: { version: 1, parameters: [{ name: "store", type: "string", source: "input", required: false, label: "Filial" }], dataset: { schemaId: "schema", select: [] } },
  } });
  let finish!: (value: Awaited<ReturnType<typeof creatorApi.executeReport>>) => void;
  vi.mocked(creatorApi.executeReport).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  renderRunner();
  fireEvent.change(await screen.findByLabelText("Filial"), { target: { value: "one" } });
  fireEvent.click(screen.getByRole("button", { name: "Executar relatório" }));
  fireEvent.change(screen.getByLabelText("Filial"), { target: { value: "two" } });
  finish({ ok: true, value: { ...result, rows: [{ Total: 10 }], rowCount: 1 } });
  await waitFor(() => expect(screen.getByRole("button", { name: "Executar relatório" })).toBeEnabled());
  expect(screen.queryByRole("button", { name: "Exportar dados" })).not.toBeInTheDocument();
  expect(screen.queryByText(/Executado às/)).not.toBeInTheDocument();
});
describe("ReportRunnerPage parameters", () => {
  it("shows optional inputs before execution and keeps them visible after execution", async () => {
    vi.mocked(creatorApi.getReport).mockResolvedValue({ ok: true, value: {
      id: "report-1", title: "Vendas", organizationId: "org", organizationName: "Organização", visibilityScope: "organization", myRole: "viewer", canExecute: true, canEdit: false, executionBlockCode: null, blockedSchemas: [], allowedFilters: [],
      content: { version: 1, parameters: [{ name: "store", type: "string", source: "input", required: false, label: "Filial" }], dataset: { schemaId: "schema", select: [] } },
    } });
    vi.mocked(creatorApi.executeReport).mockResolvedValue({ ok: true, value: result });
    renderRunner();
    expect(await screen.findByLabelText("Filial")).toBeVisible();
    expect(creatorApi.executeReport).not.toHaveBeenCalled();
    const execute = screen.getByRole("button", { name: "Executar relatório" });
    expect(execute).toBeEnabled();
    fireEvent.click(execute);
    await waitFor(() => expect(creatorApi.executeReport).toHaveBeenCalledWith("report-1", { parameters: {}, filters: [], page: 1, pageSize: 50 }));
    await screen.findByText(/Executado às/);
    expect(screen.getByLabelText("Filial")).toBeVisible();
  });
});

it("guides global template imports and hides execution", async () => {
  vi.mocked(creatorApi.getReport).mockResolvedValue({ ok: true, value: {
    id: "global", title: "Modelo", organizationId: "org", organizationName: "Origem", visibilityScope: "global", myRole: "viewer", canExecute: false, canEdit: false, executionBlockCode: "report_execution.global_template_requires_import", blockedSchemas: [], allowedFilters: [],
    content: { version: 1, dataset: { schemaId: "schema", select: [] } },
  } });
  renderRunner();
  await screen.findByText(/Este relatório é um modelo global/);
  expect(screen.queryByRole("button", { name: "Executar relatório" })).not.toBeInTheDocument();
  expect(creatorApi.executeReport).not.toHaveBeenCalled();
});
