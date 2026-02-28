import { test, expect } from '@playwright/test';
import { setupTestData, teardownTestData, setupAdmin, TEST_PASS } from '../fixtures/pb-setup';

let testData: any;
let adminPb: any;

test.beforeAll(async () => {
    adminPb = await setupAdmin();
    testData = await setupTestData();
});

test.afterAll(async () => {
    if (adminPb) {
        await teardownTestData(adminPb);
    }
});

test.describe('Coach to Athlete Flow', () => {

    test('Coach logs in and publishes all drafts for a phase', async ({ browser }) => {
        // Create an isolated context for the coach
        const coachContext = await browser.newContext();
        const page = await coachContext.newPage();

        // 1. Go to Login
        await page.goto('/ru/auth/login');

        // 2. Fill login form
        await page.locator('#login-email').fill(testData.coachEmail);
        await page.locator('#login-password').fill(TEST_PASS);
        await page.locator('button[type="submit"]').click();

        // 3. Wait for dashboard and navigate to the Season
        await page.waitForURL('**/dashboard');

        // Go to season detail (assuming the season card has the season name)
        await page.getByText('E2E Test Season').click();
        await page.waitForURL(`**/seasons/${testData.season.id}`);

        // 4. Click 'Publish All Drafts' button in the Phase
        // Look for the "Send" icon or publish button
        const publishButton = page.getByRole('button', { name: /publish|опубликовать/i });
        await expect(publishButton).toBeVisible();
        await publishButton.click();

        // 5. Confirm publish
        const confirmButton = page.getByRole('button', { name: /confirm|подтвердить|да/i });
        if (await confirmButton.isVisible()) {
            await confirmButton.click();
        }

        // 6. Verify assignment creation via API (Instant, not flaky)
        await page.waitForTimeout(1000); // Give PB a moment
        const assignments = await adminPb.collection('plan_assignments').getFullList({
            filter: `plan_id = '${testData.plan.id}' && athlete_id = '${testData.athleteRecord.id}'`
        });

        expect(assignments.length).toBe(1);
        expect(assignments[0].status).toBe('active');

        await coachContext.close();
    });

    test('Athlete sees published plan and completes Focus Mode', async ({ browser }) => {
        // This test runs after the coach publishes the plan
        test.setTimeout(45000); // Give it a bit more time for the focus mode flow

        // Create an isolated context for the athlete
        const athleteContext = await browser.newContext();
        const page = await athleteContext.newPage();

        // 1. Go to Login
        await page.goto('/ru/auth/login');

        // 2. Fill login form
        await page.locator('#login-email').fill(testData.athleteEmail);
        await page.locator('#login-password').fill(TEST_PASS);
        await page.locator('button[type="submit"]').click();

        // 3. Navigate to Training mode (assuming dashboard routes to athlete training)
        await page.waitForURL('**/training*');

        // 4. Start Focus Mode
        const startButton = page.getByRole('button', { name: /старт|начат|start/i });
        await expect(startButton).toBeVisible();
        await startButton.click();

        // 5. In Focus Mode: finish exercise (mark done or skip)
        // Wait for the focus card to appear
        const doneButton = page.getByRole('button', { name: /done|выполнено|завершить/i });

        // Sometimes custom_text exercises just have a 'Done' button.
        // If it has a logger, we can just hit Next or Done.
        if (await doneButton.isVisible()) {
            await doneButton.click();
        } else {
            // Emulate swipe or next button
            const nextButton = page.getByRole('button', { name: /next|вперед|следующее/i });
            if (await nextButton.isVisible()) {
                await nextButton.click();
            }
        }

        // 6. Wait for the API to create the training log
        await page.waitForTimeout(1500); // give it time to sync
        const logs = await adminPb.collection('training_logs').getFullList({
            filter: `athlete_id = '${testData.athleteRecord.id}' && plan_id = '${testData.plan.id}'`
        });

        // We expect at least one log
        expect(logs.length).toBeGreaterThanOrEqual(1);

        await athleteContext.close();
    });
});
