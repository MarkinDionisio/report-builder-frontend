import { expect, test } from "@playwright/test";

for (const width of [1280, 390]) {
  test(`menu de ações e padding dos templates com viewport ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 850 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const json = (body: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    const schema = { id: "schema", dataSourceId: "source", publicName: "Pedidos", publicType: "object", internalSchemaName: "public", internalObjectName: "orders", description: "Pedidos cadastrados", isEnabled: true };
    const field = { id: "field", publicName: "Código", internalFieldName: "id", publicType: "integer", isNullable: false, isSelectable: true, isFilterable: true, isSortable: true, isGroupable: true, isAggregatable: true, isSensitive: false, isEnabled: true, allowedOperators: ["eq"], allowedAggregations: ["count"], compatible: true, reason: null };
    const template = { id: "template", name: "ERP padrão", description: "Configuração reutilizável do catálogo", schemas: [{ ...schema, compatible: true, reason: null, fields: [field] }] };
    await page.route("**/api/v1/auth/refresh", route => route.fulfill(json({ accessToken: "token", refreshToken: "refresh", tokenType: "Bearer", expiresAt: new Date(Date.now() + 3600000).toISOString(), userId: "root", email: "root@example.com", globalRole: "root" })));
    await page.route("**/api/v1/me", route => route.fulfill(json({ id: "root", name: "Root", email: "root@example.com", globalRole: "root", profileIds: [], organizations: [] })));
    await page.route("**/api/v1/organizations", route => route.fulfill(json([{ id: "org", name: "Organização" }])));
    await page.route("**/api/v1/data-sources", route => route.fulfill(json([{ id: "source", organizationId: "org", name: "Banco de produção", provider: "postgresql", executionCredentialMode: "existingReadOnlyUser", readOnlyVerificationStatus: "verified", isEnabled: true, hasClientCertificate: false }])));
    await page.route("**/api/v1/report-schemas", route => route.fulfill(json([schema])));
    await page.route("**/api/v1/report-schemas/schema/fields", route => route.fulfill(json([field])));
    await page.route("**/api/v1/catalog-templates", route => route.fulfill(json([template])));
    const previewTemplate = {
      ...template,
      schemas: template.schemas.map(schema => ({
        ...schema,
        fields: Array.from({ length: 40 }, (_, index) => ({
          ...field,
          id: `field-${index}`,
          publicName: `Campo ${index + 1}`,
          internalFieldName: `field_${index}`,
        })),
      })),
    };
    await page.route("**/api/v1/data-sources/source/catalog-template/preview", route => route.fulfill(json(previewTemplate)));
    await page.addInitScript(() => localStorage.setItem("report-builder.session.v1", JSON.stringify({ refreshToken: "refresh" })));
    await page.goto("/data-sources");
    const group = page.getByRole("group", { name: "Ações de Banco de produção" });
    await expect(group).toBeVisible();
    await expect(group.getByRole("button")).toHaveCount(3);
    await expect(page.getByRole("menuitem")).toHaveCount(0);
    await page.locator(".data-sources-table").evaluate(element => { element.scrollLeft = element.scrollWidth; });
    await group.getByRole("button", { name: "Mais ações de Banco de produção" }).click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    const bounds = await menu.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(16);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width - 16);
    await page.screenshot({ path: testInfo.outputPath("datasource-menu.png"), fullPage: true });
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await group.getByRole("button", { name: "Mais ações de Banco de produção" }).click();
    await page.getByRole("menuitem", { name: "Salvar catálogo como template" }).click();
    const dialog = page.getByRole("dialog");
    const padding = width <= 640 ? "16px" : "24px";
    await expect(dialog.locator(".modal-body")).toHaveCSS("padding-left", padding);
    await expect(dialog.locator(".modal-body")).toHaveCSS("padding-right", padding);
    await expect(dialog.getByRole("button", { name: "Salvar template" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Fechar" })).toBeEnabled();
    await page.screenshot({ path: testInfo.outputPath("save-template-padding.png"), fullPage: true });
    await dialog.getByRole("button", { name: "Fechar" }).click();
    await group.getByRole("button", { name: "Mais ações de Banco de produção" }).click();
    await page.getByRole("menuitem", { name: "Aplicar template" }).click();
    await dialog.getByRole("combobox", { name: "Template" }).selectOption("template");
    await dialog.getByRole("button", { name: "Gerar prévia" }).click();
    const applyButton = dialog.getByRole("button", { name: "Aplicar 40 campos" });
    await expect(applyButton).toBeInViewport();
    await dialog.getByRole("button", { name: "Ver campos de Pedidos" }).click();
    const scrollBody = dialog.locator(".modal-body");
    expect(await scrollBody.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
    await scrollBody.evaluate(element => { element.scrollTop = element.scrollHeight; });
    await expect(applyButton).toBeInViewport();
    await expect(dialog.getByText("40 campos selecionados")).toBeInViewport();
    await expect(dialog.getByRole("button", { name: "Fechar" })).toBeInViewport();
    await scrollBody.evaluate(element => { element.scrollTop = 0; });
    await expect(applyButton).toBeInViewport();
    await expect(dialog.locator(".catalog-schema-group__fields")).toHaveCSS("padding-left", width <= 640 ? "12px" : "40px");
    await page.screenshot({ path: testInfo.outputPath("apply-template-padding.png"), fullPage: true });
    await dialog.getByRole("button", { name: "Fechar" }).click();
    await page.goto("/catalog-templates");
    await expect(page.getByRole("heading", { name: "ERP padrão" })).toBeVisible();
    const card = page.locator(".catalog-template-card");
    await expect(card).toHaveCSS("padding-left", padding);
    const mainBounds = await page.locator("main").boundingBox();
    expect(mainBounds!.x).toBeGreaterThanOrEqual(width <= 640 ? 16 : 24);
    expect(mainBounds!.x + mainBounds!.width).toBeLessThanOrEqual(width - (width <= 640 ? 16 : 24));
    await card.locator("summary").click();
    await page.screenshot({ path: testInfo.outputPath("catalog-templates-padding.png"), fullPage: true });
    await card.getByRole("button", { name: "Excluir", exact: true }).click();
    await expect(page.getByRole("dialog").locator(".modal-body")).toHaveCSS("padding-left", padding);
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  });
}
