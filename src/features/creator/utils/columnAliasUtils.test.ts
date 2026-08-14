import { describe, expect, it } from "vitest";
import { defaultAggregationAlias, fillMissingColumnAliases, nextAvailableAlias, validateColumnAliases } from "./columnAliasUtils";

describe("columnAliasUtils", () => {
  it.each([
    ["sum", "Total", "Total"],
    ["sum", "Total líquido", "Total líquido"],
    ["sum", "Valor", "Total de Valor"],
    ["avg", "Valor", "Média de Valor"],
    ["min", "Valor", "Mínimo de Valor"],
    ["max", "Valor", "Máximo de Valor"],
    ["count", "Venda", "Quantidade de Venda"],
    ["countDistinct", "Cliente", "Valores distintos de Cliente"],
    ["custom", "Valor", "Valor"],
  ])("creates the default %s alias", (aggregation, field, expected) => {
    expect(defaultAggregationAlias(aggregation, field)).toBe(expected);
  });

  it("fills missing aliases while preserving existing values", () => {
    const select = fillMissingColumnAliases([
      { fieldId: "a", alias: "Nome" },
      { fieldId: "b" },
      { fieldId: "c" },
      { target: "rows", aggregation: "count" },
    ], (item) => item.fieldId === "b" || item.fieldId === "c" ? "Nome" : "Outro");
    expect(select.map((item) => item.alias)).toEqual(["Nome", "Nome (2)", "Nome (3)", "Quantidade de Registros"]);
  });

  it("creates deterministic unique aliases", () => {
    expect(nextAvailableAlias("Total", ["total", "Total (2)"])).toBe("Total (3)");
  });

  it("rejects empty and duplicated aliases for any column", () => {
    const errors = validateColumnAliases([
      { fieldId: "a", aggregation: "sum", alias: "" },
      { fieldId: "b", aggregation: "avg", alias: "Resultado" },
      { fieldId: "c", aggregation: "max", alias: " resultado " },
      { fieldId: "d", alias: "" },
    ]);
    expect(errors.get(0)).toMatch(/Informe/);
    expect(errors.get(1)).toMatch(/diferente/);
    expect(errors.get(2)).toMatch(/diferente/);
    expect(errors.get(3)).toMatch(/Informe/);
  });
});
