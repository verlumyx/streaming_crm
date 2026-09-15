import { expect, test } from '@playwright/test';
import { openDefaultCompany, unique } from './helpers';

const submit = (page: import('@playwright/test').Page) => page.locator('form button[type="submit"]').first().click();

test('create, view and edit a streaming service', async ({ page }) => {
  const companyId = await openDefaultCompany(page);
  const name = unique('Servicio E2E');

  await page.goto(`/${companyId}/services/create`);
  await page.locator('#name').fill(name);
  await page.locator('#max-profiles').fill('3');
  await submit(page);
  await expect(page.getByText('Servicio creado correctamente.')).toBeVisible();

  await page.goto(`/${companyId}/services?name=${encodeURIComponent(name)}`);
  await page.getByText(name, { exact: true }).first().click();
  await expect(page.getByRole('heading', { name })).toBeVisible();

  await page.getByRole('link', { name: 'Editar' }).click();
  await page.locator('#name').fill(`${name} editado`);
  await submit(page);
  await expect(page.getByText('Servicio actualizado correctamente.')).toBeVisible();
  await expect(page.getByRole('heading', { name: `${name} editado` })).toBeVisible();
});

test('create a plan on top of a service', async ({ page }) => {
  const companyId = await openDefaultCompany(page);
  const name = unique('Plan E2E');

  await page.goto(`/${companyId}/plans/create`);
  await page.locator('#service-id').click();
  await page.getByRole('option').first().click();
  await page.locator('#name').fill(name);
  await page.locator('#duration-days').fill('30');
  await page.locator('#sale-price').fill('12');
  await page.locator('#roi-target-pct').fill('25');
  await submit(page);

  await expect(page.getByText('Plan creado correctamente.')).toBeVisible();
  await page.goto(`/${companyId}/plans?name=${encodeURIComponent(name)}`);
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
});
