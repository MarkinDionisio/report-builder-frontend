import { describe, expect, it } from "vitest";
import type { ReportContentV1 } from "../types/creatorTypes";
import { canUseMetric, synchronizeGroupedTableOrderBy, validateReportPresentation } from "./reportPresentationUtils";

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

describe("grouped table presentation", () => {
  it("validates a non-aggregated selected alias", () => {
    const report = content([{ fieldId: "soldAt", alias: "Dia", dateGranularity: "day" }, { fieldId: "total", alias: "Total" }]);
    expect(validateReportPresentation(report, { type: "groupedTable", groupColumnAlias: "Dia", direction: "desc" })).toBeNull();
    expect(validateReportPresentation(report, { type: "groupedTable", groupColumnAlias: "Ausente", direction: "asc" })).toMatch(/coluna de detalhes válida/);
  });

  it("places the group reference first and preserves secondary ordering", () => {
    const report: ReportContentV1 = {
      ...content([{ fieldId: "soldAt", joinAlias: "sales", alias: "Dia", dateGranularity: "day" }, { fieldId: "name", alias: "Produto" }]),
      presentation: { type: "groupedTable", groupColumnAlias: "Dia", direction: "desc" },
    };
    report.dataset.orderBy = [
      { fieldId: "name", direction: "asc" },
      { fieldId: "soldAt", joinAlias: "sales", dateGranularity: "day", direction: "asc" },
    ];
    expect(synchronizeGroupedTableOrderBy(report).dataset.orderBy).toEqual([
      { fieldId: "soldAt", joinAlias: "sales", dateGranularity: "day", direction: "desc" },
      { fieldId: "name", direction: "asc" },
    ]);
  });
});
