import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

export const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090');

export async function setupAdmin() {
    await pb.collection('_superusers').authWithPassword(
        process.env.PB_ADMIN_EMAIL || '',
        process.env.PB_ADMIN_PASSWORD || ''
    );
    return pb;
}

export const TEST_PASS = 'TestPass123!';

async function safeDelete(adminPb: PocketBase, collection: string, id: string) {
    try {
        await adminPb.collection(collection).delete(id);
    } catch (e: any) {
        if (e.status !== 404) {
            console.warn(`[SafeDelete] Non-404 error deleting ${collection}/${id}:`, e.message);
        }
    }
}

export async function teardownTestData(adminPb: PocketBase, coachEmail: string, athleteEmail: string) {
    try {
        const users = await adminPb.collection('users').getFullList({
            filter: `email = '${coachEmail}' || email = '${athleteEmail}'`
        });

        for (const user of users) {
            if (user.role === 'coach') {
                const seasons = await adminPb.collection('seasons').getFullList({ filter: `coach_id = '${user.id}'` });
                for (const s of seasons) {
                    const comps = await adminPb.collection('competitions').getFullList({ filter: `season_id = '${s.id}'` });
                    for (const c of comps) await safeDelete(adminPb, 'competitions', c.id);

                    const phases = await adminPb.collection('training_phases').getFullList({ filter: `season_id = '${s.id}'` });
                    for (const ph of phases) {
                        const plans = await adminPb.collection('training_plans').getFullList({ filter: `phase_id = '${ph.id}'` });
                        for (const pl of plans) {
                            const ex = await adminPb.collection('plan_exercises').getFullList({ filter: `plan_id = '${pl.id}'` });
                            for (const e of ex) await safeDelete(adminPb, 'plan_exercises', e.id);

                            const assigns = await adminPb.collection('plan_assignments').getFullList({ filter: `plan_id = '${pl.id}'` });
                            for (const a of assigns) await safeDelete(adminPb, 'plan_assignments', a.id);

                            const logs = await adminPb.collection('training_logs').getFullList({ filter: `plan_id = '${pl.id}'` });
                            for (const l of logs) {
                                const logEx = await adminPb.collection('log_exercises').getFullList({ filter: `log_id = '${l.id}'` });
                                for (const le of logEx) await safeDelete(adminPb, 'log_exercises', le.id);
                                await safeDelete(adminPb, 'training_logs', l.id);
                            }

                            const snaps = await adminPb.collection('plan_snapshots').getFullList({ filter: `plan_id = '${pl.id}'` });
                            for (const sn of snaps) await safeDelete(adminPb, 'plan_snapshots', sn.id);

                            await safeDelete(adminPb, 'training_plans', pl.id);
                        }
                        await safeDelete(adminPb, 'training_phases', ph.id);
                    }
                    await safeDelete(adminPb, 'seasons', s.id);
                }
                const athletes = await adminPb.collection('athletes').getFullList({ filter: `coach_id = '${user.id}'` });
                for (const a of athletes) {
                    await safeDelete(adminPb, 'athletes', a.id);
                }
            }

            // Cleanup explicit relations like notifications
            const notifications = await adminPb.collection('notifications').getFullList({ filter: `user_id = '${user.id}'` });
            for (const n of notifications) await safeDelete(adminPb, 'notifications', n.id);

            const prefs = await adminPb.collection('notification_preferences').getFullList({ filter: `user_id = '${user.id}'` });
            for (const p of prefs) await safeDelete(adminPb, 'notification_preferences', p.id);

            await safeDelete(adminPb, 'users', user.id);
        }
    } catch (e) {
        console.error('Teardown lookup failed', e);
    }
}

export async function setupTestData() {
    const adminPb = await setupAdmin();
    const ts = Date.now();
    const coachEmail = `coach_${ts}@test.com`;
    const athleteEmail = `athlete_${ts}@test.com`;

    // Create Coach
    let coach;
    try {
        coach = await adminPb.collection('users').create({
            email: coachEmail,
            password: TEST_PASS,
            passwordConfirm: TEST_PASS,
            name: `Coach ${ts}`,
            role: 'coach',
            language: 'ru', // Use RU to match button texts in spec
            units: 'metric',
            emailVisibility: true,
            verified: true
        });
    } catch (e: any) {
        console.error('Failed to create coach:', e.response);
        throw e;
    }

    // Create Athlete
    const athlete = await adminPb.collection('users').create({
        email: athleteEmail,
        password: TEST_PASS,
        passwordConfirm: TEST_PASS,
        name: `Athlete ${ts}`,
        role: 'athlete',
        language: 'ru',
        units: 'metric',
        emailVisibility: true,
        verified: true
    });

    // Link Athlete Record
    const athleteRecord = await adminPb.collection('athletes').create({
        coach_id: coach.id,
        user_id: athlete.id,
        name: `Athlete ${ts}`,
    });

    // Create Season
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const season = await adminPb.collection('seasons').create({
        coach_id: coach.id,
        athlete_id: athleteRecord.id, // Explicit assignment
        name: `Test Season ${ts}`,
        start_date: today.toISOString(),
        end_date: nextMonth.toISOString()
    });

    // Create Phase
    const phase = await adminPb.collection('training_phases').create({
        season_id: season.id,
        phase_type: 'GPP',
        order: 1,
        start_date: today.toISOString(),
        end_date: nextMonth.toISOString()
    });

    // Create Draft Plan for Week 1
    const plan = await adminPb.collection('training_plans').create({
        plan_type: 'phase_based',
        phase_id: phase.id,
        week_number: 1,
        status: 'draft'
    });

    // Get a default exercise or fallback to custom text
    const rootExercises = await adminPb.collection('exercises').getList(1, 1);
    const exerciseId = rootExercises.items.length > 0 ? rootExercises.items[0].id : null;

    if (exerciseId) {
        await adminPb.collection('plan_exercises').create({
            plan_id: plan.id,
            exercise_id: exerciseId,
            order: 1,
            block: 'main',
            sets: 3,
            reps: '10',
            weight: 50
        });
    } else {
        await adminPb.collection('plan_exercises').create({
            plan_id: plan.id,
            order: 1,
            block: 'main',
            custom_text_ru: 'E2E Focus Exercise'
        });
    }

    return { coach, athlete, coachEmail, athleteEmail, athleteRecord, season, phase, plan };
}
