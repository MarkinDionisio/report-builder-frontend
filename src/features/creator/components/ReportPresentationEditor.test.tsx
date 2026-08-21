import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReportPresentationEditor } from "./ReportPresentationEditor";

describe("ReportPresentationEditor", () => {
  it("defaults legacy reports to table and disables incompatible metrics", () => {
    render(<ReportPresentationEditor select={[{ fieldId: "name", alias: "Nome" }]} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Tipo de apresentação")).toHaveValue("table");
    expect(screen.getByRole("option", { name: "Indicador" })).toBeDisabled();
    expect(screen.getByRole("note")).toHaveTextContent("Para usar um indicador");
  });

  it("creates and edits a metric presentation", () => {
    const onChange = vi.fn();
    const select = [{ fieldId: "total", alias: "Total", aggregation: "sum" }];
    const { rerender } = render(<ReportPresentationEditor select={select} onChange={onChange} />);
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tipo de apresentação"), { target: { value: "metric" } });
    expect(onChange).toHaveBeenCalledWith({ type: "metric", valueColumnAlias: "Total", label: "Total" });
    rerender(<ReportPresentationEditor select={select} presentation={{ type: "metric", valueColumnAlias: "Total", label: "Total" }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Label do indicador"), { target: { value: "Receita" } });
    expect(onChange).toHaveBeenLastCalledWith({ type: "metric", valueColumnAlias: "Total", label: "Receita" });
  });

  it("configures a grouped table with column and direction", () => {
    const onChange = vi.fn();
    const select = [{ fieldId: "date", alias: "Data" }, { fieldId: "total", alias: "Total", aggregation: "sum" }];
    const { rerender } = render(<ReportPresentationEditor select={select} groupedTableOptions={[select[0]]} onChange={onChange}/>);
    fireEvent.change(screen.getByLabelText("Tipo de apresentação"), { target: { value: "groupedTable" } });
    expect(onChange).toHaveBeenCalledWith({ type: "groupedTable", groupColumnAlias: "Data", direction: "asc" });
    rerender(<ReportPresentationEditor select={select} groupedTableOptions={[select[0]]} presentation={{ type: "groupedTable", groupColumnAlias: "Data", direction: "asc" }} onChange={onChange}/>);
    fireEvent.change(screen.getByLabelText("Direção do agrupamento"), { target: { value: "desc" } });
    expect(onChange).toHaveBeenLastCalledWith({ type: "groupedTable", groupColumnAlias: "Data", direction: "desc" });
  });
});
