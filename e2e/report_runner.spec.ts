import { expect, test, type Page } from "@playwright/test";

async function mockSession(page: Page) {
  await page.route("**/api/v1/auth/refresh", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accessToken: "token", refreshToken: "refresh", tokenType: "Bearer", expiresAt: new Date(Date.now() + 3600_000).toISOString(), userId: "user-1", email: "viewer@example.com", globalRole: "user" }) }));
  await page.route("**/api/v1/me", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "user-1", name: "Viewer", email: "viewer@example.com", globalRole: "user", profileIds: [], organizations: [{ id: "org-1", name: "Organização", organizationRole: "viewer" }] }) }));
  await page.addInitScript(() => localStorage.setItem("report-builder.session.v1", JSON.stringify({ refreshToken: "refresh" })));
}

test.describe("E2E - Execução do relatório", () => {
  test("mostra parâmetros antes de executar e reexecuta ao mudar o tamanho da página", async ({ page }) => {
    await mockSession(page);
    await page.route("**/api/v1/reports/report-1", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "report-1", title: "Vendas diárias", organizationId: "org-1", organizationName: "Organização", visibilityScope: "organization", myRole: "viewer", allowedFilters: [], content: { version: 1, parameters: [{ name: "start", type: "datetime", source: "system", variable: "startOfToday" }, { name: "end", type: "datetime", source: "system", variable: "startOfTomorrow" }], dataset: { schemaId: "schema-1", select: [{ fieldId: "total", alias: "Total" }], where: { operator: "and", conditions: [{ operator: "and", ui: { kind: "relativePeriod", preset: "today", label: "Período de vendas" }, conditions: [{ fieldId: "date", operator: "gte", value: { parameter: "start" } }, { fieldId: "date", operator: "lt", value: { parameter: "end" } }] }] } } } }) }));
    const requests: Array<{ page: number; pageSize: number }> = [];
    await page.route("**/api/v1/reports/report-1/execute", async (route) => {
      const request = route.request().postDataJSON() as { page: number; pageSize: number };
      requests.push({ page: request.page, pageSize: request.pageSize });
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ columns: [{ alias: "Total", type: "number", fieldId: "total", joinAlias: null }, { alias: "Pago", type: "boolean", fieldId: "paid", joinAlias: null }, { alias: "Observação", type: "string", fieldId: "note", joinAlias: null }], rows: [{ Total: 1234.5, Pago: true, Observação: null }], page: request.page, pageSize: request.pageSize, rowCount: request.pageSize, durationMs: 23, resolvedParameters: { start: "2026-08-14T03:00:00.000Z", end: "2026-08-15T03:00:00.000Z" }, warnings: [] }) });
    });

    await page.goto("/reports/report-1/run");
    await expect(page.getByRole("heading", { name: "Vendas diárias" })).toBeVisible();
    await expect(page.getByText("Período de vendas")).toBeVisible();
    expect(requests).toHaveLength(0);
    await page.getByRole("button", { name: "Executar relatório" }).click();
    await expect(page.getByText("1.234,50")).toBeVisible();
    await expect(page.getByText("Sim")).toBeVisible();
    await expect(page.getByText("—")).toBeVisible();
    await expect(page.getByText(/Executado às/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Parâmetros/ })).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("Período de vendas")).toBeVisible();
    await page.getByLabel("Linhas por página").selectOption("25");
    await expect.poll(() => requests.at(-1)).toEqual({ page: 1, pageSize: 25 });

    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(page.getByLabel("Resultados do relatório")).toBeVisible();
  });

  test("mostra o erro quando o relatório não pode ser carregado", async ({ page }) => {
    await mockSession(page);
    await page.route("**/api/v1/reports/missing", async (route) => route.fulfill({ status: 404, contentType: "application/problem+json", body: JSON.stringify({ title: "Não encontrado", detail: "Relatório não encontrado." }) }));
    await page.goto("/reports/missing/run");
    await expect(page.getByText("Relatório não encontrado.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Voltar ao início" })).toBeVisible();
  });

  test("não executa e apresenta schemas e campos bloqueadores", async ({ page }) => {
    await mockSession(page);
    let executionRequests = 0;
    await page.route("**/api/v1/reports/blocked-report", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "blocked-report", title: "Relatório restrito", organizationId: "org-1", organizationName: "Organização", visibilityScope: "organization", myRole: "viewer", allowedFilters: [], canExecute: false, executionBlockCode: "report_definition.field_capability_unavailable", blockedSchemas: [{ schemaId: "schema-1", schemaName: "Pedidos", reason: "capability_missing", blockedFields: [{ fieldId: "field-1", fieldName: "Total", reason: "capability_missing", missingCapabilities: ["filterable", "aggregatable"] }] }], content: { version: 1, parameters: [], dataset: { schemaId: "schema-1", select: [{ fieldId: "field-1", alias: "Total" }] } } }) }));
    await page.route("**/api/v1/reports/blocked-report/execute", async (route) => { executionRequests += 1; await route.abort(); });

    await page.goto("/reports/blocked-report/run");

    await expect(page.getByRole("heading", { name: "Relatório restrito" })).toBeVisible();
    await expect(page.getByText("Execução bloqueada", { exact: true })).toBeVisible();
    await expect(page.getByText("Pedidos")).toBeVisible();
    await expect(page.getByText(/permissões ausentes: filtro, agregação/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Executar relatório" })).toBeDisabled();
    await expect.poll(() => executionRequests).toBe(0);
  });

  test("apresenta um relatório agregado como indicador", async ({ page }) => {
    await mockSession(page);
    await page.route("**/api/v1/reports/metric-1", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "metric-1", title: "Receita", organizationId: "org-1", organizationName: "Organização", visibilityScope: "organization", myRole: "viewer", allowedFilters: [], content: { version: 1, presentation: { type: "metric", valueColumnAlias: "Total", label: "Receita total" }, parameters: [], dataset: { schemaId: "schema-1", select: [{ fieldId: "total", alias: "Total", aggregation: "sum" }], groupBy: [] } } }) }));
    await page.route("**/api/v1/reports/metric-1/execute", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ columns: [{ alias: "Total", type: "number", fieldId: "total", joinAlias: null }], rows: [{ Total: 9876.5 }], page: 1, pageSize: 50, rowCount: 1, durationMs: 11, resolvedParameters: {}, warnings: [] }) }));
    await page.goto("/reports/metric-1/run");
    await expect(page.getByText("Receita total")).toBeVisible();
    await expect(page.getByText("9.876,50")).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
  });

  test("apresenta detalhes agrupados por dia e permite recolher o grupo", async ({ page }) => {
    await mockSession(page);
    await page.route("**/api/v1/reports/grouped-1", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "grouped-1", title: "Vendas por dia", organizationId: "org-1", organizationName: "Organização", visibilityScope: "organization", myRole: "viewer", allowedFilters: [], content: { version: 1, presentation: { type: "groupedTable", groupColumnAlias: "Dia", direction: "desc" }, parameters: [], dataset: { schemaId: "schema-1", select: [{ fieldId: "sold-at", alias: "Dia", dateGranularity: "day" }, { fieldId: "product", alias: "Produto" }], orderBy: [{ fieldId: "sold-at", dateGranularity: "day", direction: "desc" }] } } }) }));
    await page.route("**/api/v1/reports/grouped-1/execute", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ columns: [{ alias: "Dia", type: "date", fieldId: "sold-at", joinAlias: null }, { alias: "Produto", type: "string", fieldId: "product", joinAlias: null }], rows: [{ Dia: "2026-08-15", Produto: "Produto A" }, { Dia: "2026-08-15", Produto: "Produto B" }, { Dia: "2026-08-14", Produto: "Produto C" }], page: 1, pageSize: 50, rowCount: 3, durationMs: 13, resolvedParameters: {}, warnings: [] }) }));

    await page.goto("/reports/grouped-1/run");

    await expect(page.getByRole("columnheader", { name: "Dia" })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Produto" })).toBeVisible();
    const group = page.getByRole("button", { name: /15\/08\/2026.*2 itens nesta página/ });
    await expect(group).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("Produto A")).toBeVisible();
    await group.click();
    await expect(group).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByText("Produto A")).toHaveCount(0);
    await expect(page.getByText("Produto C")).toBeVisible();
  });
});
