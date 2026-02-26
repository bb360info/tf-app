import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility Checks', () => {
    test('Dashboard should be accessible', async ({ page }) => {
        // Авторизация или переход на страницу (упрощенно)
        await page.goto('/ru/dashboard');

        await injectAxe(page);

        // Проверка WCAG 2.1 Level AA
        await checkA11y(page, undefined, {
            axeOptions: {
                runOnly: {
                    type: 'tag',
                    values: ['wcag2a', 'wcag21a', 'wcag2aa', 'wcag21aa']
                }
            },
            detailedReport: true,
            detailedReportOptions: { html: true }
        });
    });
});
