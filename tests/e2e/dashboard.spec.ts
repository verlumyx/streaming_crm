import { expect, test } from '@playwright/test';
import { openDefaultCompany } from './helpers';

test('the dashboard streams its blocks and the sidebar shows the menu', async ({ page }) => {
  await openDefaultCompany(page);

  for (const text of ['Ingresos del mes', 'Ganancia neta', 'Ingresos vs. costo', 'Ocupación de perfiles', 'Próximos vencimientos', 'Perfiles por plataforma']) {
    await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'Clientes' }).first()).toBeVisible();
});
