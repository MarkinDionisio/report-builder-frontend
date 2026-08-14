import { describe, expect, it } from "vitest";
import { collectParameterReferences, createInputParameter, createRelativePeriod, removeEmptyLogicalGroups, removeOrphanParameters } from "./filterParameterUtils";

describe("filter parameter helpers", () => {
  it("creates a business-friendly input parameter", () => {
    const parameter = createInputParameter([], "uuid", "Filial");
    expect(parameter).toMatchObject({ name: "input_1", type: "uuid", source: "input", label: "Filial", placeholder: "Filial" });
  });

  it("creates a closed-open period for today", () => {
    const generated = createRelativePeriod("sale-date", undefined, "today", []);
    expect(generated.condition).toMatchObject({ operator: "and", ui: { kind: "relativePeriod", preset: "today" } });
    expect(generated.condition.conditions?.map((condition) => condition.operator)).toEqual(["gte", "lt"]);
    expect(generated.parameters.map((parameter) => parameter.variable)).toEqual(["startOfToday", "startOfTomorrow"]);
  });

  it("keeps reused parameters and removes orphan candidates", () => {
    const parameters = [
      { name: "input_1", type: "string" as const, source: "input" as const },
      { name: "unused", type: "string" as const, source: "input" as const },
    ];
    const where = { operator: "eq", fieldId: "field", value: { parameter: "input_1" } };
    expect(collectParameterReferences(where)).toEqual(new Set(["input_1"]));
    expect(removeOrphanParameters(parameters, where, new Set(["input_1", "unused"]))).toEqual([parameters[0]]);
  });

  it("omits an empty root logical filter", () => {
    expect(removeEmptyLogicalGroups({ operator: "and", conditions: [] })).toBeUndefined();
  });

  it("removes empty nested groups and preserves valid conditions", () => {
    const condition = { operator: "eq", fieldId: "field", value: "active" };
    expect(removeEmptyLogicalGroups({
      operator: "and",
      conditions: [{ operator: "or", conditions: [] }, condition],
    })).toEqual({ operator: "and", conditions: [condition] });
  });
});
