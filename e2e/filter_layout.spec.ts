import { expect, test } from "@playwright/test";

test.describe("E2E - Formulário e resumo dos filtros", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/v1/auth/refresh", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accessToken: "token", refreshToken: "refresh", tokenType: "Bearer", expiresAt: new Date(Date.now() + 3600_000).toISOString(), userId: "user-1", email: "creator@example.com", globalRole: "creator" }) }));
    await page.route("**/api/v1/me", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "user-1", name: "Creator", email: "creator@example.com", globalRole: "creator", profileIds: [], organizations: [{ id: "org-1", name: "Organização", organizationRole: "creator" }] }) }));
    await page.route("**/api/v1/organizations/org-1/data-sources", async (route) => route.fulfill({ status: 403, contentType: "application/problem+json", body: JSON.stringify({ code: "report_catalog.grant_management_forbidden", detail: "Only root and organization administrators can manage report catalog grants." }) }));
    await page.route("**/api/v1/organizations/org-1/report-designer/data-sources", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: "ds-1", name: "Vendas", provider: "postgresql", readOnlyVerificationStatus: "verified" }]) }));
    await page.route("**/api/v1/reports/report-1", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "report-1", title: "Vendas por período", organizationId: "org-1", organizationName: "Organização", visibilityScope: "private", myRole: "creator", allowedFilters: [], content: { version: 1, parameters: [{ name: "period_start_1", type: "datetime", source: "system", variable: "startOfMonth" }, { name: "period_end_1", type: "datetime", source: "system", variable: "startOfNextMonth" }], dataset: { dataSourceId: "ds-1", schemaId: "schema-1", select: [{ fieldId: "amount", alias: "Total", aggregation: "sum" }, { fieldId: "sale-date" }], where: { operator: "and", conditions: [{ operator: "and", ui: { kind: "relativePeriod", preset: "currentMonth" }, conditions: [{ fieldId: "sale-date", operator: "gte", value: { parameter: "period_start_1" } }, { fieldId: "sale-date", operator: "lt", value: { parameter: "period_end_1" } }] }] }, groupBy: [], orderBy: [] } } }) }));
    await page.route("**/api/v1/organizations/org-1/report-designer/catalog?dataSourceId=ds-1", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemas: [{ id: "schema-1", dataSourceId: "ds-1", dataSourceName: "Vendas", name: "Vendas com um nome propositalmente muito longo para validar o layout", type: "table", fields: [{ id: "sale-date", name: "Data da venda com descrição extensa", type: "datetime", nullable: false, selectable: true, filterable: true, sortable: true, groupable: true, aggregatable: false, allowedOperators: ["eq", "gte", "lt", "between"], allowedAggregations: [] }, { id: "amount", name: "Valor total", type: "number", nullable: false, selectable: true, filterable: true, sortable: true, groupable: false, aggregatable: true, allowedOperators: ["eq", "gte", "between"], allowedAggregations: ["sum"] }] }], joins: [] }) }));
    await page.addInitScript(() => localStorage.setItem("report-builder.session.v1", JSON.stringify({ refreshToken: "refresh" })));
  });

  test("edita, adiciona e remove filtros sem edição inline", async ({ page }) => {
    await page.goto("/organizations/org-1/creator/reports/report-1");
    await page.getByRole("button", { name: "Próximo: Escolher Colunas" }).click();
    const columnTitles = page.getByLabel("Título da coluna");
    await expect(columnTitles).toHaveCount(2);
    await expect(columnTitles.nth(0)).toHaveValue("Total");
    await expect(columnTitles.nth(1)).toHaveValue("Data da venda com descrição extensa");
    await columnTitles.nth(0).fill("");
    await expect(page.getByRole("alert")).toContainText("Informe o título da coluna");
    await columnTitles.nth(0).fill("Receita total");
    await page.getByRole("button", { name: "Próximo: Filtros & Ordenação" }).click();
    await page.getByRole("button", { name: "Voltar" }).click();
    await expect(page.getByLabel("Título da coluna").nth(0)).toHaveValue("Receita total");
    await page.getByRole("button", { name: "Próximo: Filtros & Ordenação" }).click();

    const summaries = page.locator(".filter-summary");
    await expect(summaries).toHaveCount(1);
    await expect(summaries.first()).toContainText("Mês atual");
    await expect(summaries.first()).toContainText("Automático");
    await expect(summaries.first().locator("input, select, textarea")).toHaveCount(0);

    await summaries.first().getByRole("button", { name: /Editar filtro/ }).click();
    const editDialog = page.getByRole("dialog", { name: "Editar filtro" });
    await expect(editDialog.getByLabel("Como definir o valor? *")).toHaveValue("automatic");
    await editDialog.getByLabel("Como definir o valor? *").selectOption("fixed");
    const modeControl = editDialog.getByLabel("Como definir o valor? *");
    const conditionControl = editDialog.getByLabel("Condição *");
    expect(await editDialog.locator("#filter-editor-mode, #filter-editor-operator").evaluateAll((elements) => elements.map((element) => element.id))).toEqual(["filter-editor-mode", "filter-editor-operator"]);
    await expect(conditionControl.getByRole("option", { name: "Está entre" })).toHaveCount(0);
    await modeControl.selectOption("automatic");
    await editDialog.getByLabel("Período").selectOption("previousMonth");
    await editDialog.getByRole("button", { name: "Salvar filtro" }).click();
    await expect(summaries.first()).toContainText("Mês anterior");

    await page.getByRole("button", { name: "Adicionar Filtro" }).click();
    const addDialog = page.getByRole("dialog", { name: "Adicionar filtro" });
    await expect(addDialog.getByRole("button", { name: "Salvar filtro" })).toBeDisabled();
    await addDialog.getByRole("button", { name: "Selecione o campo que deseja filtrar..." }).click();
    await expect(addDialog.locator(".searchable-field-menu--inline")).toBeVisible();
    expect(await addDialog.locator(".searchable-field-menu--inline").evaluate((element) => getComputedStyle(element).position)).toBe("relative");
    await expect(addDialog.getByText("Valor total", { exact: true })).toBeVisible();
    await addDialog.getByText("Valor total", { exact: true }).click();
    await expect(addDialog.getByLabel("Condição *").getByRole("option", { name: "Está entre" })).toHaveAttribute("value", "between");
    await addDialog.getByLabel("Valor do filtro").fill("100");
    await addDialog.getByRole("button", { name: "Salvar filtro" }).click();
    await expect(summaries).toHaveCount(2);
    await expect(summaries.nth(1)).toContainText("Valor total");

    await summaries.nth(1).getByRole("button", { name: /Remover filtro/ }).click();
    await summaries.nth(1).getByRole("button", { name: "Remover" }).click();
    await expect(summaries).toHaveCount(1);

    await page.setViewportSize({ width: 480, height: 900 });
    await summaries.first().getByRole("button", { name: /Editar filtro/ }).click();
    const mobileDialog = page.getByRole("dialog", { name: "Editar filtro" });
    await expect(mobileDialog).toBeVisible();
    expect(await mobileDialog.evaluate((element) => element.scrollWidth <= element.clientWidth && element.getBoundingClientRect().width <= window.innerWidth)).toBe(true);
  });

  test("lista fontes disponíveis para criar um relatório usando o endpoint de Creator", async ({ page }) => {
    await page.goto("/organizations/org-1/creator/reports/new");

    await expect(page.getByRole("heading", { name: "Selecione o DataSource" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Vendas/ })).toBeVisible();
    await expect(page.getByText("Only root and organization administrators can manage report catalog grants.")).toHaveCount(0);
  });
});
