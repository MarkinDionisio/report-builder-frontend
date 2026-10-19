import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { creatorApi } from "../api/creatorApi";
import { ReportRunnerPage } from "./ReportRunnerPage";

vi.mock("../api/creatorApi", () => ({ creatorApi: { getReport: vi.fn(), executeReport: vi.fn() } }));
vi.mock("../../../shared/components/Navbar", () => ({ Navbar: () => null }));

const result = { columns: [], rows: [], page: 1, pageSize: 50, rowCount: 0, durationMs: 1, resolvedParameters: {} };
function renderRunner() {
  return render(<MemoryRouter initialEntries={["/reports/report-1/run"]}><Routes><Route path="/reports/:reportId/run" element={<ReportRunnerPage />} /></Routes></MemoryRouter>);
}

beforeEach(() => vi.clearAllMocks());
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
