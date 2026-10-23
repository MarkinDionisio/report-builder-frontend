import { describe, expect, it } from "vitest";
import { renameParameterReferences, collectParameterReferences, createInputParameter, createRelativePeriod, removeEmptyLogicalGroups, removeOrphanParameters } from "./filterParameterUtils";

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


it("renames shared references recursively and simultaneously without mutating literals", () => {
  const condition = { operator: "and", conditions: [{ fieldId: "a", operator: "eq", value: { parameter: "a" } }, { operator: "or", conditions: [{ fieldId: "b", operator: "eq", value: { parameter: "a" } }, { fieldId: "c", operator: "eq", value: { parameter: "b" } }, { fieldId: "d", operator: "eq", value: "a" }] }] };
  const result = renameParameterReferences(condition, { a: "b", b: "a" });
  expect(result.conditions?.[0]?.value).toEqual({ parameter: "b" });
  expect(result.conditions?.[1]?.conditions?.map((item) => item.value)).toEqual([{ parameter: "b" }, { parameter: "a" }, "a"]);
  expect(condition.conditions[0]?.value).toEqual({ parameter: "a" });
});

it("creates a rolling 12-calendar-month period including the current month", () => {
  const generated = createRelativePeriod("sale-date", "sales", "last12Months", [], "Emissão");
  expect(generated.parameters.map(parameter => parameter.variable)).toEqual(["startOfLast12Months", "startOfNextMonth"]);
  expect(generated.condition).toMatchObject({ ui: { preset: "last12Months", label: "Emissão" }, conditions: [
    { fieldId: "sale-date", joinAlias: "sales", operator: "gte", value: { parameter: generated.parameters[0].name } },
    { fieldId: "sale-date", joinAlias: "sales", operator: "lt", value: { parameter: generated.parameters[1].name } },
  ] });
});
