import { describe, expect, it } from "vitest";
import { formatReportNumber, isReportNumericType } from "./reportValueUtils";

describe("reportValueUtils", () => {
  it.each([
    [1234.5, "number", undefined, "1.234,50"],
    [1234, "number", undefined, "1.234,00"],
    [1234, "integer", undefined, "1.234"],
    [1234, "number", "count", "1.234"],
    [1234, "number", "countDistinct", "1.234"],
  ])("formats %s as %s", (value, type, aggregation, expected) => {
    expect(formatReportNumber(value, type, aggregation)).toBe(expected);
  });

  it("preserves invalid numeric values", () => {
    expect(formatReportNumber("indisponível", "number")).toBe("indisponível");
  });

  it("recognizes public and database numeric types", () => {
    expect(isReportNumericType("number")).toBe(true);
    expect(isReportNumericType("decimal(18,2)")).toBe(true);
    expect(isReportNumericType("string")).toBe(false);
  });
});
