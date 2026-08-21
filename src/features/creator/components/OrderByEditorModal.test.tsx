import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrderByEditorModal } from "./OrderByEditorModal";

const options = [
  { label: "Nome (Clientes)", fieldId: "name", joinAlias: "", group: "Clientes" },
  { label: "Total (Pedidos)", fieldId: "total", joinAlias: "orders", aggregation: "sum", group: "Pedidos" },
  { label: "Mês: Data (Pedidos)", fieldId: "date", joinAlias: "orders", dateGranularity: "month" as const, group: "Pedidos" },
];

describe("OrderByEditorModal", () => {
  it("requires a field and saves field plus direction", () => {
    const onSave = vi.fn();
    render(<OrderByEditorModal options={options} onClose={vi.fn()} onSave={onSave}/>);
    expect(screen.getByRole("button", { name: "Salvar ordenação" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Selecione o campo para ordenar/ }));
    fireEvent.click(screen.getByText("Total"));
    fireEvent.change(screen.getByLabelText("Direção *"), { target: { value: "desc" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar ordenação" }));
    expect(onSave).toHaveBeenCalledWith({ fieldId: "total", joinAlias: "orders", aggregation: "sum", direction: "desc" });
  });

  it("preserves temporal granularity in the saved order", () => {
    const onSave = vi.fn();
    render(<OrderByEditorModal options={options} onClose={vi.fn()} onSave={onSave}/>);
    fireEvent.click(screen.getByRole("button", { name: /Selecione o campo para ordenar/ }));
    fireEvent.click(screen.getByText("Mês: Data"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar ordenação" }));
    expect(onSave).toHaveBeenCalledWith({ fieldId: "date", joinAlias: "orders", dateGranularity: "month", direction: "asc" });
  });

});
