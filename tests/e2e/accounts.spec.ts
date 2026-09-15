import { expect, test } from '@playwright/test';
import { openDefaultCompany, unique } from './helpers';

test('create a streaming account, reveal its credentials and register a renewal', async ({ page }) => {
  const companyId = await openDefaultCompany(page);
  const email = `${unique('cuenta').split(' ').pop()}@e2e.test`;
  const password = 'Secreta-E2E-42';

  await page.goto(`/${companyId}/accounts/create`);
  await page.locator('#serviceId').click();
  await page.getByRole('option', { name: 'Netflix' }).click();

  // Netflix allows 5 profiles: the rows are generated from the service.
  await expect(page.getByLabel(/PIN del perfil \d+/)).toHaveCount(5);
  await page.getByLabel('PIN del perfil 1').fill('1234');

  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  const cost = page.locator('#cost');
  await cost.click();
  await cost.fill('20');
  await cost.blur();
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page.getByText('Cuenta creada correctamente.')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/${companyId}/accounts/[0-9a-f-]{36}$`));
  await expect(page.getByText(email).first()).toBeVisible();
  await expect(page.getByText(password)).toHaveCount(0);

  await page.getByRole('button', { name: 'Ver credenciales' }).click();
  await expect(page.getByText(password)).toBeVisible();
  await page.getByRole('button', { name: 'Ocultar' }).click();
  await expect(page.getByText(password)).toHaveCount(0);

  await page.getByRole('button', { name: 'Registrar renovación' }).first().click();
  const dialog = page.getByRole('dialog');
  const amount = dialog.locator('#renew-amount');
  await amount.click();
  await amount.fill('25');
  await amount.blur();
  await dialog.locator('button[type="submit"]').click();

  await expect(page.getByText('Renovación registrada correctamente.')).toBeVisible();
});
