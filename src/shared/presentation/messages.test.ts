import { describe, expect, it } from "vitest";
import { diagnosticMessage, problemMessage, validationFieldLabel } from "./messages";

describe("Portuguese presentation boundaries", () => {
  it("explains when exporting a global report requires import", () => {
    expect(problemMessage({ code: "export.global_template", status: 403 })).toBe("Importe este modelo global para sua organização antes de exportar.");
  });
  it("translates known codes without mutating the English technical response", () => {
    const problem = { code: "export.queue_limit", detail: "The pending export limit has been reached.", status: 429 };
    expect(problemMessage(problem)).toBe("O limite de exportações pendentes foi atingido. Tente novamente em instantes.");
    expect(problem.detail).toBe("The pending export limit has been reached.");
  });
  it("uses contextual Portuguese fallbacks for unknown codes and legacy code-less responses", () => {
    for (const code of [undefined, "new.unknown_code", "toString", "__proto__"]) {
      expect(problemMessage({ code, title: "Technical error", detail: "Database driver failure" }, "Não foi possível salvar.")).toBe("Não foi possível salvar.");
      expect(diagnosticMessage(code, "Revise os campos.")).toBe("Revise os campos.");
    }
  });
  it("localizes known warnings and compatibility reasons", () => {
    expect(diagnosticMessage("report_execution.order_by_ignored")).toContain("ordenação");
    expect(diagnosticMessage("catalog_template.field_missing")).toBe("Campo ausente no destino.");
  });
  it("localizes validation field labels without echoing technical paths", () => {
    expect(validationFieldLabel("request.Name")).toBe("Nome");
    expect(validationFieldLabel("dataset.internalUnknown[0]")).toBe("Campo informado");
  });
});
