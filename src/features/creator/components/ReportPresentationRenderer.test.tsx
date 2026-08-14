import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ExecuteResponse } from "../types/creatorTypes";
import { ReportPresentationRenderer } from "./ReportPresentationRenderer";

const result: ExecuteResponse = {
  columns: [{ alias: "Total", type: "number", fieldId: "total", joinAlias: null }],
  rows: [{ Total: 1234.5 }], page: 1, pageSize: 50, rowCount: 1, durationMs: 12, resolvedParameters: {},
};
const props = { select: [{ fieldId: "total", alias: "Total", aggregation: "sum" }], page: 1, pageSize: 50, onPageChange: vi.fn(), onPageSizeChange: vi.fn() };

describe("ReportPresentationRenderer", () => {
  it("defaults to table for legacy reports", () => {
    const { container } = render(<ReportPresentationRenderer {...props} result={result} loading={false} />);
    expect(container.querySelector("table")).toBeInTheDocument();
  });

  it("renders a formatted metric with a custom label", () => {
    render(<ReportPresentationRenderer {...props} presentation={{ type: "metric", valueColumnAlias: "Total", label: "Vendas" }} result={result} loading={false} />);
    expect(screen.getByText("Vendas")).toBeInTheDocument();
    expect(screen.getByText("1.234,50")).toBeInTheDocument();
  });

  it("renders null, empty and multiple-row metric states safely", () => {
    const presentation = { type: "metric" as const, valueColumnAlias: "Total" };
    const { rerender } = render(<ReportPresentationRenderer {...props} presentation={presentation} result={{ ...result, rows: [{ Total: null }] }} loading={false} />);
    expect(screen.getByText("—")).toBeInTheDocument();
    rerender(<ReportPresentationRenderer {...props} presentation={presentation} result={{ ...result, rows: [] }} loading={false} />);
    expect(screen.getByText("—")).toBeInTheDocument();
    rerender(<ReportPresentationRenderer {...props} presentation={presentation} result={{ ...result, rows: [{ Total: 1 }, { Total: 2 }] }} loading={false} />);
    expect(screen.getByRole("alert")).toHaveTextContent("mais de uma linha");
  });
});
