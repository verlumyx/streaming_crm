import { expect, test } from '@playwright/test';
import { openDefaultCompany } from './helpers';

test('movements report queries only after Buscar and filters by type', async ({ page }) => {
  const companyId = await openDefaultCompany(page);

  await page.goto(`/${companyId}/reports/movements`);
  await expect(page.getByText('Aplica los filtros y presiona Buscar para ver los movimientos.')).toBeVisible();

  await page.locator('#filter-type').click();
  await page.getByRole('option', { name: 'Egreso' }).click();
  await page.getByRole('button', { name: 'Buscar' }).click();

  await expect(page).toHaveURL(/searched=1/);
  await expect(page).toHaveURL(/type=expense/);
  await expect(page.getByText('Aplica los filtros y presiona Buscar para ver los movimientos.')).toHaveCount(0);
  // Only expense rows (or the empty-result message) are shown.
  await expect(page.locator('tbody').getByText('Ingreso', { exact: true })).toHaveCount(0);
});

test('income-expenses report shows the summary cards for the default month', async ({ page }) => {
  const companyId = await openDefaultCompany(page);

  await page.goto(`/${companyId}/reports/income-expenses`);
  await expect(page.locator('#filter-date-from')).not.toHaveValue('');
  await page.getByRole('button', { name: 'Buscar' }).click();

  await expect(page).toHaveURL(/searched=1/);
  for (const title of ['Ingresos', 'Gastos', 'Balance']) {
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
  }
});

test('service-plan report can be grouped by plan', async ({ page }) => {
  const companyId = await openDefaultCompany(page);

  await page.goto(`/${companyId}/reports/service-plan`);
  await page.locator('#filter-group-by').click();
  await page.getByRole('option', { name: 'Plan' }).click();
  await page.getByRole('button', { name: 'Buscar' }).click();

  await expect(page).toHaveURL(/groupBy=plan/);
  await expect(page.getByText('Plan top')).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Precio plan' })).toBeVisible();
});
