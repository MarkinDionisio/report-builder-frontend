import { expect, test } from "@playwright/test";

for (const width of [1280, 390]) test('carregamento contextual em ' + width, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 844 });
  const json = (body: unknown) => ({ contentType: "application/json", body: JSON.stringify(body) });
  const user = { id: "user", name: "Root", email: "root@example.com", globalRole: "root", profileIds: [], organizations: [] };
  let release!: () => void;
  let pending = new Promise<void>(resolve => { release = resolve; });
  let fail = false;
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill(json({ accessToken: "token", refreshToken: "refresh", tokenType: "Bearer", expiresAt: new Date(Date.now()+3600000).toISOString(), userId: "user", email: user.email, globalRole: "root" }));
    if (path.endsWith('/me')) return route.fulfill(json(user));
    if (path.endsWith('/reports/tags')) return route.fulfill(json([]));
    if (path.endsWith('/reports')) {
      await pending;
      if (fail) return route.fulfill({ status: 500, ...json({ detail: "Falha de consulta simulada" }) });
      return route.fulfill(json({ page: 1, pageSize: 20, totalRecords: 21, totalPages: 2, data: [{ id: 'report', title: 'Relatório com nome extenso para validar carregamento e responsividade', organizationId: 'org', organizationName: 'Empresa', myRole: 'root', visibilityScope: 'private', tags: [] }] }));
    }
    return route.fulfill(json([]));
  });
  await page.addInitScript(() => localStorage.setItem('report-builder.session.v1', JSON.stringify({ refreshToken: 'refresh' })));
  await page.goto('/dashboard');
  await expect(page.locator('.content-skeleton')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Consultando relatórios' })).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.skeleton-line').first()).toHaveCSS('animation-name', 'none');
  await page.screenshot({ path: testInfo.outputPath('initial.png'), fullPage: true });
  release();
  await expect(page.locator('.report-browser-row')).toBeVisible();
  pending = new Promise<void>(resolve => { release = resolve; });
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.getByText('Atualizando relatórios…')).toBeVisible();
  await expect(page.locator('.report-browser-row')).toBeVisible();
  await expect(page.locator('.report-browser [inert]')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('refresh.png'), fullPage: true });
  fail = true; release();
  await expect(page.getByRole('button', { name: 'Consultar relatórios novamente' })).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Consultar relatórios novamente' }).click();
  await expect(page.locator('.report-browser-row')).toBeVisible();
});
