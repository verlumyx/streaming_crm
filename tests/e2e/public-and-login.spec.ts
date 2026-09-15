import { expect, test } from '@playwright/test';
import { ADMIN } from './helpers';

test.use({ storageState: { cookies: [], origins: [] } });

test('protected pages redirect guests to the login page', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});

test('the landing and contact pages are public', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/contact');
  await expect(page).toHaveURL(/\/contact/);
});

test('wrong credentials show an error and valid ones enter the company dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(ADMIN.email);
  await page.locator('input[type="password"]').first().fill('incorrecta');
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText(/credenciales/i).first()).toBeVisible();
  // A single global <Toaster />: the error toast must not be rendered twice.
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(1);
  await expect(page).toHaveURL(/\/login/);

  await page.locator('input[type="password"]').first().fill(ADMIN.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/[0-9a-f-]{36}\/dashboard/, { timeout: 30_000 });
  await expect(page.getByText('Ingresos del mes')).toBeVisible();
});
