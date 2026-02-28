/**
 * publishPlan.test.ts — Track 4.267 (updated)
 * Tests for deactivation scope in publishPlan()
 *
 * [Track 4.267] Updated: publishPlan now uses assignmentLifecycle.deactivateSiblings
 * instead of inline listPlanAssignments/unassignPlan.
 * Deactivation is synchronous (awaited), no more fire-and-forget.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks setup ──────────────────────────────────────────────────

const mockDeactivateSiblings = vi.fn().mockResolvedValue(0);

// Mock the pb client
vi.mock('@/lib/pocketbase/client', () => ({
    default: {
        collection: vi.fn(),
        filter: (tpl: string, vals: Record<string, unknown>) => {
            return Object.entries(vals).reduce(
                (acc, [k, v]) => acc.replace(`{:${k}}`, String(v)),
                tpl
            );
        },
    },
}));

// Mock assignmentLifecycle (replaces old planAssignments mock)
vi.mock('@/lib/pocketbase/services/assignmentLifecycle', () => ({
    deactivateSiblings: mockDeactivateSiblings,
}));

// Mock planAssignments — still needed for auto-assign (step 3.6)
vi.mock('@/lib/pocketbase/services/planAssignments', () => ({
    assignPlanToAthlete: vi.fn().mockResolvedValue({ id: 'assign-new', status: 'active' }),
    assignPlanToGroup: vi.fn().mockResolvedValue({ id: 'assign-new', status: 'active' }),
    listActivePlanAssignments: vi.fn().mockResolvedValue([]),
}));

// Mock snapshots (non-blocking inside publishPlan)
vi.mock('@/lib/pocketbase/services/snapshots', () => ({
    createSnapshot: vi.fn().mockResolvedValue(undefined),
}));

// Mock notifications (non-blocking)
vi.mock('@/lib/pocketbase/services/notifications', () => ({
    sendNotification: vi.fn().mockResolvedValue(undefined),
    batchCheckPreferences: vi.fn().mockResolvedValue(new Set()),
}));

// Mock groups
vi.mock('@/lib/pocketbase/services/groups', () => ({
    listGroupMembers: vi.fn().mockResolvedValue([]),
}));

import pb from '@/lib/pocketbase/client';

// ─── Helpers ──────────────────────────────────────────────────────

function makePlan(overrides: Record<string, unknown> = {}) {
    return {
        id: 'plan-w3',
        phase_id: 'phase-1',
        week_number: 3,
        status: 'draft',
        plan_type: 'phase_based',
        deleted_at: '',
        ...overrides,
    };
}

function setupPbMock(publishedPlan: Record<string, unknown>) {
    const mockUpdate = vi.fn().mockResolvedValue(publishedPlan);

    (pb.collection as ReturnType<typeof vi.fn>).mockReturnValue({
        getFullList: vi.fn().mockResolvedValue([]),
        update: mockUpdate,
        getOne: vi.fn().mockResolvedValue({ season_id: null }),
    });

    return { mockUpdate };
}

// ─── Tests ────────────────────────────────────────────────────────

describe('publishPlan — deactivation scope (Track 4.267)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls deactivateSiblings with correct params for phase_based plan', async () => {
        const publishedPlan = makePlan({ status: 'published' });
        setupPbMock(publishedPlan);

        const { publishPlan } = await import('../plans');
        await publishPlan('plan-w3');

        // [Track 4.267] deactivateSiblings is called synchronously (no setTimeout needed)
        expect(mockDeactivateSiblings).toHaveBeenCalledWith('plan-w3', 'phase-1', 3);
        expect(mockDeactivateSiblings).toHaveBeenCalledTimes(1);
    });

    it('skips deactivation entirely for override plan_type', async () => {
        const overridePlan = makePlan({
            status: 'published',
            plan_type: 'override',
            parent_plan_id: 'plan-original',
            athlete_id: 'athlete-42',
        });

        setupPbMock(overridePlan);

        const { publishPlan } = await import('../plans');
        await publishPlan('plan-override');

        // Guard: override plans skip sibling deactivation entirely
        expect(mockDeactivateSiblings).not.toHaveBeenCalled();
    });

    it('skips deactivation when phase_id is falsy (standalone plans)', async () => {
        const standalonePlan = makePlan({
            status: 'published',
            phase_id: '',
            plan_type: 'standalone',
        });

        setupPbMock(standalonePlan);

        const { publishPlan } = await import('../plans');
        await publishPlan('plan-standalone');

        // Standalone plans have no phase → no siblings to deactivate
        expect(mockDeactivateSiblings).not.toHaveBeenCalled();
    });
});
