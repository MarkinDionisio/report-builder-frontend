import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FilterRow } from "./FilterRow";

const baseProps = {
  index: 0,
  fieldName: "Data da venda com uma descrição extensa",
  fieldType: "datetime",
  parameters: [],
  onEdit: vi.fn(),
  onRemove: vi.fn(),
  onDuplicate: vi.fn(),
  onDragStart: vi.fn(),
  onDragOver: vi.fn(),
  onDrop: vi.fn(),
  isDragOver: false,
  dragPosition: null,
};

describe("FilterRow summary", () => {
  it("shows a business summary for a fixed value", () => {
    render(<FilterRow {...baseProps} condition={{ fieldId: "sale-date", operator: "eq", value: "2026-08-14T12:00:00.000Z" }} />);
    expect(screen.getByText(baseProps.fieldName)).toBeInTheDocument();
    expect(screen.getByText("É exatamente")).toBeInTheDocument();
    expect(screen.getByText("Valor fixo")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("never exposes the technical parameter name", () => {
    render(<FilterRow {...baseProps} parameters={[{ name: "input_1", type: "datetime", source: "input", label: "Data inicial" }]} condition={{ fieldId: "sale-date", operator: "gte", value: { parameter: "input_1" } }} />);
    expect(screen.getByText("Data inicial")).toBeInTheDocument();
    expect(screen.getByText("Perguntar ao executar")).toBeInTheDocument();
    expect(screen.queryByText("input_1")).not.toBeInTheDocument();
  });

  it("summarizes an automatic period in one phrase", () => {
    render(<FilterRow {...baseProps} condition={{ operator: "and", ui: { kind: "relativePeriod", preset: "currentMonth" }, conditions: [{ fieldId: "sale-date", operator: "gte", value: { parameter: "start" } }] }} />);
    expect(screen.getByText("Período")).toBeInTheDocument();
    expect(screen.getByText("Mês atual")).toBeInTheDocument();
    expect(screen.getByText("Automático")).toBeInTheDocument();
  });

  it("uses the custom automatic period label", () => {
    render(<FilterRow {...baseProps} condition={{ operator: "and", ui: { kind: "relativePeriod", preset: "currentMonth", label: "Competência das vendas" }, conditions: [{ fieldId: "sale-date", operator: "gte", value: { parameter: "start" } }] }} />);
    expect(screen.getByText("Competência das vendas")).toBeInTheDocument();
  });

  it("uses the same business vocabulary as the editor", () => {
    render(<FilterRow {...baseProps} fieldType="string" condition={{ fieldId: "name", operator: "startsWith", value: "Maria" }} />);
    expect(screen.getByText("Começa com")).toBeInTheDocument();
  });

  it("opens editing and confirms removal through summary actions", () => {
    const onEdit = vi.fn();
    const onRemove = vi.fn();
    render(<FilterRow {...baseProps} onEdit={onEdit} onRemove={onRemove} condition={{ fieldId: "sale-date", operator: "eq", value: "x" }} />);
    fireEvent.click(screen.getByRole("button", { name: `Editar filtro ${baseProps.fieldName}` }));
    expect(onEdit).toHaveBeenCalledWith(0);
    fireEvent.click(screen.getByRole("button", { name: `Remover filtro ${baseProps.fieldName}` }));
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(onRemove).toHaveBeenCalledWith(0);
  });
});
