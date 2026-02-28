/**
 * applyAdjustments.test.ts — Track 4.266 Phase 4
 * Tests for N+1 batch refactor in applyAdjustments().
 *
 * Key requirement: getFullList called exactly ONCE for any number of exercises,
 * not N times as the old implementation did.
 *
 * Patterns follow publishPlan.test.ts — mock pb.collection via vi.mock('@/lib/pocketbase/client')
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PlanExercisesRecord } from '@/lib/pocketbase/types';

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

// Partial record — only fields needed for applyAdjustments to work
type TestExercise = PlanExercisesRecord & { id: string };

function makeExercise(id: string, overrides: Partial<TestExercise> = {}): TestExercise {
    return {
        id,
        plan_id: 'plan-1',
        exercise_id: `ex-${id}`,
        order: 1,
        sets: 3,
        reps: '10',           // string per PlanExercisesRecord type
        intensity: undefined,
        weight: undefined,
        duration: undefined,
        distance: undefined,
        rest_seconds: 60,
        notes: '',
        deleted_at: undefined,
        collectionId: 'plan_exercises',
        collectionName: 'plan_exercises',
        created: '',
        updated: '',
        ...overrides,
    };
}

function makeAdjustment(planExerciseId: string, overrides: Record<string, unknown> = {}) {
    return {
        id: `adj-${planExerciseId}`,
        plan_exercise_id: planExerciseId,
        athlete_id: 'athlete-1',
        skip: false as boolean,
        sets: undefined as number | undefined,
        reps: undefined as string | undefined,
        intensity: undefined as string | undefined,
        weight: undefined as number | undefined,
        duration: undefined as number | undefined,
        distance: undefined as number | undefined,
        rest_seconds: undefined as number | undefined,
        notes: undefined as string | undefined,
        deleted_at: '',
        collectionId: 'exercise_adjustments',
        collectionName: 'exercise_adjustments',
        created: '',
        updated: '',
        ...overrides,
    };
}

function setupPbMock(adjustments: ReturnType<typeof makeAdjustment>[]) {
    const mockGetFullList = vi.fn().mockResolvedValue(adjustments);
    (pb.collection as ReturnType<typeof vi.fn>).mockReturnValue({
        getFullList: mockGetFullList,
    });
    return { mockGetFullList };
}

// ─── Tests ────────────────────────────────────────────────────────

describe('applyAdjustments — N+1 batch refactor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns [] immediately without calling getFullList for empty exercises array', async () => {
        const { mockGetFullList } = setupPbMock([]);

        const { applyAdjustments } = await import('../planResolution');
        const result = await applyAdjustments([], 'athlete-1');

        expect(result).toEqual([]);
        // No HTTP request for empty array
        expect(mockGetFullList).not.toHaveBeenCalled();
    });

    it('calls getFullList exactly once for N exercises (not N times)', async () => {
        const exercises = [
            makeExercise('ex-1'),
            makeExercise('ex-2'),
            makeExercise('ex-3'),
            makeExercise('ex-4'),
            makeExercise('ex-5'),
        ];
        const { mockGetFullList } = setupPbMock([]);

        const { applyAdjustments } = await import('../planResolution');
        await applyAdjustments(exercises, 'athlete-1');

        // Core assertion: 1 request total, not 5
        expect(mockGetFullList).toHaveBeenCalledTimes(1);
    });

    it('returns all exercises unchanged when no adjustments exist', async () => {
        const exercises = [makeExercise('ex-1'), makeExercise('ex-2')];
        setupPbMock([]); // no adjustments

        const { applyAdjustments } = await import('../planResolution');
        const result = await applyAdjustments(exercises, 'athlete-1');

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('ex-1');
        expect(result[1].id).toBe('ex-2');
    });

    it('excludes exercise with skip=true from result', async () => {
        const exercises = [
            makeExercise('ex-1'),
            makeExercise('ex-2'),
            makeExercise('ex-3'),
        ];
        // ex-2 is skipped
        setupPbMock([makeAdjustment('ex-2', { skip: true })]);

        const { applyAdjustments } = await import('../planResolution');
        const result = await applyAdjustments(exercises, 'athlete-1');

        expect(result).toHaveLength(2);
        const ids = result.map((e) => e.id);
        expect(ids).toContain('ex-1');
        expect(ids).toContain('ex-3');
        expect(ids).not.toContain('ex-2');
    });

    it('applies override fields and sets _adjusted=true', async () => {
        const exercises = [makeExercise('ex-1', { sets: 3, reps: '10', weight: undefined })];
        // Adjustment overrides sets + weight
        setupPbMock([
            makeAdjustment('ex-1', {
                skip: false,
                sets: 5,
                weight: 70,
            }),
        ]);

        const { applyAdjustments } = await import('../planResolution');
        const result = await applyAdjustments(exercises, 'athlete-1');

        expect(result).toHaveLength(1);
        expect(result[0].sets).toBe(5);
        expect(result[0].weight).toBe(70);
        // _adjusted flag for ⚡ badge rendering
        expect((result[0] as Record<string, unknown>)._adjusted).toBe(true);
    });

    it('preserves original fields when adjustment has undefined values', async () => {
        const exercises = [makeExercise('ex-1', { sets: 4, reps: '12', notes: 'original note' })];
        // Adjustment exists but sets and notes are undefined (no override)
        setupPbMock([makeAdjustment('ex-1', { sets: undefined, notes: undefined })]);

        const { applyAdjustments } = await import('../planResolution');
        const result = await applyAdjustments(exercises, 'athlete-1');

        expect(result[0].sets).toBe(4);                 // preserved (undefined adj → keep original)
        expect(result[0].notes).toBe('original note');  // preserved
    });
});
