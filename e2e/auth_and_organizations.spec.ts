import { test, expect } from "@playwright/test";

test.describe("E2E - Fluxo de Autenticação e Navegação", () => {
  test("Redirecionamento de Rota Protegida para Login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("/login");

    await expect(page.locator("h1")).toContainText("Report Builder");
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  test("Validação Local de Senha Curta na Tela de Cadastro", async ({ page }) => {
    await page.goto("/register");
    await page.fill("#register-name", "Maria Silva");
    await page.fill("#register-email", "maria@exemplo.com");
    await page.fill("#register-password", "123");
    await page.click("button[type='submit']");

    await expect(page.locator(".alert-danger")).toBeVisible();
    await expect(page.locator(".alert-danger")).toContainText("A senha deve conter no mínimo 8 caracteres.");
  });

  test("Fluxo Completo de Autenticação e Navegação no Dashboard", async ({ page }) => {
    // Mock da API para simular login e consulta /me com sucesso
    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          tokenType: "Bearer",
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
          userId: "11111111-2222-3333-4444-555555555555",
          email: "maria@example.com",
          globalRole: "root",
        }),
      });
    });

    await page.route("**/api/v1/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "11111111-2222-3333-4444-555555555555",
          name: "Maria Silva",
          email: "maria@example.com",
          globalRole: "root",
          profileIds: ["prof-admin"],
          organizations: [
            {
              id: "org-uuid-brasil",
              name: "Operação Brasil",
              organizationRole: "administrator",
            },
          ],
        }),
      });
    });

    await page.goto("/login");
    await page.fill("#login-email", "maria@example.com");
    await page.fill("#login-password", "uma-senha-segura");
    await page.click("button[type='submit']");

    // Deve redirecionar para o Dashboard e carregar os dados
    await page.waitForURL("/dashboard");
    await expect(page.locator("h1")).toContainText("Painel do Usuário");
    await expect(page.getByText("Maria Silva")).toBeVisible();
    await expect(page.getByText("root")).toBeVisible();
    await expect(page.getByText("Operação Brasil")).toBeVisible();
  });
});

test.describe("E2E - Gestão de Organizações, Membros e Convites", () => {
  test.beforeEach(async ({ page }) => {
    // Autenticar como root via mock
    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          tokenType: "Bearer",
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
          userId: "root-user-id",
          email: "root@example.com",
          globalRole: "root",
        }),
      });
    });

    await page.route("**/api/v1/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "root-user-id",
          name: "Administrador Root",
          email: "root@example.com",
          globalRole: "root",
          profileIds: [],
          organizations: [{ id: "org-1", name: "Operação Brasil", organizationRole: "administrator" }],
        }),
      });
    });
  });

  test("Listagem e Ações na Página de Organizações", async ({ page }) => {
    await page.route("**/api/v1/organizations", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            { id: "org-1", name: "Operação Brasil", description: "Relatórios da operação brasileira" },
          ]),
        });
      }
    });

    // Simular que já existe um refreshToken no localStorage
    await page.addInitScript(() => {
      localStorage.setItem(
        "report-builder.session.v1",
        JSON.stringify({ refreshToken: "mock-refresh-token" })
      );
    });

    await page.goto("/organizations");
    await expect(page.locator("h1")).toContainText("Organizações");
    await expect(page.getByRole("heading", { name: "Operação Brasil" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nova Organização" })).toBeVisible();
  });

  test("Fluxo de Geração de Convite Pendente e Modal de Sucesso com Token", async ({ page }) => {
    await page.route("**/api/v1/organizations/org-1/members", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "user-1",
            name: "João Santos",
            email: "joao@example.com",
            globalRole: "viewer",
            organizationRole: "viewer",
            canCurrentUserManageRole: true,
          },
        ]),
      });
    });

    await page.route("**/api/v1/organizations/org-1/invitations", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "invitation-123",
            organizationId: "org-1",
            organizationName: "Operação Brasil",
            email: "novo.convidado@exemplo.com",
            organizationRole: "creator",
            status: "pending",
            invitedByUserId: "root-user-id",
            expiresAt: new Date(Date.now() + 7 * 86400_000).toISOString(),
            acceptedAt: null,
            acceptedByUserId: null,
            acceptanceToken: "token-secreto-convite-999",
            acceptanceUrl: "/invitations/accept?token=token-secreto-convite-999",
          }),
        });
      }
    });

    await page.addInitScript(() => {
      localStorage.setItem(
        "report-builder.session.v1",
        JSON.stringify({ refreshToken: "mock-refresh-token" })
      );
    });

    await page.goto("/organizations/org-1/members");
    await expect(page.locator("h1")).toContainText("Membros da Organização");

    // Abrir modal de adição de membro
    await page.click("button:has-text('Adicionar / Convidar Membro')");
    await expect(page.getByText("Adicionar ou Convidar Membro")).toBeVisible();

    // Preencher e-mail e enviar
    await page.fill("#member-email", "novo.convidado@exemplo.com");
    await page.click("button[type='submit']");

    // Deve abrir o Modal de Sucesso com o token de aceite
    await expect(page.getByText("Convite Pendente Gerado!")).toBeVisible();
    await expect(page.getByText("token-secreto-convite-999")).toBeVisible();
    await expect(page.getByRole("button", { name: "Copiar" })).toBeVisible();
  });
});
