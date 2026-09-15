import { expect, test } from '@playwright/test';
import { openDefaultCompany } from './helpers';

test('expirations report shows the summary after Buscar and keeps the filters in the URL', async ({ page }) => {
  const companyId = await openDefaultCompany(page);

  await page.goto(`/${companyId}/reports/expirations`);
  await expect(page.getByText('Aplica los filtros y presiona Buscar para ver los vencimientos.')).toBeVisible();

  await page.locator('#filter-status').click();
  await page.getByRole('option', { name: 'Todas' }).click();
  await page.locator('#filter-days').click();
  await page.getByRole('option', { name: '30 días' }).click();
  await page.getByRole('button', { name: 'Buscar' }).click();

  await expect(page).toHaveURL(/status=all/);
  await expect(page).toHaveURL(/days=30/);
  for (const title of ['Por vencer', 'Vencidas', 'Por cobrar', 'Tasa de renovación']) {
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
  }
});
