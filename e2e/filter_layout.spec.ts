import { expect, test } from "@playwright/test";

test.describe("E2E - Filter form and summary", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/v1/auth/refresh", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accessToken: "token", refreshToken: "refresh", tokenType: "Bearer", expiresAt: new Date(Date.now() + 3600_000).toISOString(), userId: "user-1", email: "creator@example.com", globalRole: "creator" }) }));
    await page.route("**/api/v1/me", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "user-1", name: "Creator", email: "creator@example.com", globalRole: "creator", profileIds: [], organizations: [{ id: "org-1", name: "Organização", organizationRole: "creator" }] }) }));
    await page.route("**/api/v1/organizations/org-1/data-sources", async (route) => route.fulfill({ status: 403, contentType: "application/problem+json", body: JSON.stringify({ code: "report_catalog.grant_management_forbidden", detail: "Only root and organization administrators can manage report catalog grants." }) }));
    await page.route("**/api/v1/organizations/org-1/report-designer/data-sources", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: "ds-1", name: "Vendas", provider: "postgresql", readOnlyVerificationStatus: "verified" }]) }));
    await page.route("**/api/v1/reports/report-1", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "report-1", title: "Vendas por período", organizationId: "org-1", organizationName: "Organização", visibilityScope: "private", myRole: "creator", allowedFilters: [], canExecute: true, canEdit: true, executionBlockCode: null, blockedSchemas: [], content: { version: 1, parameters: [{ name: "period_start_1", type: "datetime", source: "system", variable: "startOfMonth" }, { name: "period_end_1", type: "datetime", source: "system", variable: "startOfNextMonth" }], dataset: { dataSourceId: "ds-1", schemaId: "schema-1", select: [{ fieldId: "amount", alias: "Total", aggregation: "sum" }, { fieldId: "sale-date" }], where: { operator: "and", conditions: [{ operator: "and", ui: { kind: "relativePeriod", preset: "currentMonth" }, conditions: [{ fieldId: "sale-date", operator: "gte", value: { parameter: "period_start_1" } }, { fieldId: "sale-date", operator: "lt", value: { parameter: "period_end_1" } }] }] }, groupBy: [], orderBy: [] } } }) }));
    await page.route("**/api/v1/organizations/org-1/report-designer/catalog?dataSourceId=ds-1", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemas: [{ id: "schema-1", dataSourceId: "ds-1", dataSourceName: "Vendas", name: "Vendas com um nome propositalmente muito longo para validar o layout", type: "table", fields: [{ id: "sale-date", name: "Data da venda com descrição extensa", type: "datetime", nullable: false, selectable: true, filterable: true, sortable: true, groupable: true, aggregatable: false, allowedOperators: ["eq", "gte", "lt", "between"], allowedAggregations: [] }, { id: "amount", name: "Valor total", type: "number", nullable: false, selectable: true, filterable: true, sortable: true, groupable: false, aggregatable: true, allowedOperators: ["eq", "gte", "between"], allowedAggregations: ["sum"] }] }], joins: [] }) }));
    await page.addInitScript(() => localStorage.setItem("report-builder.session.v1", JSON.stringify({ refreshToken: "refresh" })));
  });

  test("renames shared parameters across filters", async ({ page }) => {
    await page.goto("/organizations/org-1/creator/reports/report-1");
    await page.getByRole("button", { name: "Próximo: Escolher Colunas" }).click();
    await page.getByRole("button", { name: "Próximo: Filtros & Ordenação" }).click();
    await page.getByRole("button", { name: /Duplicar filtro/ }).first().click();
    await page.getByRole("button", { name: /Editar filtro/ }).first().click();
    const dialog = page.getByRole("dialog", { name: "Editar filtro" });
    await dialog.getByText("Opções Avançadas").click();
    await expect(dialog.getByRole("note")).toContainText("compartilhado");
    await dialog.getByLabel("Nome interno inicial").fill("inicioCompartilhado");
    await dialog.getByRole("button", { name: "Salvar filtro" }).click();
    await page.getByRole("button", { name: /Editar filtro/ }).nth(1).click();
    await dialog.getByText("Opções Avançadas").click();
    await expect(dialog.getByLabel("Nome interno inicial")).toHaveValue("inicioCompartilhado");
  });

  test("preserves advanced parameters in small-screen modals", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/organizations/org-1/creator/reports/report-1");
    await page.getByRole("button", { name: "Próximo: Escolher Colunas" }).click();
    await page.getByRole("button", { name: "Próximo: Filtros & Ordenação" }).click();
    await expect(page.getByText("Configuração avançada de parâmetros")).toHaveCount(0);
    const edit = page.getByRole("button", { name: /Editar filtro/ }).first();
    await edit.click();
    const dialog = page.getByRole("dialog", { name: "Editar filtro" });
    const advanced = dialog.locator("details");
    await expect(advanced).not.toHaveAttribute("open");
    await dialog.getByText("Opções Avançadas").click();
    await expect(dialog.getByLabel("Nome interno inicial")).toHaveValue("period_start_1");
    await dialog.getByLabel("Nome interno inicial").fill("inicio");
    await dialog.getByLabel("Permitir alteração na execução — fim").check();
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await dialog.getByRole("button", { name: "Salvar filtro" }).click();
    await edit.click();
    await dialog.getByText("Opções Avançadas").click();
    await expect(dialog.getByLabel("Nome interno inicial")).toHaveValue("inicio");
    await expect(dialog.getByLabel("Nome interno final")).toHaveValue("period_end_1");
    await expect(dialog.getByLabel("Permitir alteração na execução — fim")).toBeChecked();
    await dialog.getByLabel("Nome interno inicial").fill("discarded");
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await edit.click();
    await dialog.getByText("Opções Avançadas").click();
    await expect(dialog.getByLabel("Nome interno inicial")).toHaveValue("inicio");
  });

  test("paginates preview and resets the page after changing page size", async ({ page }) => {
    const requests: Array<{ page: number; pageSize: number }> = [];
    await page.route("**/api/v1/reports/preview", async (route) => {
      const request = route.request().postDataJSON();
      requests.push({ page: request.page, pageSize: request.pageSize });
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ columns: [{ alias: "Total", type: "number", fieldId: "amount" }], rows: [{ Total: request.page * 100 }], page: request.page, pageSize: request.pageSize, rowCount: request.pageSize, durationMs: 1, resolvedParameters: {} }) });
    });
    await page.goto("/organizations/org-1/creator/reports/report-1");
    await page.getByRole("button", { name: "Próximo: Escolher Colunas" }).click();
    await page.getByRole("button", { name: "Próximo: Filtros & Ordenação" }).click();
    await page.getByRole("button", { name: /Próximo:.*Preview/ }).click();
    await page.getByRole("button", { name: "Executar Query" }).click();
    await expect(page.getByText("Página 1", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Próxima", exact: true }).click();
    await expect(page.getByText("Página 2", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Anterior", exact: true }).click();
    await expect(page.getByText("Página 1", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Próxima", exact: true }).click();
    await expect(page.getByText("Página 2", { exact: true })).toBeVisible();
    await page.getByLabel("Linhas por página").selectOption("25");
    await expect(page.getByText("Página 1", { exact: true })).toBeVisible();
    expect(requests).toEqual([{ page: 1, pageSize: 50 }, { page: 2, pageSize: 50 }, { page: 1, pageSize: 50 }, { page: 2, pageSize: 50 }, { page: 1, pageSize: 25 }]);
  });

  test("edits, adds, and removes filters without inline editing", async ({ page }) => {
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

  test("lists sources through the creator endpoint", async ({ page }) => {
    await page.goto("/organizations/org-1/creator/reports/new");

    await expect(page.getByRole("heading", { name: "Selecione o DataSource" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Vendas/ })).toBeVisible();
    await expect(page.getByText("Only root and organization administrators can manage report catalog grants.")).toHaveCount(0);
  });

  test("blocks the designer before source, catalog, preview, or update requests", async ({ page }) => {
    let dataSourceCalls = 0;
    let catalogCalls = 0;
    let previewCalls = 0;
    let updateCalls = 0;
    await page.unroute("**/api/v1/organizations/org-1/report-designer/data-sources");
    await page.unroute("**/api/v1/organizations/org-1/report-designer/catalog?dataSourceId=ds-1");
    await page.unroute("**/api/v1/reports/report-1");
    await page.route("**/api/v1/organizations/org-1/report-designer/data-sources", async (route) => { dataSourceCalls += 1; await route.fulfill({ status: 200, body: "[]" }); });
    await page.route("**/api/v1/organizations/org-1/report-designer/catalog**", async (route) => { catalogCalls += 1; await route.fulfill({ status: 200, body: JSON.stringify({ schemas: [], joins: [] }) }); });
    await page.route("**/api/v1/reports/preview", async (route) => { previewCalls += 1; await route.fulfill({ status: 200, body: "{}" }); });
    await page.route("**/api/v1/reports/report-1", async (route) => {
      if (route.request().method() === "PATCH") {
        updateCalls += 1;
        await route.fulfill({ status: 403, body: JSON.stringify({ code: "reports.edit_access_blocked" }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        id: "report-1", title: "Relatório restrito", organizationId: "org-1", organizationName: "Organização", visibilityScope: "organization", myRole: "creator",
        allowedFilters: [], canExecute: false, canEdit: false, executionBlockCode: "report_definition.field_capability_unavailable",
        blockedSchemas: [{ schemaId: "schema-1", schemaName: "Pedidos", reason: "capability_missing", blockedFields: [{ fieldId: "amount", fieldName: "Total", reason: "capability_missing", missingCapabilities: ["filterable", "aggregatable"] }] }],
        content: { version: 1, parameters: [], dataset: { dataSourceId: "ds-1", schemaId: "schema-1", select: [{ fieldId: "amount" }] } }
      }) });
    });

    await page.goto("/organizations/org-1/creator/reports/report-1");

    await expect(page.getByRole("alert")).toContainText("Este relatório não pode ser editado");
    await expect(page.getByRole("alert")).toContainText("Pedidos");
    await expect(page.getByRole("alert")).toContainText("Total");
    await expect(page.getByRole("alert")).toContainText("filtro, agregação");
    await expect(page.getByRole("link", { name: "Voltar ao workspace" })).toHaveAttribute("href", "/organizations/org-1/creator");
    await expect(page.getByRole("link", { name: "Abrir execução" })).toHaveAttribute("href", "/reports/report-1/run");
    expect({ dataSourceCalls, catalogCalls, previewCalls, updateCalls }).toEqual({ dataSourceCalls: 0, catalogCalls: 0, previewCalls: 0, updateCalls: 0 });
  });
});
