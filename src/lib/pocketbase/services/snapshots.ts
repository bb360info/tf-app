import pb from '../client';
import type { PlanSnapshotsRecord } from '../types';

export interface PlanSnapshot extends PlanSnapshotsRecord {
    version: number;
    created: string;
    // snapshot field is JSON, typed generally as Record<string, unknown>
}

/**
 * Creates a new snapshot for a training plan.
 * Automatically increments version number.
 */
export async function createSnapshot(planId: string, snapshotData: Record<string, unknown>): Promise<PlanSnapshot> {
    // 1. Get last version to increment
    const last = await pb.collection('plan_snapshots').getList(1, 1, {
        filter: pb.filter('plan_id = {:planId}', { planId }),
        sort: '-version',
    });

    const version = (last.items.length > 0) ? last.items[0].version + 1 : 1;

    // 2. Create record
    const record = await pb.collection('plan_snapshots').create({
        plan_id: planId,
        snapshot: snapshotData,
        version: version,
    });

    return record as PlanSnapshot;
}

/**
 * Lists snapshots for a plan, ordered by version desc.
 */
export async function listSnapshots(planId: string): Promise<PlanSnapshot[]> {
    const list = await pb.collection('plan_snapshots').getList(1, 50, {
        filter: pb.filter('plan_id = {:planId}', { planId }),
        sort: '-version',
    });
    return list.items as PlanSnapshot[];
}

/**
 * Get a specific snapshot
 */
export async function getSnapshot(id: string): Promise<PlanSnapshot> {
    return await pb.collection('plan_snapshots').getOne(id);
}
