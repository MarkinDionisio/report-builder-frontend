import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) {
  test("keeps API failures and validation in Portuguese at width " + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    let attempts = 0;
    await page.route("**/api/v1/auth/login", route => {
      attempts++;
      return route.fulfill({ status: 400, contentType: "application/problem+json", body: JSON.stringify(attempts === 1
        ? { title: "Bad Request", status: 400, code: "auth.invalid_credentials", detail: "Invalid email or password." }
        : { title: "Technical failure", status: 400, code: "future.unknown", detail: "Internal provider failure", errors: { Email: ["The Email field is invalid."] } }) });
    });
    await page.goto("/login");
    await page.getByLabel("E-mail", { exact: true }).fill("person@example.com");
    await page.getByLabel("Senha", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    const alert = page.getByRole("alert");
    await expect(alert).toContainText("E-mail ou senha incorretos. Verifique os dados informados.");
    await expect(alert).not.toContainText("Invalid email or password.");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(alert).toContainText("Erro de Validação");
    await expect(alert).toContainText("E-mail:");
    await expect(alert).toContainText("Verifique o valor informado.");
    await expect(alert).not.toContainText("Internal provider failure");
    await expect(alert).not.toContainText("The Email field is invalid.");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
