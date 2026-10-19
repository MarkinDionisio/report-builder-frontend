import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FilterEditorModal } from "./FilterEditorModal";

const fields = {
  "sale-date": { id: "sale-date", name: "Data da venda", type: "datetime", nullable: false, selectable: true, filterable: true, sortable: true, groupable: true, aggregatable: false, allowedOperators: ["eq", "between", "isnull"], allowedAggregations: [] },
  status: { id: "status", name: "Status", type: "string", nullable: false, selectable: true, filterable: true, sortable: true, groupable: true, aggregatable: false, allowedOperators: ["eq", "neq", "contains", "startsWith", "endsWith", "in", "isNull", "isNotNull"], allowedAggregations: [] },
  amount: { id: "amount", name: "Valor", type: "number", nullable: false, selectable: true, filterable: true, sortable: true, groupable: false, aggregatable: true, allowedOperators: ["eq", "gte", "between"], allowedAggregations: ["sum"] },
  hour: { id: "hour", name: "Horário", type: "time", nullable: false, selectable: true, filterable: true, sortable: true, groupable: true, aggregatable: false, allowedOperators: ["eq", "gte", "between"], allowedAggregations: [] },
};
const fieldOptions = Object.values(fields).map((field) => ({ label: field.name, fieldId: field.id, joinAlias: "", group: "Vendas" }));
const resolveField = (id: string) => fields[id as keyof typeof fields] || null;

describe("FilterEditorModal", () => {
  it("defaults text parameters to ignoring case and saves the configured option", () => {
    const onSave = vi.fn();
    render(<FilterEditorModal condition={{ fieldId: "status", operator: "eq", value: { parameter: "status" } }} fieldOptions={fieldOptions} parameters={[{ name: "status", type: "string", source: "input" }]} resolveField={resolveField} onClose={vi.fn()} onSave={onSave} />);
    const option = screen.getByRole("checkbox", { name: "Diferenciar maiúsculas/minúsculas" });
    expect(option).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Salvar filtro" }));
    expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ condition: expect.objectContaining({ caseSensitive: false }) }));
    fireEvent.click(option);
    fireEvent.click(screen.getByRole("button", { name: "Salvar filtro" }));
    expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ condition: expect.objectContaining({ caseSensitive: true }) }));
  });

  it("loads an optional parameter and lets the author make it required", () => {
    const onSave = vi.fn();
    render(<FilterEditorModal condition={{ fieldId: "status", operator: "eq", value: { parameter: "status" } }} fieldOptions={fieldOptions} parameters={[{ name: "status", type: "string", source: "input", required: false }]} resolveField={resolveField} onClose={vi.fn()} onSave={onSave} />);
    const required = screen.getByRole("checkbox", { name: "Obrigatório na execução" });
    expect(required).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Salvar filtro" }));
    expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ parameters: [expect.objectContaining({ required: false })] }));
    fireEvent.click(required);
    fireEvent.click(screen.getByRole("button", { name: "Salvar filtro" }));
    expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ parameters: [expect.objectContaining({ required: true })] }));
  });

  it("starts a new filter without a selected field and validates required data", () => {
    render(<FilterEditorModal fieldOptions={fieldOptions} parameters={[]} resolveField={resolveField} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Salvar filtro" })).toBeDisabled();
    expect(screen.getByText("Selecione o campo que deseja filtrar...")).toBeInTheDocument();
  });

  it("discards the draft when cancelled", () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    render(<FilterEditorModal condition={{ fieldId: "status", operator: "eq", value: "Ativo" }} fieldOptions={fieldOptions} parameters={[]} resolveField={resolveField} onClose={onClose} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText("Valor do filtro"), { target: { value: "Inativo" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("creates a business-friendly input parameter only on save", () => {
    const onSave = vi.fn();
    render(<FilterEditorModal condition={{ fieldId: "status", operator: "eq", value: "Ativo" }} fieldOptions={fieldOptions} parameters={[]} resolveField={resolveField} onClose={vi.fn()} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText("Como definir o valor? *"), { target: { value: "input" } });
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Salvar filtro" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ condition: expect.objectContaining({ value: { parameter: "input_1" } }), parameters: [expect.objectContaining({ name: "input_1", label: "Status" })] }));
  });

  it("shows value mode before condition and translates string operators", () => {
    render(<FilterEditorModal condition={{ fieldId: "status", operator: "startsWith", value: "A" }} fieldOptions={fieldOptions} parameters={[]} resolveField={resolveField} onClose={vi.fn()} onSave={vi.fn()} />);
    const mode = screen.getByLabelText("Como definir o valor? *");
    const operator = screen.getByLabelText("Condição *");
    expect(mode.compareDocumentPosition(operator) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("option", { name: "Começa com" })).toHaveValue("startsWith");
    expect(screen.getByRole("option", { name: "Termina com" })).toHaveValue("endsWith");
  });

  it("hides between for dates and keeps it for numbers and times", () => {
    const common = { fieldOptions, parameters: [], resolveField, onClose: vi.fn(), onSave: vi.fn() };
    const { rerender } = render(<FilterEditorModal {...common} condition={{ fieldId: "sale-date", operator: "eq", value: "2026-08-14" }} />);
    expect(screen.queryByRole("option", { name: "Está entre" })).not.toBeInTheDocument();
    rerender(<FilterEditorModal key="number" {...common} condition={{ fieldId: "amount", operator: "eq", value: "10" }} />);
    expect(screen.getByRole("option", { name: "Está entre" })).toHaveValue("between");
    rerender(<FilterEditorModal key="time" {...common} condition={{ fieldId: "hour", operator: "eq", value: "10:00:00" }} />);
    expect(screen.getByRole("option", { name: "Está entre" })).toHaveValue("between");
  });

  it("reconstructs and saves an automatic period", () => {
    const onSave = vi.fn();
    render(<FilterEditorModal condition={{ operator: "and", ui: { kind: "relativePeriod", preset: "currentMonth" }, conditions: [{ fieldId: "sale-date", operator: "gte", value: { parameter: "start" } }, { fieldId: "sale-date", operator: "lt", value: { parameter: "end" } }] }} fieldOptions={fieldOptions} parameters={[{ name: "start", type: "datetime", source: "system", variable: "startOfMonth" }, { name: "end", type: "datetime", source: "system", variable: "startOfNextMonth" }]} resolveField={resolveField} onClose={vi.fn()} onSave={onSave} />);
    expect(screen.getByLabelText("Como definir o valor? *")).toHaveValue("automatic");
    expect(screen.getByLabelText("Período")).toHaveValue("currentMonth");
    expect(screen.queryByLabelText("Condição *")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salvar filtro" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ condition: expect.objectContaining({ ui: expect.objectContaining({ kind: "relativePeriod", preset: "currentMonth", label: "Data da venda" }) }) }));
  });

  it("requires both values for between and accepts operators without value", () => {
    const { rerender } = render(<FilterEditorModal condition={{ fieldId: "amount", operator: "between", value: ["10", ""] }} fieldOptions={fieldOptions} parameters={[]} resolveField={resolveField} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Salvar filtro" })).toBeDisabled();
    rerender(<FilterEditorModal key="null" condition={{ fieldId: "status", operator: "isnull" }} fieldOptions={fieldOptions} parameters={[]} resolveField={resolveField} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Salvar filtro" })).toBeEnabled();
  });
});
