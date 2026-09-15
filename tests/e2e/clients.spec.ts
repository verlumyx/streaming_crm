import { expect, test } from '@playwright/test';
import { openDefaultCompany, unique } from './helpers';

test('create, find, view, edit and deactivate a client', async ({ page }) => {
  const companyId = await openDefaultCompany(page);
  const name = unique('Cliente E2E');
  const email = `${name.split(' ').pop()}@e2e.test`;

  await page.goto(`/${companyId}/clients/create`);
  await page.locator('#name').fill(name);
  await page.locator('#phone-number').fill('4121234567');
  await page.locator('#email').fill(email);
  await page.getByRole('button', { name: 'Crear cliente' }).click();

  await expect(page).toHaveURL(new RegExp(`/${companyId}/clients$`));
  await expect(page.getByText('Cliente creado correctamente.')).toBeVisible();

  await page.locator('#filter-name').fill(name);
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page).toHaveURL(/name=/);
  await page.getByText(name, { exact: true }).click();

  await expect(page.getByRole('heading', { name })).toBeVisible();
  await page.getByRole('link', { name: 'Editar' }).click();
  await page.locator('#name').fill(`${name} editado`);
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('heading', { name: `${name} editado` })).toBeVisible();
  await expect(page.getByText('Cliente actualizado correctamente.')).toBeVisible();

  await page.getByRole('button', { name: 'Desactivar' }).click();
  await expect(page.getByText('Estado del cliente actualizado correctamente.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activar' })).toBeVisible();
});

test('a duplicated email shows the field error', async ({ page }) => {
  const companyId = await openDefaultCompany(page);
  const email = `${unique('dup').split(' ').pop()}@e2e.test`;

  for (const attempt of [1, 2]) {
    await page.goto(`/${companyId}/clients/create`);
    await page.locator('#name').fill(unique('Duplicado'));
    await page.locator('#email').fill(email);
    await page.getByRole('button', { name: 'Crear cliente' }).click();
    if (attempt === 1) await expect(page).toHaveURL(new RegExp(`/${companyId}/clients$`));
  }

  await expect(page.getByText('Ya existe un cliente con este correo.')).toBeVisible();
});
