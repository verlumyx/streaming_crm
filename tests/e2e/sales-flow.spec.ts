import { expect, test, type Page } from '@playwright/test';
import { openDefaultCompany, unique } from './helpers';

test.setTimeout(240_000);

const submitForm = (page: Page) => page.locator('form button[type="submit"]').first().click();

async function fillCurrency(page: Page, selector: string, value: string) {
  const input = page.locator(selector);
  await input.click();
  await input.fill(value);
  await input.blur();
}

test('sell a profile with the wizard, renew, expel with a refund and reactivate', async ({ page }) => {
  const companyId = await openDefaultCompany(page);
  const clientName = unique('Cliente Venta E2E');
  const planName = unique('Plan Venta E2E');
  const accountEmail = `${unique('venta').split(' ').pop()}@e2e.test`;

  // --- Prerequisites through the UI: client, plan and account on Netflix ---
  await page.goto(`/${companyId}/clients/create`);
  await page.locator('#name').fill(clientName);
  await page.locator('#phone-number').fill('4121234567');
  await submitForm(page);
  await expect(page.getByText('Cliente creado correctamente.')).toBeVisible();

  await page.goto(`/${companyId}/plans/create`);
  await page.locator('#service-id').click();
  // Plan options read "Netflix (SER000001)".
  await page.getByRole('option', { name: /^Netflix \(SER\d+\)$/ }).click();
  await page.locator('#name').fill(planName);
  await page.locator('#capacity').click();
  await page.getByRole('option', { name: 'Perfil', exact: true }).click();
  await page.locator('#duration-days').click();
  await page.getByRole('option', { name: '30 días', exact: true }).click();
  await fillCurrency(page, '#sale-price', '12');
  await page.locator('#roi-target-pct').fill('25');
  await submitForm(page);
  await expect(page.getByText('Plan creado correctamente.')).toBeVisible();

  await page.goto(`/${companyId}/accounts/create`);
  await page.locator('#serviceId').click();
  // Account options read "Netflix (SER000001) · 5 perfiles".
  await page.getByRole('option', { name: /^Netflix \(SER\d+\)/ }).click();
  await expect(page.getByLabel(/PIN del perfil \d+/)).toHaveCount(5);
  await page.locator('#email').fill(accountEmail);
  await page.locator('#password').fill('Secreta-Venta-1');
  await fillCurrency(page, '#cost', '20');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByText('Cuenta creada correctamente.')).toBeVisible();

  // --- Wizard ---
  await page.goto(`/${companyId}/sales/create`);
  await page.locator('#client-search').fill(clientName);
  await page.getByRole('button', { name: new RegExp(clientName) }).first().click();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.locator('#start-date')).not.toHaveValue('');
  await page.getByRole('button', { name: new RegExp(planName) }).first().click();
  await page.getByRole('button', { name: 'Continuar' }).click();

  const accountGroup = page.getByText(accountEmail, { exact: true }).locator('xpath=ancestor::*[.//button[@aria-pressed]][1]');
  await accountGroup.getByRole('button', { name: 'Perfil 1', exact: true }).click();
  await expect(accountGroup.getByRole('button', { name: 'Perfil 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Registrar venta' }).click();

  await expect(page).toHaveURL(new RegExp(`/${companyId}/sales/[0-9a-f-]{36}$`), { timeout: 30_000 });
  await expect(page.getByText('Venta registrada correctamente.')).toBeVisible();
  await expect(page.getByText(clientName).first()).toBeVisible();
  await expect(page.getByText('Activa').first()).toBeVisible();
  await expect(page.getByText(accountEmail).first()).toBeVisible();

  // --- Renew ---
  await page.getByRole('button', { name: 'Renovar' }).first().click();
  let dialog = page.getByRole('dialog');
  await expect(dialog.locator('#renew-duration')).toBeVisible();
  await dialog.locator('button[type="submit"]').click();
  await expect(page.getByText('Renovación registrada correctamente.')).toBeVisible();

  // --- Expel with a pending refund ---
  await page.getByRole('button', { name: 'Expulsar' }).first().click();
  dialog = page.getByRole('dialog');
  await dialog.locator('#cancel-reason').fill('Cliente pidió la baja (e2e)');
  await dialog.getByRole('checkbox').click();
  await expect(dialog.locator('#refund-amount')).toBeVisible();
  await dialog.locator('button[type="submit"]').click();
  await expect(page.getByText('Venta expulsada correctamente.')).toBeVisible();
  await expect(page.getByText('Expulsada').first()).toBeVisible();

  // --- Reactivate (the original profile was freed on expel, so no conflict) ---
  await page.getByRole('button', { name: 'Reactivar' }).first().click();
  dialog = page.getByRole('dialog');
  await expect(dialog.locator('#reactivate-duration')).toBeVisible();
  await dialog.locator('button[type="submit"]').click();
  await expect(page.getByText('Venta reactivada correctamente.')).toBeVisible();
  await expect(page.getByText('Activa').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reactivar' })).toHaveCount(0);

  // --- Several profiles of a "Perfil" plan: one sale per profile ---
  await page.goto(`/${companyId}/sales/create`);
  await page.locator('#client-search').fill(clientName);
  await page
    .getByRole('button', { name: new RegExp(clientName) })
    .first()
    .click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page
    .getByRole('button', { name: new RegExp(planName) })
    .first()
    .click();
  await page.getByRole('button', { name: 'Continuar' }).click();

  const group = page
    .getByText(accountEmail, { exact: true })
    .locator('xpath=ancestor::*[.//button[@aria-pressed]][1]');
  await group.getByRole('button', { name: 'Perfil 2', exact: true }).click();
  await group.getByRole('button', { name: 'Perfil 3', exact: true }).click();
  await expect(page.getByText('2 ventas · $24')).toBeVisible();
  await page.getByRole('button', { name: 'Registrar 2 ventas' }).click();

  await expect(page).toHaveURL(new RegExp(`/${companyId}/sales\\?clientId=`), { timeout: 30_000 });
  await expect(page.getByText('2 ventas registradas correctamente.')).toBeVisible();
});
