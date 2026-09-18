import { expect, test } from '@playwright/test';
import { openDefaultCompany, unique } from './helpers';

/**
 * The bot console is prepared once per company and then only tuned, so this spec covers the
 * whole path: empty state → prepare → configure → the panel reflecting the new state.
 */
test('prepare the assistant and tune its configuration', async ({ page }) => {
  const companyId = await openDefaultCompany(page);
  const name = unique('Sofía');

  await page.goto(`/${companyId}/bot/settings`);

  // First visit: nothing exists yet, and loading the page must not have created anything.
  const prepare = page.getByRole('button', { name: 'Preparar asistente' });
  if (await prepare.isVisible()) {
    await prepare.click();
    await expect(page.getByText('Asistente preparado. Configúralo y actívalo cuando esté listo.')).toBeVisible();
  }

  await expect(page).toHaveURL(new RegExp(`/${companyId}/bot/settings$`));
  await page.locator('#assistantName').fill(name);
  await page.locator('#paymentInstructions').fill('Pago Móvil 0102 — 0412 1234567.');
  await page.locator('#exchangeRate').fill('240,50');
  await page.locator('#retrievalTopK').fill('7');

  const enabled = page.locator('#enabled');
  if ((await enabled.getAttribute('data-state')) !== 'checked') await enabled.click();

  await page.getByRole('button', { name: 'Guardar configuración' }).click();
  await expect(page.getByText('Configuración del asistente guardada.')).toBeVisible();
  await expect(page.locator('#assistantName')).toHaveValue(name);
  await expect(page.locator('#retrievalTopK')).toHaveValue('7');
  // The rate round-trips as a number and the console says when it was loaded.
  await expect(page.locator('#exchangeRate')).toHaveValue('240.5');
  await expect(page.getByText(/Actualizada el .*Vence a las 24 horas/)).toBeVisible();

  await page.goto(`/${companyId}/bot`);
  await expect(page.getByRole('heading', { name: 'Bot IA' })).toBeVisible();
  await expect(page.getByText(name)).toBeVisible();
  await expect(page.getByText('Respondiendo los mensajes entrantes.')).toBeVisible();
});

test('the bot console is reachable from the sidebar', async ({ page }) => {
  const companyId = await openDefaultCompany(page);

  await page.goto(`/${companyId}/dashboard`);
  // "Bot IA" groups its sections, so it is a collapsible trigger, not a link.
  await page.getByRole('button', { name: 'Bot IA' }).first().click();
  await page.getByRole('link', { name: 'Panel', exact: true }).first().click();

  await expect(page).toHaveURL(new RegExp(`/${companyId}/bot$`));
  await expect(page.getByRole('heading', { name: 'Bot IA' })).toBeVisible();
});

test('create, find, view, re-index and deactivate a knowledge document', async ({ page }) => {
  const companyId = await openDefaultCompany(page);
  const title = unique('Política E2E');

  await page.goto(`/${companyId}/bot/knowledge/create`);
  await page.locator('#title').fill(title);
  await page.locator('#content').fill('No hacemos reembolsos después de siete días de la compra.');
  await page.getByRole('button', { name: 'Crear documento' }).click();

  await expect(page).toHaveURL(new RegExp(`/${companyId}/bot/knowledge$`));
  await expect(page.getByText('Documento creado. Se indexará en unos instantes.')).toBeVisible();

  await page.locator('#filter-title').fill(title);
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page).toHaveURL(/title=/);
  await page.getByText(title, { exact: true }).click();

  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  // Nothing has embedded it yet: the worker does that, not the request.
  await expect(page.getByText('En cola')).toBeVisible();

  await page.getByRole('button', { name: 'Reindexar' }).click();
  await expect(page.getByText('Documento puesto en cola para reindexar.')).toBeVisible();

  await page.getByRole('button', { name: 'Inactivar' }).click();
  await expect(page.getByText('Estado del documento actualizado.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activar' })).toBeVisible();
});

test('connect a WhatsApp channel and see its webhook URL', async ({ page }) => {
  const companyId = await openDefaultCompany(page);
  const name = unique('Ventas E2E');
  const phoneNumberId = String(Date.now());

  await page.goto(`/${companyId}/bot/channels/create`);
  await page.locator('#displayName').fill(name);
  await page.locator('#externalId').fill(phoneNumberId);
  await page.locator('#accessToken').fill('token-de-prueba');
  await page.locator('#appSecret').fill('app-secret-de-prueba');
  await page.locator('#verifyToken').fill('verify-token-de-prueba');
  await page.getByRole('button', { name: 'Conectar canal' }).click();

  await expect(page.getByText('Canal conectado. Actívalo cuando hayas configurado el webhook.')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/${companyId}/bot/channels/[0-9a-f-]{36}/edit$`));
  // The webhook URL carries the channel id, which is what routes Meta's payload to this company.
  await expect(page.getByText(/\/api\/bot\/webhooks\/whatsapp\/[0-9a-f-]{36}/)).toBeVisible();
  // Secrets are stored, never rendered back.
  await expect(page.locator('#accessToken')).toHaveValue('');
  await expect(page.locator('#accessToken')).toHaveAttribute('placeholder', /Guardado/);

  await page.goto(`/${companyId}/bot/channels`);
  await expect(page.getByText(name)).toBeVisible();
  await expect(page.getByText(phoneNumberId)).toBeVisible();
});

test('the conversations and queue consoles load', async ({ page }) => {
  const companyId = await openDefaultCompany(page);

  await page.goto(`/${companyId}/bot/conversations`);
  await expect(page.getByRole('heading', { name: 'Conversaciones' })).toBeVisible();

  await page.goto(`/${companyId}/bot/events`);
  await expect(page.getByRole('heading', { name: 'Cola de eventos' })).toBeVisible();
  await expect(page.getByText('En cola', { exact: true }).first()).toBeVisible();
});
