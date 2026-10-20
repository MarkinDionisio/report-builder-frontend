import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DatePickerInput } from "./DatePickerInput";

describe("DatePickerInput", () => {
  afterEach(() => vi.useRealTimers());
  it("shows an existing date in Brazilian format and clears it", () => {
    const onChange = vi.fn();
    render(<DatePickerInput type="date" value="2026-08-14" ariaLabel="Data da venda" onChange={onChange} />);
    expect(screen.getByText("14/08/2026")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar Data da venda" }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("opens the selected month in a localized calendar even when today is in another month", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 12));
    const onChange = vi.fn();
    render(<DatePickerInput type="date" value="2026-08-14" ariaLabel="Data da venda" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Data da venda" }));
    expect(screen.getByRole("dialog", { name: "Data da venda" })).toBeInTheDocument();
    expect(screen.getAllByText("agosto").length).toBeGreaterThan(0);
    fireEvent.click(within(screen.getByRole("dialog", { name: "Data da venda" })).getByRole("button", { name: /\b15\b/ }));
    expect(onChange).toHaveBeenCalledWith("2026-08-15");
    expect(screen.queryByRole("dialog", { name: "Data da venda" })).not.toBeInTheDocument();
  });

  it("updates the time while preserving the selected local date", () => {
    const onChange = vi.fn();
    const value = new Date(2026, 7, 14, 9, 30).toISOString();
    render(<DatePickerInput type="datetime" value={value} ariaLabel="Data e hora" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Data e hora" }));
    fireEvent.change(screen.getByLabelText("Horário"), { target: { value: "15:45" } });
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 7, 14, 15, 45).toISOString());
  });
});
