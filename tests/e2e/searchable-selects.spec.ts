import { expect, test } from '@playwright/test';
import { openDefaultCompany } from './helpers';

test('list filters use the searchable select and apply the chosen option', async ({ page }) => {
  const companyId = await openDefaultCompany(page);

  await page.goto(`/${companyId}/plans`);
  await page.locator('#filter-capacity').click();
  await page.getByPlaceholder('Buscar...').fill('completa');
  await expect(page.getByRole('option')).toHaveCount(1);
  await page.getByRole('option', { name: 'Cuenta completa' }).click();

  await expect(page).toHaveURL(/capacity=full_account/);
  await expect(page.locator('#filter-capacity')).toHaveText('Cuenta completa');
});

test('grouped options keep their headings and can be searched', async ({ page }) => {
  const companyId = await openDefaultCompany(page);

  await page.goto(`/${companyId}/manual-transactions/create`);
  await page.getByRole('combobox', { name: 'Categoría' }).click();
  await expect(page.locator('[cmdk-group-heading]')).toHaveText(['Ingresos', 'Egresos']);

  await page.getByPlaceholder('Buscar categoría...').fill('Salario');
  await expect(page.getByRole('option')).toHaveCount(1);
  await page.getByRole('option', { name: 'Salario' }).click();
  await expect(page.getByRole('combobox', { name: 'Categoría' })).toHaveText('Salario');
});

test('the phone prefix of the client form is a searchable select', async ({ page }) => {
  const companyId = await openDefaultCompany(page);

  await page.goto(`/${companyId}/clients/create`);
  const prefix = page.getByRole('combobox', { name: 'Prefijo de país' });
  await expect(prefix).toHaveText('Venezuela (+58)');

  await prefix.click();
  await page.getByPlaceholder('Buscar país...').fill('Chile');
  await page.getByRole('option', { name: 'Chile (+56)' }).click();
  await expect(prefix).toHaveText('Chile (+56)');
});
