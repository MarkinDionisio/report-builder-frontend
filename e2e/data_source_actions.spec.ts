import { expect, test } from "@playwright/test";

for (const width of [1280, 390]) {
  test(`organiza ações das fontes em duas colunas com viewport ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 850 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const json = (body: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    await page.route("**/api/v1/auth/refresh", route => route.fulfill(json({ accessToken: "token", refreshToken: "refresh", tokenType: "Bearer", expiresAt: new Date(Date.now() + 3600000).toISOString(), userId: "root", email: "root@example.com", globalRole: "root" })));
    await page.route("**/api/v1/me", route => route.fulfill(json({ id: "root", name: "Root", email: "root@example.com", globalRole: "root", profileIds: [], organizations: [] })));
    await page.route("**/api/v1/organizations", route => route.fulfill(json([{ id: "org", name: "Organização" }])));
    await page.route("**/api/v1/data-sources", route => route.fulfill(json([{ id: "source", organizationId: "org", name: "Banco de produção", provider: "postgresql", executionCredentialMode: "existingReadOnlyUser", readOnlyVerificationStatus: "verified", isEnabled: true, hasClientCertificate: false }])));
    await page.addInitScript(() => localStorage.setItem("report-builder.session.v1", JSON.stringify({ refreshToken: "refresh" })));
    await page.goto("/data-sources");
    const group = page.getByRole("group", { name: "Ações do catálogo de Banco de produção" });
    await expect(group).toBeVisible();
    const boxes = await group.locator("button").evaluateAll(buttons => buttons.map(button => {
      const { x, y, width, height } = button.getBoundingClientRect();
      return { x, y, width, height };
    }));
    expect(boxes).toHaveLength(4);
    expect(boxes[0].y).toBe(boxes[1].y);
    expect(boxes[2].y).toBe(boxes[3].y);
    expect(boxes[2].y).toBeGreaterThan(boxes[0].y + boxes[0].height);
    expect(boxes[0].x).toBe(boxes[2].x);
    expect(boxes[1].x).toBe(boxes[3].x);
    expect(Math.max(...boxes.map(b => b.height)) - Math.min(...boxes.map(b => b.height))).toBeLessThan(1);
    const management = page.getByRole("group", { name: "Gerenciar Banco de produção" });
    await expect(management.getByRole("button", { name: "Editar DataSource" })).toBeVisible();
    await expect(management.getByRole("button", { name: "Excluir DataSource" })).toBeVisible();
    await expect(page.locator(".data-sources-table")).toHaveCSS("overflow-x", "auto");
    await page.locator(".data-sources-table").evaluate(element => { element.scrollLeft = element.scrollWidth; });
    await page.screenshot({ path: testInfo.outputPath("datasource-actions.png"), fullPage: true });
  });
}
