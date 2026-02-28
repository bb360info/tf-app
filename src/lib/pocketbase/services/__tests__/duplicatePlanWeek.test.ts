/**
 * duplicatePlanWeek.test.ts — Track 4.267 Phase 4
 * Tests for duplicatePlanWeek() in plans.ts
 *
 * [Track 4.267 Phase 1] Bug fixes applied:
 *   1. Guard: NEVER overwrite a published destination plan (data loss risk)
 *   2. Soft-delete existing destination exercises before copying (safe, recoverable)
 *   3. Warmup block exercises are excluded from copy (only 'main' block copied)
 *
 * Mock strategy: track calls by index using per-invocation mockReturnValue chains.
 * duplicatePlanWeek calls pb.collection() many times in sequence — we use
 * mockImplementation with a call counter to return different values per call.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────

vi.mock('@/lib/pocketbase/client', () => ({
    default: {
        collection: vi.fn(),
        filter: (tpl: string, vals: Record<string, unknown>) =>
            Object.entries(vals).reduce(
                (acc, [k, v]) => acc.replace(`{:${k}}`, String(v)),
                tpl
            ),
    },
}));

import pb from '@/lib/pocketbase/client';

// ─── Helpers ──────────────────────────────────────────────────────

function makePlan(id: string, status: 'draft' | 'published' = 'draft') {
    return {
        id,
        status,
        phase_id: 'phase-1',
        week_number: 1,
        plan_type: 'phase_based',
        deleted_at: '',
    };
}

function makeExercise(id: string, block: 'main' | 'warmup' = 'main') {
    return {
        id,
        exercise_id: `ex-${id}`,
        day_of_week: 0,
        session: 0,
        block,
        order: 1,
        sets: 3,
        reps: '5',
        intensity: '80%',
        notes: '',
        weight: null,
        duration: null,
        distance: null,
        rest_seconds: 60,
    };
}

/**
 * Build a shared collection mock where getFirstListItem and getFullList
 * return values from queues. This handles the sequential calls made
 * by duplicatePlanWeek internally (source plan, getOrCreatePlan, exercises...).
 */
function buildSequentialMock(
    firstListItemQueue: (object | Error)[],
    fullListQueue: object[][]
) {
    let firstListCount = 0;
    let fullListCount = 0;
    const mockUpdate = vi.fn().mockResolvedValue({});
    const mockCreate = vi.fn().mockResolvedValue({ id: 'created-ex' });

    const collectionMock = {
        getFirstListItem: vi.fn().mockImplementation((filter: string, _opts?: unknown) => {
            void filter;
            const val = firstListItemQueue[firstListCount++];
            if (val instanceof Error) return Promise.reject(val);
            return Promise.resolve(val);
        }),
        getFullList: vi.fn().mockImplementation((_opts?: unknown) => {
            const val = fullListQueue[fullListCount++] ?? [];
            return Promise.resolve(val);
        }),
        update: mockUpdate,
        create: mockCreate,
    };

    return { collectionMock, mockUpdate, mockCreate };
}

// ─── Tests ────────────────────────────────────────────────────────

