/**
 * revertToDraft.test.ts — Track 4.267 Phase 4
 * Tests for revertToDraft() in plans.ts
 *
 * [Track 4.267 Phase 1] Bug fix: revertToDraft now deactivates plan assignments
 * BEFORE changing status to draft. If deactivation fails, plan stays published (safe).
 *
 * Key invariant: deactivateForPlan() must be called BEFORE pb.update(status='draft').
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────

const mockDeactivateForPlan = vi.fn();

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

vi.mock('@/lib/pocketbase/services/assignmentLifecycle', () => ({
    deactivateForPlan: mockDeactivateForPlan,
}));

import pb from '@/lib/pocketbase/client';

// ─── Helpers ──────────────────────────────────────────────────────

function makeDraftPlan(id = 'plan-1') {
    return { id, status: 'draft', phase_id: 'phase-1', week_number: 1 };
}

// ─── Tests ────────────────────────────────────────────────────────

describe('revertToDraft', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('calls deactivateForPlan BEFORE updating plan status', async () => {
        const callOrder: string[] = [];

        mockDeactivateForPlan.mockImplementation(async () => {
            callOrder.push('deactivateForPlan');
            return 1;
        });

        const mockUpdate = vi.fn().mockImplementation(async () => {
            callOrder.push('pb.update');
            return makeDraftPlan();
        });

        (pb.collection as ReturnType<typeof vi.fn>).mockReturnValue({
            update: mockUpdate,
        });

        const { revertToDraft } = await import('../plans');
        await revertToDraft('plan-1');

        // CRITICAL: deactivateForPlan must come first
        expect(callOrder[0]).toBe('deactivateForPlan');
        expect(callOrder[1]).toBe('pb.update');
        expect(callOrder).toHaveLength(2);
    });


    it('updates plan status to "draft"', async () => {
        mockDeactivateForPlan.mockResolvedValue(1);
        const mockUpdate = vi.fn().mockResolvedValue(makeDraftPlan());
        (pb.collection as ReturnType<typeof vi.fn>).mockReturnValue({
            update: mockUpdate,
        });

        const { revertToDraft } = await import('../plans');
        await revertToDraft('plan-1');

        expect(mockUpdate).toHaveBeenCalledWith('plan-1', { status: 'draft' });
    });

    it('throws and does NOT update status if deactivateForPlan fails', async () => {
        mockDeactivateForPlan.mockRejectedValue(new Error('PB connection failed'));

        const mockUpdate = vi.fn();
        (pb.collection as ReturnType<typeof vi.fn>).mockReturnValue({
            update: mockUpdate,
        });

        const { revertToDraft } = await import('../plans');

        await expect(revertToDraft('plan-published')).rejects.toThrow('PB connection failed');

        // Plan stays published — update must NOT have been called
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('returns the updated plan record from pb.update', async () => {
        mockDeactivateForPlan.mockResolvedValue(1);
        const expectedPlan = makeDraftPlan('plan-returned');
        const mockUpdate = vi.fn().mockResolvedValue(expectedPlan);
        (pb.collection as ReturnType<typeof vi.fn>).mockReturnValue({
            update: mockUpdate,
        });

        const { revertToDraft } = await import('../plans');
        const result = await revertToDraft('plan-returned');

        expect(result).toEqual(expectedPlan);
    });
});
