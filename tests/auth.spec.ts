import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('should login as coach and redirect to dashboard', async ({ page }) => {
        // В Jumpedia используется next-intl, поэтому базовый путь может включать локаль
        await page.goto('/ru/onboarding'); // или начальная страница выбора роли

        // Ожидаем загрузки страницы
        await expect(page).toHaveTitle(/Jumpedia/i);

        // Пример сценария (нужно адаптировать под реальные селекторы Jumpedia)
        // 1. Выбор роли (если нужно)
        const coachButton = page.locator('button:has-text("Тренер")').first();
        if (await coachButton.isVisible()) {
            await coachButton.click();
        }

        // 2. Ввод данных (используем демо-данные из switch-agent.md)
        // demo.coach@jumpedia.app / Demo2026!

        // Ждем появления формы или модалки
        // await page.fill('input[type="email"]', 'demo.coach@jumpedia.app');
        // await page.fill('input[type="password"]', 'Demo2026!');
        // await page.click('button[type="submit"]');

        // 3. Проверка редиректа
        // await expect(page).toHaveURL(/.*dashboard/);
    });
});
