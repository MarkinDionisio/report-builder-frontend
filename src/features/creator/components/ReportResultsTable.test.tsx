import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ExecuteResponse } from "../types/creatorTypes";
import { ReportResultsTable } from "./ReportResultsTable";

const result: ExecuteResponse = {
  columns: [
    { alias: "Total", type: "number", fieldId: "total", joinAlias: null },
    { alias: "Ativo", type: "boolean", fieldId: "active", joinAlias: null },
    { alias: "Data", type: "date", fieldId: "date", joinAlias: null },
    { alias: "Observação", type: "string", fieldId: "note", joinAlias: null },
  ],
  rows: [{ Total: 1234.5, Ativo: true, Data: "2026-08-14", Observação: null }],
  page: 1, pageSize: 50, rowCount: 1, durationMs: 18, resolvedParameters: {},
};

describe("ReportResultsTable", () => {
  it("formats values and identifies numeric columns", () => {
    render(<ReportResultsTable result={result} loading={false} page={1} pageSize={50} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />);
    expect(screen.getByText("1.234,50")).toBeInTheDocument();
    expect(screen.getByText("Sim")).toBeInTheDocument();
    expect(screen.getByText("14/08/2026")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Total" })).toHaveClass("report-results__numeric");
  });

  it("keeps count aggregations as integers", () => {
    render(<ReportResultsTable result={{ ...result, rows: [{ ...result.rows[0], Total: 1234 }] }} loading={false} page={1} pageSize={50} aggregationsByAlias={{ Total: "count" }} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />);
    expect(screen.getByText("1.234")).toBeInTheDocument();
    expect(screen.queryByText("1.234,00")).not.toBeInTheDocument();
  });

  it("shows loading, ready and empty states", () => {
    const props = { page: 1, pageSize: 50, onPageChange: vi.fn(), onPageSizeChange: vi.fn() };
    const { rerender } = render(<ReportResultsTable {...props} result={null} loading />);
    expect(screen.getByText("Executando relatório...")).toBeInTheDocument();
    rerender(<ReportResultsTable {...props} result={null} loading={false} />);
    expect(screen.getByText("Pronto para executar")).toBeInTheDocument();
    rerender(<ReportResultsTable {...props} result={{ ...result, rows: [], rowCount: 0 }} loading={false} />);
    expect(screen.getByText("Nenhum dado encontrado")).toBeInTheDocument();
  });

  it("controls page size and pagination boundaries", () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    const { rerender } = render(<ReportResultsTable result={{ ...result, rowCount: 50 }} loading={false} page={1} pageSize={50} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />);
    expect(screen.getByRole("button", { name: /Anterior/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Próxima/ }));
    expect(onPageChange).toHaveBeenCalledWith(2);
    fireEvent.change(screen.getByLabelText("Linhas por página"), { target: { value: "25" } });
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
    rerender(<ReportResultsTable result={result} loading={false} page={2} pageSize={50} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />);
    expect(screen.getByRole("button", { name: /Próxima/ })).toBeDisabled();
  });
});