describe('duplicatePlanWeek', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('throws when destination plan is already published', async () => {
        const sourcePlan = makePlan('source-plan');
        const destPlan = makePlan('dest-plan', 'published');
        const sourceExercises = [makeExercise('ex-1')];

        // Call order in duplicatePlanWeek:
        // 1. getFirstListItem → source plan
        // 2. getFullList      → source exercises
        // 3. getFirstListItem → dest plan (via getOrCreatePlan)
        const { collectionMock } = buildSequentialMock(
            [sourcePlan, destPlan],
            [sourceExercises, []]
        );
        (pb.collection as ReturnType<typeof vi.fn>).mockReturnValue(collectionMock);

        const { duplicatePlanWeek } = await import('../plans');

        await expect(
            duplicatePlanWeek('phase-1', 1, 2)
        ).rejects.toThrow('Cannot duplicate into a published plan');
    });

    it('returns early when source plan does not exist', async () => {
        const notFound = Object.assign(new Error('Not found'), { status: 404 });
        const { collectionMock, mockCreate } = buildSequentialMock(
            [notFound],
            []
        );
        (pb.collection as ReturnType<typeof vi.fn>).mockReturnValue(collectionMock);

        const { duplicatePlanWeek } = await import('../plans');
        await duplicatePlanWeek('phase-1', 99, 100);

        // Nothing should have been created
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('soft-deletes existing destination exercises before copying', async () => {
        const sourcePlan = makePlan('source-plan');
        const destPlan = makePlan('dest-plan', 'draft');
        const sourceExercises = [makeExercise('new-ex-1')];
        const existingDestExs = [{ id: 'old-ex-1' }, { id: 'old-ex-2' }];

        // getFullList call order:
        // 1st: source exercises (main block)
        // 2nd: existing dest exercises (to soft-delete)
        const { collectionMock, mockUpdate } = buildSequentialMock(
            [sourcePlan, destPlan],
            [sourceExercises, existingDestExs]
        );
        (pb.collection as ReturnType<typeof vi.fn>).mockReturnValue(collectionMock);

        const { duplicatePlanWeek } = await import('../plans');
        await duplicatePlanWeek('phase-1', 1, 2);

        // Both existing dest exercises should be soft-deleted
        const softDeleteCalls = mockUpdate.mock.calls.filter(
            (call: unknown[]) => (call[1] as Record<string, unknown>)?.deleted_at !== undefined
        );
        expect(softDeleteCalls).toHaveLength(2);
        expect(softDeleteCalls[0][0]).toBe('old-ex-1');
        expect(softDeleteCalls[1][0]).toBe('old-ex-2');
    });

    it('copies source exercises to destination with correct plan_id', async () => {
        const sourcePlan = makePlan('source-plan');
        const destPlan = makePlan('dest-plan-id', 'draft');
        const sourceExercises = [makeExercise('ex-A'), makeExercise('ex-B')];

        const { collectionMock, mockCreate } = buildSequentialMock(
            [sourcePlan, destPlan],
            [sourceExercises, []] // no existing dest exercises
        );
        (pb.collection as ReturnType<typeof vi.fn>).mockReturnValue(collectionMock);

        const { duplicatePlanWeek } = await import('../plans');
        await duplicatePlanWeek('phase-1', 1, 2);

        // 2 exercises created with dest plan_id
        expect(mockCreate.mock.calls).toHaveLength(2);
        expect(mockCreate.mock.calls[0][0]).toMatchObject({
            plan_id: 'dest-plan-id',
            exercise_id: 'ex-ex-A',
        });
        expect(mockCreate.mock.calls[1][0]).toMatchObject({
            plan_id: 'dest-plan-id',
            exercise_id: 'ex-ex-B',
        });
    });

    it('skips copy when source has no exercises after filter', async () => {
        const sourcePlan = makePlan('source-plan');
        // No source exercises returned (e.g. all were warmup — filtered out)
        const { collectionMock, mockCreate } = buildSequentialMock(
            [sourcePlan],
            [[]] // empty source exercises
        );
        (pb.collection as ReturnType<typeof vi.fn>).mockReturnValue(collectionMock);

        const { duplicatePlanWeek } = await import('../plans');
        await duplicatePlanWeek('phase-1', 1, 2);

        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('filter for source exercises contains warmup exclusion', async () => {
        const sourcePlan = makePlan('source-plan');
        const destPlan = makePlan('dest-plan', 'draft');

        let capturedSourceFilter = '';
        const { collectionMock } = buildSequentialMock([sourcePlan, destPlan], []);
        // Override getFullList to capture filter
        collectionMock.getFullList = vi.fn().mockImplementation(
            ({ filter }: { filter: string }) => {
                capturedSourceFilter = filter;
                return Promise.resolve([]);
            }
        );
        (pb.collection as ReturnType<typeof vi.fn>).mockReturnValue(collectionMock);

        const { duplicatePlanWeek } = await import('../plans');
        await duplicatePlanWeek('phase-1', 1, 2);

        // Source exercises query must exclude warmup block
        expect(capturedSourceFilter).toContain('warmup');
    });
});
