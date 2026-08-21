import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrderBySummaryRow } from "./OrderBySummaryRow";

const props = {
  index: 0,
  orderBy: { fieldId: "name", direction: "asc" as const },
  options: [{ label: "Nome (Clientes)", fieldId: "name", joinAlias: "", group: "Clientes" }],
  onEdit: vi.fn(), onRemove: vi.fn(), onDragStart: vi.fn(), onDragOver: vi.fn(), onDrop: vi.fn(), isDragOver: false, dragPosition: null,
};

describe("OrderBySummaryRow", () => {
  it("shows a read-only business summary and opens editing", () => {
    const onEdit = vi.fn();
    render(<OrderBySummaryRow {...props} onEdit={onEdit}/>);
    expect(screen.getByText("Nome (Clientes)")).toBeInTheDocument();
    expect(screen.getByText("crescente")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Editar ordenação/ }));
    expect(onEdit).toHaveBeenCalledWith(0);
  });

  it("confirms removal", () => {
    const onRemove = vi.fn();
    render(<OrderBySummaryRow {...props} onRemove={onRemove}/>);
    fireEvent.click(screen.getByRole("button", { name: /Remover ordenação/ }));
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(onRemove).toHaveBeenCalledWith(0);
  });
});
