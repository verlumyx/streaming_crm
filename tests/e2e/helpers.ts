import { expect, type Page } from '@playwright/test';

export const ADMIN = { email: 'admin@miempresa.com', password: 'password' };

/** Opens the post-login bridge and returns the company id it lands on. */
export async function openDefaultCompany(page: Page): Promise<string> {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/[0-9a-f-]{36}\/dashboard/);
  return page.url().match(/\/([0-9a-f-]{36})\/dashboard/)![1];
}

export const unique = (prefix: string) => `${prefix} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
