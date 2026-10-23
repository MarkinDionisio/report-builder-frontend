import { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { CatalogTemplateSchemaPicker } from "./CatalogTemplateSchemaPicker";
import type { CatalogTemplateSchema } from "../types/catalogTemplateTypes";
const fields = Array.from({ length: 60 }, (_, index) => ({ id: `f${index}`, publicName: `Campo ${index + 1}`, internalFieldName: `field_${index}`, publicType: "string", isNullable: true, isSelectable: true, isFilterable: true, isSortable: true, isGroupable: true, isAggregatable: false, isSensitive: false, isEnabled: true, allowedOperators: ["eq"], allowedAggregations: [], compatible: index !== 59, reason: index === 59 ? "The field is missing from the target." : null, reasonCode: index === 59 ? "catalog_template.field_missing" : undefined }));
const schemas: CatalogTemplateSchema[] = [
  { id: "orders", publicName: "Pedidos", publicType: "object", internalSchemaName: "sales", internalObjectName: "orders", description: "Campos dos pedidos", isEnabled: true, compatible: true, reason: null, fields },
  { id: "customers", publicName: "Clientes", publicType: "object", internalSchemaName: "crm", internalObjectName: "customers", description: null, isEnabled: true, compatible: true, reason: null, fields: [{ ...fields[0], id: "name", publicName: "Nome", internalFieldName: "name" }] },
];
function Harness() {
  const [selected, setSelected] = useState(new Set(["name", "f0"]));
  return <><output aria-label="Total selecionado">{selected.size}</output><CatalogTemplateSchemaPicker schemas={schemas} selected={selected} onChange={setSelected} disabled={false} /></>;
}
afterEach(cleanup);
it("starts with collapsed table groups that identify the source of each field", () => {
  render(<Harness />);
  expect(screen.getByRole("region", { name: "Tabela Pedidos" })).toBeVisible();
  expect(screen.getByText("sales.orders")).toBeVisible();
  expect(screen.queryByRole("checkbox", { name: /Campo 1 / })).not.toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "Selecionar todos os campos compatíveis da tabela Pedidos" })).toBePartiallyChecked();
  fireEvent.click(screen.getByRole("button", { name: "Ver campos de Pedidos" }));
  expect(within(screen.getByRole("region", { name: "Tabela Pedidos" })).getByText("Campo 1", { exact: true })).toBeVisible();
});
it("paginates fields and preserves selection across pages and table collapse", () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Ver campos de Pedidos" }));
  expect(screen.getByText("Campos 1–25 de 60")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Próxima página de Pedidos" }));
  expect(screen.getByText("Campos 26–50 de 60")).toBeVisible();
  fireEvent.click(screen.getByRole("checkbox", { name: /Campo 26 / }));
  expect(screen.getByLabelText("Total selecionado")).toHaveTextContent("3");
  fireEvent.click(screen.getByRole("button", { name: "Recolher campos de Pedidos" }));
  fireEvent.click(screen.getByRole("button", { name: "Ver campos de Pedidos" }));
  expect(screen.getByRole("checkbox", { name: /Campo 26 / })).toBeChecked();
});
it("searches all fields beyond the current page and explains hidden selections", () => {
  render(<Harness />);
  fireEvent.change(screen.getByLabelText("Buscar tabela ou campo"), { target: { value: "field_40" } });
  expect(screen.getByRole("checkbox", { name: /Campo 41 / })).toBeVisible();
  expect(screen.queryByRole("region", { name: "Tabela Clientes" })).not.toBeInTheDocument();
  expect(screen.getByText(/2 campos selecionados estão fora do filtro/)).toBeVisible();
  expect(screen.getByLabelText("Total selecionado")).toHaveTextContent("2");
  fireEvent.change(screen.getByLabelText("Buscar tabela ou campo"), { target: { value: "crm.customers" } });
  expect(screen.getByRole("checkbox", { name: /Nome \(name\)/ })).toBeChecked();
});
it("selects all eligible fields of a table even while searching, without selecting incompatible fields or changing other tables", () => {
  render(<Harness />);
  fireEvent.change(screen.getByLabelText("Buscar tabela ou campo"), { target: { value: "field_40" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "Selecionar todos os campos compatíveis da tabela Pedidos" }));
  expect(screen.getByLabelText("Total selecionado")).toHaveTextContent("60");
  fireEvent.change(screen.getByLabelText("Buscar tabela ou campo"), { target: { value: "" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Mostrar campos" }), { target: { value: "incompatible" } });
  expect(screen.getByRole("checkbox", { name: /Campo 60 / })).toBeDisabled();
  expect(screen.getByRole("checkbox", { name: /Campo 60 / })).not.toBeChecked();
  expect(screen.getByText("Campo ausente no destino.")).toBeVisible();
});
it("shows an empty search without changing selection", () => {
  render(<Harness />);
  fireEvent.change(screen.getByLabelText("Buscar tabela ou campo"), { target: { value: "does-not-exist" } });
  expect(screen.getByText(/Nenhuma tabela ou campo encontrado/)).toBeVisible();
  expect(screen.getByLabelText("Total selecionado")).toHaveTextContent("2");
});

it("combines case sensitivity and exact expression using the same controls as other searches", () => {
  render(<Harness />);
  const search = screen.getByLabelText("Buscar tabela ou campo");
  const matchCase = screen.getByTitle("Diferenciar letras maiúsculas e minúsculas");
  const exactMatch = screen.getByTitle("Buscar expressão exata");
  expect(matchCase).toHaveAttribute("aria-pressed", "false");
  expect(exactMatch).toHaveAttribute("aria-pressed", "false");
  fireEvent.change(search, { target: { value: "campo" } });
  expect(screen.getByRole("region", { name: "Tabela Pedidos" })).toBeVisible();
  fireEvent.click(matchCase);
  expect(screen.queryByRole("region", { name: "Tabela Pedidos" })).not.toBeInTheDocument();
  fireEvent.change(search, { target: { value: "Campo" } });
  expect(screen.getByRole("region", { name: "Tabela Pedidos" })).toBeVisible();
  fireEvent.click(exactMatch);
  expect(screen.queryByRole("region", { name: "Tabela Pedidos" })).not.toBeInTheDocument();
  fireEvent.change(search, { target: { value: "Campo 1" } });
  expect(screen.getByRole("checkbox", { name: /Campo 1 \(field_0\)/ })).toBeVisible();
  expect(screen.queryByRole("checkbox", { name: /Campo 10 \(field_9\)/ })).not.toBeInTheDocument();
  fireEvent.change(search, { target: { value: "campo 1" } });
  expect(screen.queryByRole("region", { name: "Tabela Pedidos" })).not.toBeInTheDocument();
  fireEvent.click(matchCase);
  expect(screen.getByRole("checkbox", { name: /Campo 1 \(field_0\)/ })).toBeVisible();
  expect(screen.getByLabelText("Total selecionado")).toHaveTextContent("2");
});
it("matches an exact internal table name independently of its qualified name", () => {
  render(<Harness />);
  fireEvent.click(screen.getByTitle("Buscar expressão exata"));
  fireEvent.change(screen.getByLabelText("Buscar tabela ou campo"), { target: { value: "orders" } });
  expect(screen.getByRole("region", { name: "Tabela Pedidos" })).toBeVisible();
  expect(screen.queryByRole("region", { name: "Tabela Clientes" })).not.toBeInTheDocument();
  expect(screen.getByText("Campos 1–25 de 60")).toBeVisible();
});

it("marks compatible fields across all tables and pages, then clears the selection", () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Marcar todos" }));
  expect(screen.getByLabelText("Total selecionado")).toHaveTextContent("60");
  expect(screen.getByRole("button", { name: "Marcar todos" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Desmarcar todos" }));
  expect(screen.getByLabelText("Total selecionado")).toHaveTextContent("0");
  expect(screen.getByRole("button", { name: "Desmarcar todos" })).toBeDisabled();
});
it("limits bulk selection to filtered results and preserves selections outside the search", () => {
  render(<Harness />);
  fireEvent.change(screen.getByLabelText("Buscar tabela ou campo"), { target: { value: "field_40" } });
  expect(screen.getByText(/Ações nos resultados filtrados/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Marcar todos" }));
  expect(screen.getByLabelText("Total selecionado")).toHaveTextContent("3");
  expect(screen.getByRole("checkbox", { name: /Campo 41 / })).toBeChecked();
  fireEvent.click(screen.getByRole("button", { name: "Desmarcar todos" }));
  expect(screen.getByLabelText("Total selecionado")).toHaveTextContent("2");
  expect(screen.getByText(/2 campos selecionados estão fora do filtro/)).toBeVisible();
});
it("does not mark incompatible fields and disables bulk actions on empty results", () => {
  render(<Harness />);
  fireEvent.change(screen.getByRole("combobox", { name: "Mostrar campos" }), { target: { value: "incompatible" } });
  expect(screen.getByRole("button", { name: "Marcar todos" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Desmarcar todos" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Buscar tabela ou campo"), { target: { value: "nothing-matches" } });
  expect(screen.getByRole("button", { name: "Marcar todos" })).toBeDisabled();
  expect(screen.getByLabelText("Total selecionado")).toHaveTextContent("2");
});
