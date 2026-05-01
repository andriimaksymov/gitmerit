import { test, expect } from '@playwright/test';

test.describe('Analysis Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('validates input requirement', async ({ page }) => {
        const runButton = page.getByRole('button', { name: 'Analyze Profile' });
        await expect(runButton).toBeDisabled();

        await page.getByPlaceholder('e.g., octocat or https://github.com/octocat').fill('octocat');
        await expect(runButton).toBeEnabled();
    });

    test('switches tabs', async ({ page }) => {
        await page.getByRole('button').filter({ hasText: 'LinkedIn Profile' }).click();
        await expect(page.getByPlaceholder('e.g., https://linkedin.com/in/your-profile')).toBeVisible();

        await page.getByRole('button').filter({ hasText: 'Resume / CV' }).click();
        await expect(page.getByText('Click to upload or drag and drop')).toBeVisible();
    });
});
