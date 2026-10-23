import { expect, test } from "@playwright/test";

for (const viewport of [{ name: "desktop", width: 1280, height: 800 }, { name: "mobile", width: 390, height: 844 }, { name: "compact", width: 320, height: 640 }]) {
test(`imports in steps on ${viewport.name} and opens the copy in the editor`, async ({ page }, testInfo) => {
  await page.setViewportSize(viewport);
  const json = (body: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  const session = { accessToken: "token", refreshToken: "refresh", tokenType: "Bearer", expiresAt: new Date(Date.now() + 3600000).toISOString(), userId: "user", email: "creator@example.com", globalRole: "creator" };
  const copy = { id: "copy", title: "Vendas locais", organizationId: "target", organizationName: "Destino", visibilityScope: "private", myRole: "owner", canExecute: true, canEdit: true, executionBlockCode: null, blockedSchemas: [], allowedFilters: [], content: { version: 1, dataset: { dataSourceId: "source", schemaId: "schema", select: [{ fieldId: "status", alias: "Status" }] } } };
  await page.route("**/api/v1/auth/refresh", route => route.fulfill(json(session)));
  await page.route("**/api/v1/me", route => route.fulfill(json({ id: "user", name: "Creator", email: session.email, globalRole: "creator", profileIds: [], organizations: [{ id: "target", name: "Destino", organizationRole: "creator" }] })));
  await page.route("**/api/v1/organizations*", route => route.fulfill(json({ page: 1, pageSize: 20, totalPages: 1, totalRecords: 1, data: [{ id: "target", name: "Destino", myRole: "creator" }] })));
  await page.route("**/api/v1/reports?*", route => route.fulfill(json({ page: 1, pageSize: 100, totalPages: 0, totalRecords: 0, data: [] })));
  await page.route("**/api/v1/dashboards?*", route => route.fulfill(json({ page: 1, pageSize: 100, totalPages: 0, totalRecords: 0, data: [] })));
  await page.route("**/api/v1/reports/global-templates?*", route => {
    const search = new URL(route.request().url()).searchParams.get("search") || "";
    const data = [{ id: "global", title: "Vendas", updatedAt: "2026-10-20T00:00:00Z" }, ...Array.from({ length: 9 }, (_, index) => ({ id: String(index), title: "Modelo " + (index + 2), updatedAt: "2026-10-20T00:00:00Z" }))].filter(template => template.title.toLowerCase().includes(search.toLowerCase()));
    return route.fulfill(json({ page: 1, pageSize: 10, totalPages: 1, totalRecords: data.length, data }));
  });
  await page.route("**/api/v1/organizations/target/report-tags", route => route.fulfill(json([])));
  await page.route("**/api/v1/organizations/target/report-import-data-sources", route => route.fulfill(json([{ id: "source", name: "Base local" }])));
  await page.route("**/api/v1/reports/global/import-check", async route => {
    expect(route.request().headers()["content-type"]).toBe("application/json");
    expect(route.request().postDataJSON()).toEqual({ organizationId: "target", dataSourceId: "source", title: "Vendas locais", tagIds: [] });
    await route.fulfill(json({ canImport: true, issues: [] }));
  });
  await page.route("**/api/v1/reports/global/import", async route => {
    expect(route.request().postDataJSON()).toEqual({ organizationId: "target", dataSourceId: "source", title: "Vendas locais", tagIds: [] });
    await route.fulfill({ ...json(copy), status: 201 });
  });
  await page.route("**/api/v1/reports/copy", route => route.fulfill(json(copy)));
  await page.route("**/api/v1/organizations/target/report-designer/data-sources", route => route.fulfill(json([{ id: "source", name: "Base local", provider: "postgresql", readOnlyVerificationStatus: "verified" }])));
  await page.route("**/api/v1/organizations/target/report-designer/catalog?*", route => route.fulfill(json({ schemas: [{ id: "schema", dataSourceId: "source", name: "Pedidos", fields: [{ id: "status", name: "Status", type: "string", selectable: true, filterable: true, sortable: true, groupable: true, allowedOperators: ["eq", "in"], allowedAggregations: [] }] }], joins: [] })));
  await page.addInitScript(() => localStorage.setItem("report-builder.session.v1", JSON.stringify({ refreshToken: "refresh" })));
  await page.goto("/organizations/target/creator");
  await page.getByRole("link", { name: "Catálogo de relatórios globais", exact: true }).click();
  await expect(page).toHaveURL(new RegExp("/organizations/target/creator/global-reports$"));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Catálogo de relatórios globais", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Escolher relatório", exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "Configurar importação", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Data source de destino")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Selecionar modelo Vendas" })).toBeVisible();
  const content = page.locator(".global-report-import__body");
  const gutter = viewport.width <= 720 ? "16px" : "24px";
  for (const selector of [".global-report-import__header", ".global-report-import__steps", ".global-report-import__body", ".global-report-import__footer"]) {
    await expect(page.locator(selector)).toHaveCSS("padding-left", gutter);
    await expect(page.locator(selector)).toHaveCSS("padding-right", gutter);
  }
  // Measure both cards in the same frame while the application shell animates.
  const [firstCard, secondCard] = await page.locator(".global-report-catalog__card").evaluateAll(elements =>
    elements.slice(0, 2).map(element => {
      const { x, y, height } = element.getBoundingClientRect();
      return { x, y, height };
    })
  );
  expect(secondCard!.y).toBeGreaterThan(firstCard!.y + firstCard!.height);
  expect(secondCard!.x).toBe(firstCard!.x);
  await content.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect(page.getByRole("button", { name: "Voltar à organização" })).toBeInViewport();
  // Re-scroll after layout settles; compare both rectangles in the same frame.
  await expect.poll(async () => {
    await content.evaluate(element => { element.scrollTop = element.scrollHeight; });
    return page.evaluate(() => {
      const card = document.querySelector('[aria-label="Selecionar modelo Modelo 10"]')!.getBoundingClientRect();
      const footer = document.querySelector('.global-report-import__footer')!.getBoundingClientRect();
      return card.bottom <= footer.top;
    });
  }).toBe(true);
  await content.evaluate(element => { element.scrollTop = 0; });
  await page.screenshot({ path: testInfo.outputPath("catalogo.png"), fullPage: true });
  await page.getByRole("textbox", { name: "Buscar relatórios globais" }).fill("Vendas");
  await page.getByRole("button", { name: "Selecionar modelo Vendas" }).click();
  await expect(page.getByRole("heading", { name: "Configurar importação", exact: true })).toBeFocused();
  await expect(page.getByRole("textbox", { name: "Buscar relatórios globais" })).toHaveCount(0);
  await page.getByRole("button", { name: "Trocar relatório" }).click();
  await expect(page.getByRole("textbox", { name: "Buscar relatórios globais" })).toHaveValue("Vendas");
  await page.getByRole("button", { name: "Selecionar modelo Vendas" }).click();
  await page.getByLabel("Data source de destino").selectOption("source");
  await page.getByLabel("Título da cópia").fill("Vendas locais");
  await expect(page.getByRole("button", { name: "Importar relatório", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Verificar compatibilidade" }).click();
  await expect(page.getByText(/Modelo compatível/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Verificar compatibilidade" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Importar relatório", exact: true })).toBeInViewport();
  const sourceBox = await page.getByLabel("Data source de destino").boundingBox();
  const titleLabel = await page.locator('label[for="import-title"]').boundingBox();
  expect(titleLabel!.y - sourceBox!.y - sourceBox!.height).toBeGreaterThanOrEqual(19);
  await content.evaluate(element => { element.scrollTop = element.scrollHeight; });
  const diagnostics = await page.locator(".global-report-import__diagnostics").boundingBox();
  const configurationFooter = await page.locator(".global-report-import__footer").boundingBox();
  expect(diagnostics!.y + diagnostics!.height).toBeLessThanOrEqual(configurationFooter!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("configuracao.png"), fullPage: true });
  await page.getByRole("button", { name: "Importar relatório", exact: true }).click();
  await expect(page).toHaveURL(new RegExp("organizations/target/creator/reports/copy$"));
  await expect(page.getByRole("heading", { name: "Catálogo de relatórios globais", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Vendas locais" })).toBeVisible();
});
}

test("does not offer import to viewers", async ({ page }) => {
  const json = (body: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  await page.route("**/api/v1/auth/refresh", route => route.fulfill(json({ accessToken: "token", refreshToken: "refresh", tokenType: "Bearer", expiresAt: new Date(Date.now() + 3600000).toISOString(), userId: "viewer", email: "viewer@example.com", globalRole: "viewer" })));
  await page.route("**/api/v1/me", route => route.fulfill(json({ id: "viewer", name: "Viewer", email: "viewer@example.com", globalRole: "viewer", profileIds: [], organizations: [{ id: "target", name: "Destino", organizationRole: "viewer" }] })));
  await page.addInitScript(() => localStorage.setItem("report-builder.session.v1", JSON.stringify({ refreshToken: "refresh" })));
  await page.goto("/organizations/target/creator/global-reports");
  await expect(page).toHaveURL(new RegExp("/dashboard$"));
  await expect(page.getByRole("link", { name: "Catálogo de relatórios globais" })).toHaveCount(0);
});
