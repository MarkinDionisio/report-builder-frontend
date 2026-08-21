import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExecutionParameterForm } from "./ExecutionParameterForm";

describe("ExecutionParameterForm", () => {
  it("shows business metadata instead of the technical name", () => {
    render(<ExecutionParameterForm parameters={[{ name: "input_1", type: "uuid", source: "input", label: "Filial", description: "Escolha a filial da venda.", placeholder: "Código da filial" }]} values={{}} onChange={vi.fn()} />);
    expect(screen.getByText("Filial *")).toBeInTheDocument();
    expect(screen.getByText("Escolha a filial da venda.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Código da filial")).toBeInTheDocument();
    expect(screen.queryByText("input_1")).not.toBeInTheDocument();
  });

  it("hides an automatic override until requested", () => {
    render(<ExecutionParameterForm parameters={[{ name: "start", type: "datetime", source: "system", variable: "startOfToday", allowOverride: true, label: "Início" }]} values={{}} onChange={vi.fn()} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByLabelText(/Início/)).toBeInTheDocument();
  });

  it("shows a resolved automatic period as one business interval", () => {
    render(<ExecutionParameterForm
      parameters={[{ name: "start", type: "datetime", source: "system", variable: "startOfToday" }, { name: "end", type: "datetime", source: "system", variable: "startOfTomorrow" }]}
      where={{ operator: "and", conditions: [{ operator: "and", ui: { kind: "relativePeriod", preset: "today", label: "Período de vendas" }, conditions: [{ fieldId: "sale-date", operator: "gte", value: { parameter: "start" } }, { fieldId: "sale-date", operator: "lt", value: { parameter: "end" } }] }] }}
      resolvedParameters={{ start: "2026-08-14T03:00:00.000Z", end: "2026-08-15T03:00:00.000Z" }} values={{}} onChange={vi.fn()} />);
    expect(screen.getByText("Período de vendas")).toBeInTheDocument();
    expect(screen.getByText("14/08/2026")).toBeInTheDocument();
    expect(screen.queryByText(/fim não incluído/)).not.toBeInTheDocument();
    expect(screen.queryByText("start")).not.toBeInTheDocument();
  });

  it("shows a full-year period without technical midnight boundaries", () => {
    render(<ExecutionParameterForm
      parameters={[{ name: "start", type: "datetime", source: "system", variable: "startOfYear" }, { name: "end", type: "datetime", source: "system", variable: "startOfNextYear" }]}
      where={{ operator: "and", ui: { kind: "relativePeriod", preset: "currentYear", label: "Ano de referência" }, conditions: [{ fieldId: "sale-date", operator: "gte", value: { parameter: "start" } }, { fieldId: "sale-date", operator: "lt", value: { parameter: "end" } }] }}
      resolvedParameters={{ start: "2026-01-01T03:00:00.000Z", end: "2027-01-01T03:00:00.000Z" }} values={{}} onChange={vi.fn()} />);
    expect(screen.getByText("De 01/01/2026 a 31/12/2026")).toBeInTheDocument();
    expect(screen.queryByText(/00:00/)).not.toBeInTheDocument();
  });

  it("shows the automatic-time-zone message before execution", () => {
    render(<ExecutionParameterForm parameters={[]} where={{ operator: "and", ui: { kind: "relativePeriod", preset: "today", label: "Vendas de hoje" }, conditions: [] }} values={{}} onChange={vi.fn()} />);
    expect(screen.getByText("O período será calculado automaticamente no fuso da organização.")).toBeInTheDocument();
  });
});
