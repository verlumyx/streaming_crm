import { expect, test } from '@playwright/test';
import { openDefaultCompany, unique } from './helpers';

const submit = (page: import('@playwright/test').Page) => page.locator('form button[type="submit"]').first().click();

test('the preset streaming services can only be listed and viewed', async ({ page }) => {
  const companyId = await openDefaultCompany(page);

  await page.goto(`/${companyId}/services`);
  await expect(page.getByRole('button', { name: 'Nuevo servicio' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Ver' }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Editar' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Activar|Desactivar/ })).toHaveCount(0);

  const createResponse = await page.goto(`/${companyId}/services/create`);
  expect(createResponse?.status()).toBe(404);
});

test('create a plan on top of a service', async ({ page }) => {
  const companyId = await openDefaultCompany(page);
  const name = unique('Plan E2E');

  await page.goto(`/${companyId}/plans/create`);
  await page.locator('#service-id').click();
  await page.getByRole('option').first().click();
  await page.locator('#name').fill(name);
  await page.locator('#duration-days').click();
  await page.getByRole('option', { name: '15 días', exact: true }).click();
  await page.locator('#sale-price').fill('12');
  await page.locator('#roi-target-pct').fill('25');
  await submit(page);

  await expect(page.getByText('Plan creado correctamente.')).toBeVisible();
  await page.goto(`/${companyId}/plans?name=${encodeURIComponent(name)}`);
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  await expect(page.getByText('15 días').first()).toBeVisible();
});
