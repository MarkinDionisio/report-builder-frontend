import { describe, expect, it } from "vitest";
import { requiredParametersMissing, validateParameters } from "./parameterUtils";
import type { ReportParameterDefinition } from "../types/creatorTypes";

describe("report parameter validation", () => {
  it("allows empty optional inputs while still requiring mandatory inputs", () => {
    const optional: ReportParameterDefinition = { name: "store", type: "uuid", source: "input", required: false };
    expect(requiredParametersMissing([optional], {})).toBe(false);
    expect(requiredParametersMissing([optional], { store: "" })).toBe(false);
    const required: ReportParameterDefinition = { name: "active", type: "boolean", source: "input", required: true };
    expect(requiredParametersMissing([optional, required], {})).toBe(true);
    expect(requiredParametersMissing([optional, required], { active: false })).toBe(false);
  });

  it("accepts compatible automatic and input parameters", () => {
    expect(validateParameters([
      { name: "start", type: "datetime", source: "system", variable: "startOfToday" },
      { name: "storeId", type: "uuid", source: "input" },
    ])).toEqual([]);
  });

  it("rejects duplicate names and incompatible variables", () => {
    const errors = validateParameters([
      { name: "period", type: "date", source: "system", variable: "startOfToday" },
      { name: "period", type: "string", source: "input" },
    ]);
    expect(errors).toHaveLength(2);
  });

  it("requires only input parameters", () => {
    const definitions: ReportParameterDefinition[] = [
      { name: "date", type: "date", source: "input" as const },
      { name: "start", type: "datetime", source: "system" as const, variable: "startOfToday" as const },
    ];
    expect(requiredParametersMissing(definitions, {})).toBe(true);
    expect(requiredParametersMissing(definitions, { date: "2026-08-14" })).toBe(false);
  });
});
