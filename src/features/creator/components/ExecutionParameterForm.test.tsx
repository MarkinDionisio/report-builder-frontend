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
});
