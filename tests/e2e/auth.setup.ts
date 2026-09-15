import { expect, test as setup } from '@playwright/test';
import { ADMIN } from './helpers';

setup('authenticate as the seeded admin', async ({ request, baseURL }) => {
  const response = await request.post('/api/auth/sign-in/email', {
    data: ADMIN,
    headers: { Origin: baseURL! },
  });
  expect(response.ok()).toBeTruthy();
  await request.storageState({ path: 'tests/e2e/.auth/admin.json' });
});
