import { expect, test } from '@playwright/test';
import { openDefaultCompany, unique } from './helpers';

test('the clients list paginates keeping the filters', async ({ page }) => {
  const companyId = await openDefaultCompany(page);
  const token = unique('Paginado').split(' ').pop()!;

  for (const suffix of ['A', 'B']) {
    await page.goto(`/${companyId}/clients/create`);
    await page.locator('#name').fill(`Paginado ${token} ${suffix}`);
    await page.locator('#phone-number').fill('4121234567');
    await page.locator('#email').fill(`${token}${suffix.toLowerCase()}@e2e.test`);
    await page.getByRole('button', { name: 'Crear cliente' }).click();
    await expect(page).toHaveURL(new RegExp(`/${companyId}/clients$`));
  }

  await page.goto(`/${companyId}/clients?name=${token}&limit=1`);
  const pagination = page.getByRole('navigation', { name: 'Paginación' });
  await expect(pagination.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page');
  await expect(pagination.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
  await expect(page.getByText('1 de 2 clientes')).toBeVisible();

  await pagination.getByRole('button', { name: 'Página siguiente' }).click();

  await expect(page).toHaveURL(/offset=1/);
  expect(page.url()).toContain(`name=${token}`);
  expect(page.url()).toContain('limit=1');
  await expect(pagination.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page');
  await expect(pagination.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();

  await pagination.getByRole('button', { name: 'Página 1' }).click();
  await expect(page).not.toHaveURL(/offset=/);
});

test('the page size select changes how many records are shown', async ({ page }) => {
  const companyId = await openDefaultCompany(page);
  const token = unique('Tamano').split(' ').pop()!;

  for (const suffix of ['A', 'B']) {
    await page.goto(`/${companyId}/clients/create`);
    await page.locator('#name').fill(`Tamano ${token} ${suffix}`);
    await page.locator('#phone-number').fill('4121234567');
    await page.locator('#email').fill(`${token}${suffix.toLowerCase()}@e2e.test`);
    await page.getByRole('button', { name: 'Crear cliente' }).click();
    await expect(page).toHaveURL(new RegExp(`/${companyId}/clients$`));
  }

  await page.goto(`/${companyId}/clients?name=${token}`);
  const pageSize = page.getByRole('combobox', { name: 'Registros por página' });
  await expect(pageSize).toHaveText('10');

  await page.goto(`/${companyId}/clients?name=${token}&limit=1&offset=1`);
  await expect(page.getByRole('navigation', { name: 'Paginación' })).toBeVisible();

  await pageSize.click();
  await page.getByRole('option', { name: '20' }).click();

  await expect(page).toHaveURL(/limit=20/);
  expect(page.url()).toContain(`name=${token}`);
  expect(page.url()).not.toContain('offset=');
  await expect(page.getByText('2 de 2 clientes')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Paginación' })).toHaveCount(0);

  await pageSize.click();
  await page.getByRole('option', { name: '10' }).click();
  await expect(page).not.toHaveURL(/limit=/);
  await expect(pageSize).toHaveText('10');
});

test('a list that fits in one page shows no pagination', async ({ page }) => {
  const companyId = await openDefaultCompany(page);

  await page.goto(`/${companyId}/clients?name=${unique('sin-resultados').split(' ').pop()}`);

  await expect(page.getByText('Sin resultados para tu búsqueda.')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Paginación' })).toHaveCount(0);
});
