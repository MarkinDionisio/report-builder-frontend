import { describe, expect, it } from "vitest";
import type { ReportContentV1 } from "../types/creatorTypes";
import { canUseMetric, validateReportPresentation } from "./reportPresentationUtils";

const content = (select: ReportContentV1["dataset"]["select"], groupBy: ReportContentV1["dataset"]["groupBy"] = []): ReportContentV1 => ({ version: 1, dataset: { schemaId: "schema", select, groupBy } });

describe("reportPresentationUtils", () => {
  it("keeps reports without presentation compatible as tables", () => expect(validateReportPresentation(content([{ fieldId: "name", alias: "Nome" }]))).toBeNull());
  it("accepts an aggregated ungrouped metric", () => expect(validateReportPresentation(content([{ fieldId: "total", alias: "Total", aggregation: "sum" }]), { type: "metric", valueColumnAlias: "Total" })).toBeNull());
  it("rejects common columns, grouping and missing aliases", () => {
    expect(canUseMetric([{ fieldId: "name", alias: "Nome" }])).toBe(false);
    expect(canUseMetric([{ fieldId: "total", alias: "Total", aggregation: "sum" }], [{ fieldId: "group" }])).toBe(false);
    expect(validateReportPresentation(content([{ fieldId: "total", alias: "Total", aggregation: "sum" }]), { type: "metric", valueColumnAlias: "Missing" })).toMatch(/coluna agregada válida/);
  });
  it("explains metric requirements without technical grouping language", () => {
    expect(validateReportPresentation(content([{ fieldId: "name", alias: "Nome" }]), { type: "metric", valueColumnAlias: "Nome" }))
      .toBe("Para usar um indicador, deixe apenas uma coluna com cálculo, como soma, média ou contagem. Remova as demais colunas selecionadas.");
  });
});
