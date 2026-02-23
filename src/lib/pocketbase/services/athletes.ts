/**
 * PocketBase Service: Athletes
 * CRUD for athletes belonging to the current coach.
 */

import pb from '../client';
import { Collections } from '../collections';
import type { AthletesRecord, DailyCheckinsRecord, TestResultsRecord } from '../types';
import type { RecordModel } from 'pocketbase';

// ─── Types ────────────────────────────────────────────────────────

export type AthleteRecord = AthletesRecord & RecordModel;

export interface AthleteWithStats extends AthleteRecord {
    latestReadiness?: number;       // 0-100, from most recent daily check-in
    latestCheckinDate?: string;     // ISO date
    lastLogDate?: string;           // ISO date — last training log entry
    totalLogs?: number;
    groupId?: string;               // first group this athlete belongs to
    groupName?: string;             // display name of that group
}

// ─── Athletes ─────────────────────────────────────────────────────

/** List all athletes for the current coach */
export async function listMyAthletes(): Promise<AthleteRecord[]> {
    const user = pb.authStore.model;
    if (!user?.id) throw new Error('Not authenticated');
    const all = await pb.collection(Collections.ATHLETES).getFullList<AthleteRecord>({
        filter: `coach_id = "${user.id}" && deleted_at = ""`,
        sort: 'name',
    });
    return all;
}


/** Get a single athlete by ID */
export async function getAthlete(id: string): Promise<AthleteRecord> {
    return pb.collection(Collections.ATHLETES).getOne<AthleteRecord>(id);
}

/** Create a new athlete */
export async function createAthlete(data: {
    name: string;
    birth_date?: string;
    gender?: 'male' | 'female';
    height_cm?: number;
}): Promise<AthleteRecord> {
    const user = pb.authStore.model;
    if (!user?.id) throw new Error('Not authenticated');
    return pb.collection(Collections.ATHLETES).create<AthleteRecord>({
        coach_id: user.id,
        ...data,
    });
}

/** Update an athlete */
export async function updateAthlete(
    id: string,
    data: Partial<Pick<AthletesRecord, 'name' | 'birth_date' | 'gender' | 'height_cm'>>
): Promise<AthleteRecord> {
    return pb.collection(Collections.ATHLETES).update<AthleteRecord>(id, data);
}

/** Soft-delete an athlete (hidden in app, record stays in DB) */
export async function deleteAthlete(id: string): Promise<void> {
    await pb.collection(Collections.ATHLETES).update(id, {
        deleted_at: new Date().toISOString(),
    });
}

/**
 * Hard-delete an athlete WITH ALL related data.
 *
 * Architectural decision: seasons assigned to this athlete (seasons.athlete_id = athleteId)
 * are FULLY deleted along with all their phases, plans, exercises, and competitions.
 * Seasons owned by the coach (seasons.coach_id) and shared with this athlete are NOT affected.
 *
 * Deletion order (deepest FK dependencies first):
 * log_exercises → training_logs → test_results → daily_checkins
 * → plan_exercises/snapshots → training_plans → competitions
 * → training_phases → seasons (athlete-owned only) → achievements → athlete
 */
export async function hardDeleteAthleteWithData(athleteId: string): Promise<void> {
    // Helper: delete all records matching a filter
    const deleteAll = async (col: string, filter: string) => {
        try {
            const records = await pb.collection(col).getFullList({
                filter,
                fields: 'id',
                requestKey: null,
            });
            await Promise.all(
                records.map((r) => pb.collection(col).delete(r.id).catch(() => { }))
            );
        } catch { /* empty or no match */ }
    };

    // 1. training_logs → log_exercises
    const logs = await pb
        .collection(Collections.TRAINING_LOGS)
        .getFullList({ filter: `athlete_id = "${athleteId}"`, fields: 'id', requestKey: null })
        .catch(() => [] as { id: string }[]);

    for (const log of logs) {
        await deleteAll(Collections.LOG_EXERCISES, `log_id = "${log.id}"`);
    }
    await Promise.all(
        logs.map((l) => pb.collection(Collections.TRAINING_LOGS).delete(l.id).catch(() => { }))
    );

    // 2. Test results + daily check-ins
    await deleteAll(Collections.TEST_RESULTS, `athlete_id = "${athleteId}"`);
    await deleteAll(Collections.DAILY_CHECKINS, `athlete_id = "${athleteId}"`);

    // 3. Seasons assigned exclusively to this athlete (athlete_id = athleteId).
    //    Architecture decision: these are deleted in full, not just unlinked.
    const seasons = await pb
        .collection(Collections.SEASONS)
        .getFullList({ filter: `athlete_id = "${athleteId}"`, fields: 'id', requestKey: null })
        .catch(() => [] as { id: string }[]);

    for (const season of seasons) {
        await deleteAll(Collections.COMPETITIONS, `season_id = "${season.id}"`);

        const phases = await pb
            .collection(Collections.TRAINING_PHASES)
            .getFullList({ filter: `season_id = "${season.id}"`, fields: 'id', requestKey: null })
            .catch(() => [] as { id: string }[]);

        for (const phase of phases) {
            const plans = await pb
                .collection(Collections.TRAINING_PLANS)
                .getFullList({ filter: `phase_id = "${phase.id}"`, fields: 'id', requestKey: null })
                .catch(() => [] as { id: string }[]);

            for (const plan of plans) {
                await deleteAll(Collections.PLAN_EXERCISES, `plan_id = "${plan.id}"`);
                await deleteAll(Collections.PLAN_SNAPSHOTS, `plan_id = "${plan.id}"`);
                await pb.collection(Collections.TRAINING_PLANS).delete(plan.id).catch(() => { });
            }

            await pb.collection(Collections.TRAINING_PHASES).delete(phase.id).catch(() => { });
        }

        await pb.collection(Collections.SEASONS).delete(season.id).catch(() => { });
    }

    // 4. Achievements
    await deleteAll(Collections.ACHIEVEMENTS, `athlete_id = "${athleteId}"`);

    // 5. Delete the athlete record itself
    await pb.collection(Collections.ATHLETES).delete(athleteId);
}

// ─── Stats ────────────────────────────────────────────────────────

/**
 * Get the latest daily check-in for a specific athlete.
 * Returns null if no check-in found.
 */
export async function getLatestCheckin(
    athleteId: string
): Promise<(DailyCheckinsRecord & RecordModel) | null> {
    try {
        return await pb
            .collection(Collections.DAILY_CHECKINS)
            .getFirstListItem<DailyCheckinsRecord & RecordModel>(
                `athlete_id = "${athleteId}"`,
                { sort: '-date' }
            );
    } catch {
        /* expected: 404 — no check-in found */
        return null;
    }
}

/**
 * Get the latest test result of a specific type for an athlete.
 */
export async function getLatestTestResult(
    athleteId: string,
    testType: string
): Promise<(TestResultsRecord & RecordModel) | null> {
    try {
        return await pb
            .collection(Collections.TEST_RESULTS)
            .getFirstListItem<TestResultsRecord & RecordModel>(
                `athlete_id = "${athleteId}" && test_type = "${testType}"`,
                { sort: '-date' }
            );
    } catch {
        /* expected: 404 — no test result found */
        return null;
    }
}

/**
 * Compute readiness level label from score.
 */
export function readinessLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
}
