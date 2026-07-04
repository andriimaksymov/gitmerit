import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/GitMerit/);
  });

  test('displays main headline', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /how strong your developer profile is/i })
    ).toBeVisible();
  });

  test('navigation works', async ({ page }) => {
    await page.getByRole('link', { name: 'How it works' }).click();
    await expect(page.locator('#how-it-works')).toBeVisible();
  });
});
