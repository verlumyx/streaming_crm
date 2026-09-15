import { expect, test } from '@playwright/test';
import { openDefaultCompany, unique } from './helpers';

test('the system owner creates a company that comes with the streaming catalog, then restores the default company', async ({ page }) => {
  const companyId = await openDefaultCompany(page);
  const name = unique('Empresa E2E');

  await page.goto(`/${companyId}/companies/create`);
  await page.locator('#name').fill(name);
  await page.locator('#description').fill('Creada por la suite e2e');
  await page.locator('form button[type="submit"]').first().click();
  await expect(page.getByText('Empresa creada correctamente.')).toBeVisible();

  // The creator becomes a member (Administrador, default) of the new company: switch to it through the header.
  await page.getByRole('button', { name: /Mi Empresa|Empresa/ }).first().click();
  await page.getByRole('menuitem', { name }).click();
  await expect(page).toHaveURL(/\/[0-9a-f-]{36}\/dashboard/);
  const newCompanyId = page.url().match(/\/([0-9a-f-]{36})\/dashboard/)![1];
  expect(newCompanyId).not.toBe(companyId);

  await page.goto(`/${newCompanyId}/services`);
  for (const service of ['Netflix', 'Disney+', 'Spotify']) {
    await expect(page.getByText(service, { exact: true }).first()).toBeVisible();
  }

  // Restore "Mi Empresa" as the admin's default so the environment is left as it was.
  await page.goto(`/${newCompanyId}/settings/company`);
  const row = page.getByText('Mi Empresa', { exact: true }).locator('xpath=ancestor::*[.//button][1]');
  await row.getByRole('button', { name: 'Establecer como predeterminada' }).click();
  await expect(page.getByText('Empresa predeterminada actualizada.')).toBeVisible();
  expect(await openDefaultCompany(page)).toBe(companyId);
});

test('settings pages render for the current user', async ({ page }) => {
  const companyId = await openDefaultCompany(page);

  await page.goto('/settings/profile');
  await expect(page).toHaveURL(new RegExp(`/${companyId}/settings/profile`));
  await expect(page.locator('#name')).toHaveValue('Administrador');
  await expect(page.locator('#email')).toHaveValue('admin@miempresa.com');

  await page.goto(`/${companyId}/settings/password`);
  await expect(page.locator('#current_password')).toBeVisible();

  await page.goto(`/${companyId}/settings/two-factor`);
  await expect(page.getByText('Desactivada').first()).toBeVisible();

  await page.goto(`/${companyId}/settings/appearance`);
  await expect(page.getByText('Apariencia').first()).toBeVisible();
});
