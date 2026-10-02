import { test, expect } from '@playwright/test';

test('CN-00-01 Verificación de reportería', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
});