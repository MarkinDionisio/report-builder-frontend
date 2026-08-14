import { describe, expect, it } from "vitest";
import { fieldKindFromType, operatorLabel, visibleOperators } from "./filterOperatorUtils";

describe("filter operator vocabulary", () => {
  it.each([
    ["string", "contains", "Contém"], ["string", "startsWith", "Começa com"], ["string", "endsWith", "Termina com"],
    ["number", "gte", "Maior ou igual a"], ["boolean", "neq", "É diferente de"], ["uuid", "in", "É um dos valores"],
    ["time", "lte", "Até"], ["datetime", "gt", "Depois de"],
  ] as const)("labels %s/%s as %s", (kind, operator, label) => expect(operatorLabel(operator, kind)).toBe(label));

  it("humanizes an unknown camelCase operator", () => expect(operatorLabel("customOperator", "string")).toBe("Custom operator"));

  it("removes between only from date and datetime", () => {
    expect(visibleOperators(["eq", "between"], "date")).toEqual(["eq"]);
    expect(visibleOperators(["eq", "between"], "datetime")).toEqual(["eq"]);
    expect(visibleOperators(["eq", "between"], "number")).toContain("between");
    expect(visibleOperators(["eq", "between"], "time")).toContain("between");
  });

  it("recognizes public field types", () => {
    expect(fieldKindFromType("uuid")).toBe("uuid");
    expect(fieldKindFromType("timestamp without time zone")).toBe("datetime");
    expect(fieldKindFromType("integer")).toBe("number");
  });
});
