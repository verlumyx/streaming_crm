import { expect, test, type Page } from '@playwright/test';
import { openDefaultCompany, unique } from './helpers';
import { createSaleFixture, type SaleFixture } from './fixtures/sale-fixture';

const EMPTY_LEDGER = 'Sin transacciones asociadas. El egreso se registra al aprobar el reembolso.';

/** Registers a refund for the fixture sale from the create form and lands on its detail page. */
async function createRefundFromUi(page: Page, companyId: string, sale: SaleFixture, reason: string) {
  await page.goto(`/${companyId}/refunds/create`);
  await page.locator('#saleId').click();
  await page.getByPlaceholder('Buscar por código o cliente...').fill(sale.saleCode);
  await page.getByRole('option', { name: new RegExp(sale.saleCode) }).click();

  // Selecting the sale pre-fills the amount with its price.
  await expect(page.locator('#amount')).toHaveValue(`${sale.price},00`);
  await page.locator('#reason').fill(reason);
  await page.getByRole('button', { name: 'Guardar' }).click();

  await expect(page).toHaveURL(new RegExp(`/${companyId}/refunds/[0-9a-f-]{36}$`));
  await expect(page.getByText('Reembolso registrado correctamente.')).toBeVisible();
  await expect(page.getByText('Pendiente', { exact: true })).toBeVisible();
  await expect(page.getByText(EMPTY_LEDGER)).toBeVisible();
}

test('create a refund for a sale, approve it and see the expense and the expelled sale', async ({ page }) => {
  const companyId = await openDefaultCompany(page);
  const sale = await createSaleFixture(companyId, { clientName: unique('Cliente Reembolso'), price: 15 });

  await createRefundFromUi(page, companyId, sale, 'Cliente insatisfecho E2E');

  await page.getByRole('button', { name: 'Aprobar' }).click();
  await expect(page.getByText('Reembolso aprobado correctamente.')).toBeVisible();
  await expect(page.getByText('Aprobado', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aprobar' })).toHaveCount(0);
  await expect(page.getByText(`Reembolso venta ${sale.saleCode} a ${sale.clientName}`)).toBeVisible();
  await expect(page.getByText('-$15', { exact: true })).toBeVisible();
  await expect(page.getByText(EMPTY_LEDGER)).toHaveCount(0);

  await page.goto(`/${companyId}/refunds?saleId=${sale.saleId}`);
  await expect(page.getByText(sale.clientName)).toHaveCount(1);
  await expect(page.getByText('Aprobado', { exact: true })).toBeVisible();

  await page.getByText(sale.clientName).click();
  await page.getByRole('link', { name: `Venta ${sale.saleCode}` }).click();
  await expect(page).toHaveURL(new RegExp(`/${companyId}/sales/${sale.saleId}$`));
  await expect(page.getByText('Expulsada', { exact: true })).toBeVisible();
});

test('edit a pending refund inline and reject it', async ({ page }) => {
  const companyId = await openDefaultCompany(page);
  const sale = await createSaleFixture(companyId, { clientName: unique('Cliente Rechazo'), price: 20 });

  await createRefundFromUi(page, companyId, sale, 'Motivo inicial E2E');

  await page.getByRole('button', { name: 'Editar' }).click();
  await expect(page.getByText('Editar reembolso')).toBeVisible();
  const amount = page.locator('#amount');
  await amount.click();
  await amount.fill('12');
  await amount.blur();
  await page.locator('#reason').fill('Motivo editado E2E');
  await page.getByRole('button', { name: 'Guardar' }).click();

  await expect(page.getByText('Reembolso actualizado correctamente.')).toBeVisible();
  await expect(page.getByText('Editar reembolso')).toHaveCount(0);
  await expect(page.getByText('$12', { exact: true })).toBeVisible();
  await expect(page.getByText('Motivo editado E2E')).toBeVisible();

  await page.getByRole('button', { name: 'Rechazar' }).click();
  await expect(page.getByText('Reembolso rechazado correctamente.')).toBeVisible();
  await expect(page.getByText('Rechazado', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rechazar' })).toHaveCount(0);
  await expect(page.getByText(EMPTY_LEDGER)).toBeVisible();

  await page.getByRole('link', { name: `Venta ${sale.saleCode}` }).click();
  await expect(page.getByText('Activa', { exact: true })).toBeVisible();
});
