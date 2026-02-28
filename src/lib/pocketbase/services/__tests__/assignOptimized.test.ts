/**
 * assignOptimized.test.ts — Track 4.267 Phase 4
 * Tests for assignPlanToAthlete() and assignPlanToGroup() in planAssignments.ts
 *
 * [Track 4.267 Phase 1] Bug fix: replaced getPlan() (full expand) with
 * lightweight getOne(id, { fields: 'id,status' }) — saves 1 HTTP expand per assign call.
 *
 * Covers:
 *   - Lightweight status check (fields: 'id,status' — NOT a full expand)
 *   - Guard: throws for non-published plans
 *   - Create new assignment when not found (404 from getFirstListItem)
 *   - Reactivate existing inactive assignment
 *   - Return existing active assignment unchanged (idempotent)
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

function makeCollectionMock(overrides: Record<string, unknown> = {}) {
    return {
        getOne: vi.fn(),
        getFirstListItem: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        ...overrides,
    };
}

function makeAssignment(status: 'active' | 'inactive', id = 'assign-1') {
    return { id, status };
}

// ─── assignPlanToAthlete ──────────────────────────────────────────

describe('assignPlanToAthlete', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('uses getOne with fields="id,status" — NOT a full plan expand', async () => {
        const mockCollection = makeCollectionMock({
            getOne: vi.fn().mockResolvedValue({ id: 'plan-1', status: 'published' }),
            getFirstListItem: vi.fn().mockRejectedValue(
                Object.assign(new Error('Not found'), { status: 404 })
            ),
            create: vi.fn().mockResolvedValue(makeAssignment('active', 'new-assign')),
        });

        (pb.collection as ReturnType<typeof vi.fn>).mockReturnValue(mockCollection);

        const { assignPlanToAthlete } = await import('../planAssignments');
        await assignPlanToAthlete('plan-1', 'athlete-1');

        // getOne must be called with fields option — NOT a full expand
        expect(mockCollection.getOne).toHaveBeenCalledWith('plan-1', { fields: 'id,status' });
        // Verify no expand param (which would indicate getPlan usage)
        const callArgs = mockCollection.getOne.mock.calls[0][1];
        expect(callArgs).not.toHaveProperty('expand');
    });

    it('throws when plan status is not "published"', async () => {
        (pb.collection as ReturnType<typeof vi.fn>).mockReturnValue(
            makeCollectionMock({
                getOne: vi.fn().mockResolvedValue({ id: 'plan-1', status: 'draft' }),
            })
        );

        const { assignPlanToAthlete } = await import('../planAssignments');

        await expect(
            assignPlanToAthlete('plan-1', 'athlete-1')
        ).rejects.toThrow('Cannot assign plan: status is "draft", expected "published"');
    });

    it('creates new assignment when no existing assignment found (404)', async () => {
        const newAssignment = makeAssignment('active', 'created-assign');
        const mockCreate = vi.fn().mockResolvedValue(newAssignment);

        (pb.collection as ReturnType<typeof vi.fn>).mockReturnValue(
            makeCollectionMock({
                getOne: vi.fn().mockResolvedValue({ id: 'plan-1', status: 'published' }),
                getFirstListItem: vi.fn().mockRejectedValue(
                    Object.assign(new Error('Not found'), { status: 404 })
                ),
                create: mockCreate,
            })
        );

        const { assignPlanToAthlete } = await import('../planAssignments');
        const result = await assignPlanToAthlete('plan-1', 'athlete-42');

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                plan_id: 'plan-1',
                athlete_id: 'athlete-42',
                status: 'active',
            })
        );
        expect(result).toEqual(newAssignment);
    });

    it('reactivates an existing inactive assignment', async () => {
        const inactiveAssign = makeAssignment('inactive', 'existing-assign');
        const reactivatedAssign = makeAssignment('active', 'existing-assign');
        const mockUpdate = vi.fn().mockResolvedValue(reactivatedAssign);

        (pb.collection as ReturnType<typeof vi.fn>).mockReturnValue(
            makeCollectionMock({
                getOne: vi.fn().mockResolvedValue({ id: 'plan-1', status: 'published' }),
                getFirstListItem: vi.fn().mockResolvedValue(inactiveAssign),
                update: mockUpdate,
            })
        );

        const { assignPlanToAthlete } = await import('../planAssignments');
        const result = await assignPlanToAthlete('plan-1', 'athlete-1');

        expect(mockUpdate).toHaveBeenCalledWith('existing-assign', { status: 'active' });
        expect(result).toEqual(reactivatedAssign);
    });

    it('returns existing active assignment without creating or updating (idempotent)', async () => {
        const activeAssign = makeAssignment('active', 'already-active');
        const mockCreate = vi.fn();
        const mockUpdate = vi.fn();

        (pb.collection as ReturnType<typeof vi.fn>).mockReturnValue(
            makeCollectionMock({
                getOne: vi.fn().mockResolvedValue({ id: 'plan-1', status: 'published' }),
                getFirstListItem: vi.fn().mockResolvedValue(activeAssign),
                create: mockCreate,
                update: mockUpdate,
            })
        );

        const { assignPlanToAthlete } = await import('../planAssignments');
        const result = await assignPlanToAthlete('plan-1', 'athlete-1');

        expect(mockCreate).not.toHaveBeenCalled();
        expect(mockUpdate).not.toHaveBeenCalled();
        expect(result).toEqual(activeAssign);
    });
});

// ─── assignPlanToGroup ────────────────────────────────────────────

describe('assignPlanToGroup', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('uses getOne with fields="id,status" — NOT a full plan expand', async () => {
        const mockCollection = makeCollectionMock({
            getOne: vi.fn().mockResolvedValue({ id: 'plan-1', status: 'published' }),
            getFirstListItem: vi.fn().mockRejectedValue(
                Object.assign(new Error('Not found'), { status: 404 })
            ),
            create: vi.fn().mockResolvedValue(makeAssignment('active')),
        });

        (pb.collection as ReturnType<typeof vi.fn>).mockReturnValue(mockCollection);

        const { assignPlanToGroup } = await import('../planAssignments');
        await assignPlanToGroup('plan-1', 'group-1');

        expect(mockCollection.getOne).toHaveBeenCalledWith('plan-1', { fields: 'id,status' });
        const callArgs = mockCollection.getOne.mock.calls[0][1];
        expect(callArgs).not.toHaveProperty('expand');
    });

    it('throws for non-published plan', async () => {
        (pb.collection as ReturnType<typeof vi.fn>).mockReturnValue(
            makeCollectionMock({
                getOne: vi.fn().mockResolvedValue({ id: 'plan-1', status: 'archived' }),
            })
        );

        const { assignPlanToGroup } = await import('../planAssignments');

        await expect(
            assignPlanToGroup('plan-1', 'group-99')
        ).rejects.toThrow('Cannot assign plan: status is "archived", expected "published"');
    });

    it('creates new group assignment when not found', async () => {
        const mockCreate = vi.fn().mockResolvedValue(makeAssignment('active', 'new-group-assign'));

        (pb.collection as ReturnType<typeof vi.fn>).mockReturnValue(
            makeCollectionMock({
                getOne: vi.fn().mockResolvedValue({ id: 'plan-g', status: 'published' }),
                getFirstListItem: vi.fn().mockRejectedValue(
                    Object.assign(new Error('Not found'), { status: 404 })
                ),
                create: mockCreate,
            })
        );

        const { assignPlanToGroup } = await import('../planAssignments');
        await assignPlanToGroup('plan-g', 'group-42');

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                plan_id: 'plan-g',
                group_id: 'group-42',
                status: 'active',
            })
        );
    });
});
