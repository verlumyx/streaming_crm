import { expect, test } from '@playwright/test';
import { openDefaultCompany, unique } from './helpers';

test('register a manual transaction with two lines and approve it', async ({ page }) => {
  const companyId = await openDefaultCompany(page);
  const description = unique('Cierre de caja E2E');

  await page.goto(`/${companyId}/manual-transactions/create`);
  await page.locator('#description').fill(description);

  const rows = page.locator('form .grid.rounded-\\[10px\\]');
  await page.getByRole('button', { name: 'Agregar línea' }).click();
  await expect(rows).toHaveCount(2);

  for (const [index, category, amount] of [
    [0, 'Aporte de socio', '100'],
    [1, 'Salario', '40'],
  ] as const) {
    const row = rows.nth(index);
    await row.getByRole('combobox').click();
    await page.getByRole('option', { name: category }).click();
    const amountInput = row.locator('input').first();
    await amountInput.click();
    await amountInput.fill(amount);
    await amountInput.blur();
  }

  await expect(page.getByText('140,00')).toBeVisible();
  await page.getByRole('button', { name: 'Guardar' }).click();

  await expect(page).toHaveURL(new RegExp(`/${companyId}/manual-transactions/[0-9a-f-]{36}$`));
  await expect(page.getByText('Transacción manual registrada correctamente.')).toBeVisible();
  await expect(page.getByText('Pendiente').first()).toBeVisible();

  await page.getByRole('button', { name: 'Aprobar' }).click();
  await expect(page.getByText('Transacción manual aprobada correctamente.')).toBeVisible();
  await expect(page.getByText('Aprobado').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aprobar' })).toHaveCount(0);
});

test('saving without a category shows the line error', async ({ page }) => {
  const companyId = await openDefaultCompany(page);
  await page.goto(`/${companyId}/manual-transactions/create`);
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('La categoría de la línea es obligatoria.')).toBeVisible();
});
