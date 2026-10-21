import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DataSourceActions } from "./DataSourceActions";
const actions = { onIntrospect: vi.fn(), onEdit: vi.fn(), onBootstrap: vi.fn(), onSaveTemplate: vi.fn(), onApplyTemplate: vi.fn(), onDelete: vi.fn() };
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
function show(isEnabled = true) { render(<DataSourceActions name="ERP" isEnabled={isEnabled} {...actions} />); }
it("keeps uncommon actions hidden until the menu opens and closes on selection", () => {
  show();
  expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
  expect(screen.getAllByRole("button")).toHaveLength(3);
  fireEvent.click(screen.getByRole("button", { name: "Mais ações de ERP" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Salvar catálogo como template" }));
  expect(actions.onSaveTemplate).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});
it("supports arrow keys, escape, and outside clicks", () => {
  show();
  const trigger = screen.getByRole("button", { name: "Mais ações de ERP" });
  fireEvent.click(trigger);
  expect(screen.getByRole("menuitem", { name: "Aplicar template" })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });
  expect(screen.getByRole("menuitem", { name: "Salvar catálogo como template" })).toHaveFocus();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(trigger).toHaveFocus();
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  fireEvent.click(trigger);
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});
it("disables applying templates on a disabled source", () => {
  show(false);
  fireEvent.click(screen.getByRole("button", { name: "Mais ações de ERP" }));
  expect(screen.getByRole("menuitem", { name: "Aplicar template" })).toBeDisabled();
  expect(screen.getByRole("menuitem", { name: "Salvar catálogo como template" })).toHaveFocus();
});
