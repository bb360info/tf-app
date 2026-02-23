/**
 * PocketBase Service: Test Results
 * CRUD for athlete performance tests (jumps, sprints, lifts).
 */

import pb from '../client';
import { Collections } from '../collections';
import type { TestResultsRecord, TestType } from '../types';
import type { RecordModel, ClientResponseError } from 'pocketbase';

// ─── Types ────────────────────────────────────────────────────────

export type TestResultRecord = TestResultsRecord & RecordModel;

export interface TestResultWithDelta extends TestResultRecord {
    delta?: number; // Difference from previous result (positive = improvement for jumps; negative for sprints)
    isPB?: boolean; // Personal Best flag
}

// ─── Helpers ──────────────────────────────────────────────────────

/** Unit label for each test type */
export function testUnit(type: TestType): string {
    switch (type) {
        case 'standing_jump':
        case 'approach_jump':
            return 'cm';
        case 'sprint_30m':
        case 'sprint_60m':
            return 's';
        case 'squat_max':
        case 'clean_max':
        case 'snatch_max':
            return 'kg';
    }
}

/**
 * For sprint tests, lower is better.
 * For all others, higher is better.
 */
export function isLowerBetter(type: TestType): boolean {
    return type === 'sprint_30m' || type === 'sprint_60m';
}

/**
 * Compute delta: positive means improvement (regardless of test direction).
 */
export function computeDelta(type: TestType, current: number, previous: number): number {
    const raw = current - previous;
    return isLowerBetter(type) ? -raw : raw; // invert for sprint — lower time = positive delta
}

/** All available test types in display order */
export const ALL_TEST_TYPES: TestType[] = [
    'standing_jump',
    'approach_jump',
    'sprint_30m',
    'sprint_60m',
    'squat_max',
    'clean_max',
    'snatch_max',
];

// ─── Service Functions ────────────────────────────────────────────

/**
 * List all test results for an athlete + test type, sorted oldest → newest (for charts).
 */
export async function listTestResults(
    athleteId: string,
    testType: TestType
): Promise<TestResultRecord[]> {
    return pb.collection(Collections.TEST_RESULTS).getFullList<TestResultRecord>({
        filter: pb.filter('athlete_id = {:aid} && test_type = {:type}', { aid: athleteId, type: testType }),
        sort: 'date',
    });
}

/**
 * List latest result per test type for an athlete (for summary cards).
 * Returns map: testType → latest record
 */
export async function listLatestResults(
    athleteId: string
): Promise<Partial<Record<TestType, TestResultRecord>>> {
    const results: Partial<Record<TestType, TestResultRecord>> = {};
    await Promise.all(
        ALL_TEST_TYPES.map(async (type) => {
            try {
                const record = await pb
                    .collection(Collections.TEST_RESULTS)
                    .getFirstListItem<TestResultRecord>(
                        pb.filter('athlete_id = {:aid} && test_type = {:type}', { aid: athleteId, type }),
                        { sort: '-date' }
                    );
                results[type] = record;
            } catch (err) {
                // Only swallow 404 (no results for this type)
                const pbErr = err as ClientResponseError;
                if (pbErr?.status !== 404) throw err;
            }
        })
    );
    return results;
}

/**
 * Add a new test result.
 */
export async function addTestResult(data: {
    athlete_id: string;
    test_type: TestType;
    value: number;
    date: string;
    notes?: string;
}): Promise<TestResultRecord> {
    return pb.collection(Collections.TEST_RESULTS).create<TestResultRecord>(data);
}

/**
 * Find an existing test result for (athlete, type, date).
 * Returns null if none exists (404).
 * Throws on permissions errors (403) or network failures.
 */
export async function findExistingTestResult(
    athleteId: string,
    testType: TestType,
    date: string
): Promise<TestResultRecord | null> {
    // Use date range instead of ~ operator (unreliable for PocketBase date fields)
    const dateStart = `${date} 00:00:00`;
    const dateEnd = `${date} 23:59:59`;
    try {
        return await pb
            .collection(Collections.TEST_RESULTS)
            .getFirstListItem<TestResultRecord>(
                pb.filter(
                    'athlete_id = {:aid} && test_type = {:type} && date >= {:start} && date <= {:end}',
                    { aid: athleteId, type: testType, start: dateStart, end: dateEnd }
                )
            );
    } catch (err) {
        const pbErr = err as ClientResponseError;
        if (pbErr?.status === 404) return null; // Not found — expected
        throw err; // 403, network, etc. — bubble up
    }
}

/**
 * Create or update a test result for the given (athlete, type, date).
 * Returns `replaced: true` if an existing record was updated.
 * Throws on all errors except 404 (record not found → create new).
 */
export async function upsertTestResult(data: {
    athlete_id: string;
    test_type: TestType;
    value: number;
    date: string;
    notes?: string;
}): Promise<{ record: TestResultRecord; replaced: boolean }> {
    const dateStart = `${data.date} 00:00:00`;
    const dateEnd = `${data.date} 23:59:59`;

    let existing: TestResultRecord | null = null;
    try {
        existing = await pb
            .collection(Collections.TEST_RESULTS)
            .getFirstListItem<TestResultRecord>(
                pb.filter(
                    'athlete_id = {:aid} && test_type = {:type} && date >= {:start} && date <= {:end}',
                    { aid: data.athlete_id, type: data.test_type, start: dateStart, end: dateEnd }
                )
            );
    } catch (err) {
        const pbErr = err as ClientResponseError;
        if (pbErr?.status !== 404) throw err; // 403, network, etc. — bubble up
        // 404 = no existing record, will create below
    }

    if (existing) {
        // Update existing record
        const updated = await pb
            .collection(Collections.TEST_RESULTS)
            .update<TestResultRecord>(existing.id, {
                value: data.value,
                notes: data.notes ?? '',
            });
        return { record: updated, replaced: true };
    }

    // No existing record — create new
    const created = await pb
        .collection(Collections.TEST_RESULTS)
        .create<TestResultRecord>(data);
    return { record: created, replaced: false };
}

/**
 * Delete a test result.
 */
export async function deleteTestResult(id: string): Promise<void> {
    await pb.collection(Collections.TEST_RESULTS).delete(id);
}

/**
 * Enrich results with delta and PB flags.
 */
export function enrichWithDelta(type: TestType, results: TestResultRecord[]): TestResultWithDelta[] {
    if (results.length === 0) return [];

    const lower = isLowerBetter(type);
    let pb_value = results[0].value;

    return results.map((result, i) => {
        const prev = i > 0 ? results[i - 1].value : undefined;
        const delta = prev !== undefined ? computeDelta(type, result.value, prev) : undefined;

        // Update personal best
        const isBetter = lower
            ? result.value < pb_value
            : result.value > pb_value;
        if (isBetter || i === 0) pb_value = result.value;

        return {
            ...result,
            delta,
            isPB: lower ? result.value <= pb_value : result.value >= pb_value,
        };
    });
}
