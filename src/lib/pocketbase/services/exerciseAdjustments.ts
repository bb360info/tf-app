import pb from '../client';
import { Collections } from '../collections';
import type { RecordModel } from 'pocketbase';
import type { ExerciseAdjustmentsRecord } from '../types';

export type ExerciseAdjustmentRecord = ExerciseAdjustmentsRecord & RecordModel;

export interface AdjustmentInput {
    plan_exercise_id: string;
    athlete_id: string;
    sets?: number;
    reps?: string;
    intensity?: string;
    weight?: number;
    duration?: number;
    distance?: number;
    rest_seconds?: number;
    notes?: string;
    skip?: boolean;
}

/**
 * Upsert an exercise adjustment.
 * UNIQUE constraint: (plan_exercise_id, athlete_id) — updates existing if found.
 */
export async function upsertAdjustment(input: AdjustmentInput): Promise<ExerciseAdjustmentRecord> {
    try {
        const existing = await pb.collection(Collections.EXERCISE_ADJUSTMENTS)
            .getFirstListItem<ExerciseAdjustmentRecord>(
                pb.filter(
                    'plan_exercise_id = {:eid} && athlete_id = {:aid} && deleted_at = ""',
                    { eid: input.plan_exercise_id, aid: input.athlete_id }
                )
            );
        return pb.collection(Collections.EXERCISE_ADJUSTMENTS)
            .update<ExerciseAdjustmentRecord>(existing.id, input);
    } catch {
        // 404 → no existing adjustment, create new
        return pb.collection(Collections.EXERCISE_ADJUSTMENTS)
            .create<ExerciseAdjustmentRecord>(input);
    }
}

/**
 * Soft-delete an adjustment (athlete restores to base plan).
 */
export async function removeAdjustment(id: string): Promise<void> {
    await pb.collection(Collections.EXERCISE_ADJUSTMENTS)
        .update(id, { deleted_at: new Date().toISOString() });
}

/**
 * List all active adjustments for an athlete within a specific plan.
 * Used before rendering exercises to merge overrides.
 */
export async function listAdjustmentsForPlan(
    planId: string,
    athleteId: string
): Promise<ExerciseAdjustmentRecord[]> {
    return pb.collection(Collections.EXERCISE_ADJUSTMENTS)
        .getFullList<ExerciseAdjustmentRecord>({
            filter: pb.filter(
                'plan_exercise_id.plan_id = {:pid} && athlete_id = {:aid} && deleted_at = ""',
                { pid: planId, aid: athleteId }
            ),
        });
}
