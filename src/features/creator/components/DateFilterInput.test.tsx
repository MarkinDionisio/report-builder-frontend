import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DateFilterInput } from "./DateFilterInput";

describe("DateFilterInput", () => {
  it("keeps both values independent for a date range", () => {
    const onChange = vi.fn();
    render(<DateFilterInput operator="between" fieldType="date" value={["2026-08-01", "2026-08-31"]} onChange={onChange} onOperatorChange={vi.fn()} />);
    expect(screen.getByText("01/08/2026")).toBeInTheDocument();
    expect(screen.getByText("31/08/2026")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar Data inicial" }));
    expect(onChange).toHaveBeenCalledWith(["", "2026-08-31"]);
  });
});
