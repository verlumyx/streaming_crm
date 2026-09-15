import { expect, test } from '@playwright/test';
import { openDefaultCompany, unique } from './helpers';

test('a custom role limits what a new user can see and open', async ({ page, browser, baseURL }) => {
  const companyId = await openDefaultCompany(page);
  const roleName = unique('Rol Clientes E2E');
  const email = `${unique('agente').split(' ').pop()}@e2e.test`;
  const password = 'clave-e2e-123';

  // 1. Role with only the Clientes module.
  await page.goto(`/${companyId}/roles/create`);
  await page.locator('#name').fill(roleName);
  await expect(page.getByText('Clientes', { exact: true }).first()).toBeVisible();
  await page.locator('label', { hasText: /^Clientes$/ }).first().click();
  await page.locator('form button[type="submit"]').first().click();
  await expect(page.getByText('Rol creado correctamente.')).toBeVisible();

  // 2. New user with that role (2-step flow).
  await page.goto(`/${companyId}/users/create`);
  await page.locator('#check-email').fill(email);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.locator('#name').fill('Agente E2E');
  await page.locator('#password').fill(password);
  await page.locator('#passwordConfirmation').fill(password);
  await page.locator('#roleId').click();
  await page.getByRole('option', { name: roleName }).click();
  await page.locator('form button[type="submit"]').first().click();
  await expect(page.getByText('Usuario creado correctamente.')).toBeVisible();

  // 3. Sign in as the new user in a clean browser context.
  const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  const agent = await context.newPage();
  await agent.goto('/login');
  await agent.locator('input[type="email"]').fill(email);
  await agent.locator('input[type="password"]').first().fill(password);
  await agent.locator('button[type="submit"]').click();
  await expect(agent).toHaveURL(new RegExp(`/${companyId}/dashboard`), { timeout: 30_000 });

  const sidebar = agent.locator('[data-sidebar="sidebar"]').first();
  await expect(sidebar.getByRole('link', { name: 'Clientes' })).toBeVisible();
  for (const hidden of ['Usuarios', 'Roles', 'Cuentas', 'Ventas', 'Empresas']) {
    await expect(sidebar.getByRole('link', { name: hidden })).toHaveCount(0);
  }

  await agent.goto(`/${companyId}/clients`);
  await expect(agent.getByRole('heading', { name: 'Clientes' })).toBeVisible();

  await agent.goto(`/${companyId}/users`);
  await expect(agent).toHaveURL(new RegExp(`/${companyId}/dashboard\\?error=forbidden`));
  await expect(agent.getByText('No tienes permiso para acceder a esta sección.')).toBeVisible();

  await context.close();
});
