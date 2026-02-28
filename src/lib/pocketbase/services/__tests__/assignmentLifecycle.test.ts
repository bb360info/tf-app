/**
 * assignmentLifecycle.test.ts — Track 4.267 Phase 4
 * Tests for AssignmentLifecycleService
 *
 * Covers:
 *   - deactivateForPlan: deactivate all active assignments for a plan
 *   - deactivateSiblings: deactivate assignments of sibling plans (same phase+week)
 *   - deactivateForSeason: deactivate all assignments across an entire season
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────

const mockUpdate = vi.fn().mockResolvedValue({ id: 'assign-1', status: 'inactive' });
const mockGetFullList = vi.fn();

vi.mock('@/lib/pocketbase/client', () => ({
    default: {
        collection: vi.fn(() => ({
            getFullList: mockGetFullList,
            update: mockUpdate,
        })),
        filter: (tpl: string, vals: Record<string, unknown>) =>
            Object.entries(vals).reduce(
                (acc, [k, v]) => acc.replace(`{:${k}}`, String(v)),
                tpl
            ),
    },
}));

// ─── Helpers ──────────────────────────────────────────────────────

function makeAssignment(id: string) {
    return { id, status: 'active' };
}

// ─── deactivateForPlan ────────────────────────────────────────────

describe('deactivateForPlan', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deactivates all active assignments for planId', async () => {
        mockGetFullList.mockResolvedValue([makeAssignment('a1'), makeAssignment('a2')]);

        const { deactivateForPlan } = await import('../assignmentLifecycle');
        const count = await deactivateForPlan('plan-1');

        expect(count).toBe(2);
        expect(mockUpdate).toHaveBeenCalledTimes(2);
        expect(mockUpdate).toHaveBeenCalledWith('a1', { status: 'inactive' });
        expect(mockUpdate).toHaveBeenCalledWith('a2', { status: 'inactive' });
    });

    it('returns 0 when no active assignments found', async () => {
        mockGetFullList.mockResolvedValue([]);

        const { deactivateForPlan } = await import('../assignmentLifecycle');
        const count = await deactivateForPlan('plan-empty');

        expect(count).toBe(0);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('returns correct count matching deactivated assignments', async () => {
        mockGetFullList.mockResolvedValue([
            makeAssignment('x1'),
            makeAssignment('x2'),
            makeAssignment('x3'),
        ]);

        const { deactivateForPlan } = await import('../assignmentLifecycle');
        const count = await deactivateForPlan('plan-3');

        expect(count).toBe(3);
        expect(mockUpdate).toHaveBeenCalledTimes(3);
    });
});

// ─── deactivateSiblings ───────────────────────────────────────────

describe('deactivateSiblings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deactivates assignments of sibling plans (excluding current planId)', async () => {
        // First getFullList call → sibling plans
        // Subsequent calls → assignments for each sibling → deactivateForPlan internally
        mockGetFullList
            .mockResolvedValueOnce([{ id: 'sibling-plan-1' }, { id: 'sibling-plan-2' }])
            .mockResolvedValue([makeAssignment('assign-sibling')]);

        const { deactivateSiblings } = await import('../assignmentLifecycle');
        const count = await deactivateSiblings('plan-current', 'phase-1', 3);

        // 2 sibling plans, each with 1 assignment = 2 total deactivations
        expect(count).toBe(2);
        expect(mockUpdate).toHaveBeenCalledTimes(2);
    });

    it('returns 0 when no sibling plans found', async () => {
        mockGetFullList.mockResolvedValue([]);

        const { deactivateSiblings } = await import('../assignmentLifecycle');
        const count = await deactivateSiblings('plan-only', 'phase-1', 1);

        expect(count).toBe(0);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('returns 0 when sibling plans have no active assignments', async () => {
        mockGetFullList
            .mockResolvedValueOnce([{ id: 'sibling-plan-1' }]) // sibling plans
            .mockResolvedValue([]); // no assignments

        const { deactivateSiblings } = await import('../assignmentLifecycle');
        const count = await deactivateSiblings('plan-x', 'phase-2', 5);

        expect(count).toBe(0);
    });
});

// ─── deactivateForSeason ──────────────────────────────────────────

describe('deactivateForSeason', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deactivates assignments across all phases and plans in a season', async () => {
        mockGetFullList
            .mockResolvedValueOnce([{ id: 'phase-1' }, { id: 'phase-2' }]) // phases
            .mockResolvedValueOnce([{ id: 'plan-a' }, { id: 'plan-b' }])   // plans phase-1
            .mockResolvedValueOnce([{ id: 'plan-c' }])                     // plans phase-2
            .mockResolvedValue([makeAssignment('assign-x')]);               // 1 assignment per plan

        const { deactivateForSeason } = await import('../assignmentLifecycle');
        const count = await deactivateForSeason('season-1');

        // 3 plans total × 1 assignment each = 3 deactivations
        expect(count).toBe(3);
        expect(mockUpdate).toHaveBeenCalledTimes(3);
    });

    it('returns 0 when season has no phases', async () => {
        mockGetFullList.mockResolvedValue([]); // no phases

        const { deactivateForSeason } = await import('../assignmentLifecycle');
        const count = await deactivateForSeason('season-empty');

        expect(count).toBe(0);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('returns 0 when phases have no plans', async () => {
        mockGetFullList
            .mockResolvedValueOnce([{ id: 'phase-1' }]) // 1 phase
            .mockResolvedValue([]);                      // no plans

        const { deactivateForSeason } = await import('../assignmentLifecycle');
        const count = await deactivateForSeason('season-2');

        expect(count).toBe(0);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('aggregates count from multiple phases correctly', async () => {
        mockGetFullList
            .mockResolvedValueOnce([{ id: 'phase-A' }, { id: 'phase-B' }])
            .mockResolvedValueOnce([{ id: 'plan-1' }])                // phase-A: 1 plan
            .mockResolvedValueOnce([{ id: 'plan-2' }, { id: 'plan-3' }]) // phase-B: 2 plans
            .mockResolvedValueOnce([makeAssignment('as-1'), makeAssignment('as-2')]) // plan-1: 2
            .mockResolvedValueOnce([makeAssignment('as-3')])          // plan-2: 1
            .mockResolvedValue([]);                                   // plan-3: 0

        const { deactivateForSeason } = await import('../assignmentLifecycle');
        const count = await deactivateForSeason('season-3');

        // plan-1: 2, plan-2: 1, plan-3: 0 → total 3
        expect(count).toBe(3);
    });
});
