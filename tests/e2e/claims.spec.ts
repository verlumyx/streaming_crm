import { expect, test, type Page } from '@playwright/test';
import { openDefaultCompany, unique } from './helpers';

/** Registra un cliente desde su propio formulario y devuelve su nombre. */
async function createClient(page: Page, companyId: string): Promise<string> {
  const name = unique('Cliente Reclamo');
  await page.goto(`/${companyId}/clients/create`);
  await page.locator('#name').fill(name);
  await page.locator('#phone-number').fill('4121234567');
  await page.locator('#email').fill(`${name.split(' ').pop()}@e2e.test`);
  await page.getByRole('button', { name: 'Crear cliente' }).click();
  await expect(page).toHaveURL(new RegExp(`/${companyId}/clients$`));
  return name;
}

async function selectOption(page: Page, selectId: string, optionName: string | RegExp) {
  await page.locator(`#${selectId}`).click();
  await page.getByRole('option', { name: optionName }).click();
}

test('levantar un reclamo, editarlo, resolverlo y cerrarlo', async ({ page }) => {
  const companyId = await openDefaultCompany(page);
  const clientName = await createClient(page, companyId);
  const subject = unique('No carga Netflix');

  await page.goto(`/${companyId}/claims/create`);
  await page.locator('#clientId').click();
  await page.getByPlaceholder('Buscar por código o nombre...').fill(clientName);
  await page.getByRole('option', { name: new RegExp(clientName) }).click();
  await page.locator('#subject').fill(subject);
  await selectOption(page, 'channel', 'WhatsApp');
  await page.locator('#description').fill('El perfil pide contraseña desde ayer.');
  await page.getByRole('button', { name: 'Guardar' }).click();

  await expect(page).toHaveURL(new RegExp(`/${companyId}/claims/[0-9a-f-]{36}$`));
  await expect(page.getByText('Reclamo registrado correctamente.')).toBeVisible();
  await expect(page.getByRole('heading', { name: subject })).toBeVisible();
  await expect(page.getByText('Abierto', { exact: true })).toBeVisible();
  await expect(page.getByText('El perfil pide contraseña desde ayer.')).toBeVisible();

  // Editar
  await page.getByRole('button', { name: 'Editar' }).click();
  await expect(page).toHaveURL(new RegExp(`/${companyId}/claims/[0-9a-f-]{36}/edit$`));
  await page.locator('#subject').fill(`${subject} editado`);
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Reclamo actualizado correctamente.')).toBeVisible();
  await expect(page.getByRole('heading', { name: `${subject} editado` })).toBeVisible();

  // Resolver con notas
  await selectOption(page, 'status', 'Resuelto');
  await page.locator('#resolutionNotes').fill('Se restableció la cuenta del cliente.');
  await page.getByRole('button', { name: 'Actualizar estado' }).click();
  await expect(page.getByText('Estado del reclamo actualizado correctamente.')).toBeVisible();
  await expect(page.getByText('Resuelto', { exact: true })).toBeVisible();

  // Cerrar: el reclamo queda sin acciones
  await selectOption(page, 'status', 'Cerrado');
  await page.getByRole('button', { name: 'Actualizar estado' }).click();
  await expect(page.getByText('Estado del reclamo actualizado correctamente.')).toBeVisible();
  await expect(page.getByText('Cerrado', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Actualizar estado' })).toHaveCount(0);
  await expect(page.getByText('Se restableció la cuenta del cliente.')).toBeVisible();
});

test('el listado filtra los reclamos por asunto y por estado', async ({ page }) => {
  const companyId = await openDefaultCompany(page);
  const clientName = await createClient(page, companyId);
  const subject = unique('Cobro duplicado');

  await page.goto(`/${companyId}/claims/create`);
  await page.locator('#clientId').click();
  await page.getByPlaceholder('Buscar por código o nombre...').fill(clientName);
  await page.getByRole('option', { name: new RegExp(clientName) }).click();
  await page.locator('#subject').fill(subject);
  await page.locator('#description').fill('Le cobraron dos veces el mismo plan.');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page).toHaveURL(new RegExp(`/${companyId}/claims/[0-9a-f-]{36}$`));

  await page.goto(`/${companyId}/claims`);
  await page.locator('#filter-q').fill(subject);
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page).toHaveURL(/q=/);
  await expect(page.getByText(subject, { exact: true })).toBeVisible();
  await expect(page.getByText(clientName, { exact: true })).toBeVisible();

  // Un estado sin coincidencias vacía el listado
  await selectOption(page, 'filter-status', 'Cerrado');
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page.getByText('Sin resultados para tu búsqueda.')).toBeVisible();
});
