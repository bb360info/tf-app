/**
 * autoAssignment.test.ts — Track 4.265 Phase 3
 * Tests for auto-assign on publishPlan() (step 3.6)
 *
 * Feature: when a season has athlete_id or group_id, publishPlan()
 * automatically creates a plan_assignment (idempotent, non-blocking).
 * Override plans skip this step entirely.
 *
 * Strategy: Instead of mocking planAssignments module directly,
 * we spy on pb.collection(...).create to verify assignment creation.
 * This is more robust against Vitest dynamic import caching.
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

vi.mock('@/lib/pocketbase/services/snapshots', () => ({
    createSnapshot: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/pocketbase/services/notifications', () => ({
    sendNotification: vi.fn().mockResolvedValue(undefined),
    batchCheckPreferences: vi.fn().mockResolvedValue(new Set()),
}));

vi.mock('@/lib/pocketbase/services/groups', () => ({
    listGroupMembers: vi.fn().mockResolvedValue([]),
}));

import pb from '@/lib/pocketbase/client';

// ─── Helpers ──────────────────────────────────────────────────────

type PlanRecord = Record<string, unknown>;

function makePlan(overrides: PlanRecord = {}): PlanRecord {
    return {
        id: 'plan-w1',
        phase_id: 'phase-1',
        week_number: 1,
        status: 'published',
        plan_type: 'phase_based',
        deleted_at: '',
        ...overrides,
    };
}

/**
 * Create per-call collection mocks.
 * Tracks calls to `create` to assert plan_assignment creation.
 */
function setupPbMock(publishedPlan: PlanRecord, season: PlanRecord = {}) {
    const planId = String(publishedPlan.id ?? 'plan-w1');
    const mockPhase = { id: 'phase-1', season_id: 'season-1' };
    const mockSeason = { id: 'season-1', athlete_id: '', group_id: '', ...season };

    const mockCreate = vi.fn().mockResolvedValue({ id: 'assign-new', status: 'active' });

    (pb.collection as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        update: vi.fn().mockResolvedValue(publishedPlan),
        getFullList: vi.fn().mockResolvedValue([]),
        getFirstListItem: vi.fn().mockRejectedValue(
            Object.assign(new Error('Not found'), { status: 404 })
        ),
        create: mockCreate,
        getOne: vi.fn().mockImplementation((id: string) => {
            if (id === planId) return Promise.resolve({ ...publishedPlan, status: 'published' });
            if (id === 'phase-1') return Promise.resolve(mockPhase);
            if (id === 'season-1') return Promise.resolve(mockSeason);
            return Promise.reject(new Error(`Unexpected getOne("${id}")`));
        }),
    }));

    return { mockCreate };
}

// ─── Tests ────────────────────────────────────────────────────────

describe('publishPlan — auto-assign on publish (step 3.6, Phase 3)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates plan_assignment when season has athlete_id', async () => {
        // season.athlete_id set → expect pb.create({ plan_id, athlete_id })
        const publishedPlan = makePlan();
        const { mockCreate } = setupPbMock(publishedPlan, { athlete_id: 'athlete-42' });

        const { publishPlan } = await import('../plans');
        await publishPlan('plan-w1');

        // Allow fire-and-forget step 3.6 to complete
        await new Promise(r => setTimeout(r, 60));

        // Assert: create was called with athlete_id assignment params
        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({ plan_id: 'plan-w1', athlete_id: 'athlete-42', status: 'active' })
        );
    });

    it('creates plan_assignment when season has group_id', async () => {
        // season.group_id set → expect pb.create({ plan_id, group_id })
        const publishedPlan = makePlan();
        const { mockCreate } = setupPbMock(publishedPlan, { group_id: 'group-99' });

        const { publishPlan } = await import('../plans');
        await publishPlan('plan-w1');

        await new Promise(r => setTimeout(r, 60));

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({ plan_id: 'plan-w1', group_id: 'group-99', status: 'active' })
        );
    });

    it('skips auto-assign entirely for override plan_type', async () => {
        // plan_type='override' → step 3.6 is guarded by if(published.plan_type !== 'override')
        const overridePlan = makePlan({ plan_type: 'override' });
        const { mockCreate } = setupPbMock(overridePlan, { athlete_id: 'athlete-42' });

        const { publishPlan } = await import('../plans');
        await publishPlan('plan-w1');

        await new Promise(r => setTimeout(r, 60));

        // The pb.create for PLAN_ASSIGNMENTS should NOT be called
        // (update() mock is called for status change — but not create)
        const assignmentCreates = mockCreate.mock.calls.filter(
            call => call[0]?.plan_id !== undefined && call[0]?.status === 'active'
        );
        expect(assignmentCreates).toHaveLength(0);
    });
});
