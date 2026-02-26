/**
 * PocketBase Service: Training Plans & Plan Exercises
 * CRUD for weekly training plans and their exercises.
 */

import pb from '../client';
import { Collections } from '../collections';
import type {
    TrainingPlansRecord,
    PlanExercisesRecord,
    ExercisesRecord,
    PlanStatus,
} from '../types';
import type { RecordModel } from 'pocketbase';

// ─── Type Helpers ────────────────────────────────────────────────

export type PlanExerciseWithExpand = PlanExercisesRecord &
    RecordModel & {
        expand?: {
            exercise_id?: ExercisesRecord & RecordModel;
        };
    };

export type PlanWithExercises = TrainingPlansRecord &
    RecordModel & {
        expand?: {
            'plan_exercises(plan_id)'?: PlanExerciseWithExpand[];
        };
    };

// ─── Training Plans ──────────────────────────────────────────────

/** List plans for a phase, sorted by week_number */
export async function listPlansForPhase(phaseId: string): Promise<PlanWithExercises[]> {
    const result = await pb.collection(Collections.TRAINING_PLANS).getFullList<PlanWithExercises>({
        filter: pb.filter('phase_id = {:phaseId} && deleted_at = ""', { phaseId }),
        sort: 'week_number',
        // Debug: Try simple expand first
        expand: 'plan_exercises(plan_id).exercise_id',
    });
    return result;
}

/** Get a single plan with all exercises expanded */
export async function getPlan(id: string): Promise<PlanWithExercises> {
    return pb.collection(Collections.TRAINING_PLANS).getOne<PlanWithExercises>(id, {
        expand: 'plan_exercises(plan_id).exercise_id',
    });
}

/** Create a new training plan */
export async function createPlan(data: {
    phase_id: string;
    week_number: number;
    status?: PlanStatus;
    notes?: string;
}): Promise<PlanWithExercises> {
    return pb.collection(Collections.TRAINING_PLANS).create<PlanWithExercises>({
        ...data,
        status: data.status ?? 'draft',
    });
}

/** Update a training plan */
export async function updatePlan(
    id: string,
    data: Partial<Pick<TrainingPlansRecord, 'status' | 'notes' | 'week_number' | 'day_notes'>>
): Promise<PlanWithExercises> {
    return pb.collection(Collections.TRAINING_PLANS).update<PlanWithExercises>(id, data);
}

/** Soft-delete a training plan */
export async function deletePlan(id: string): Promise<void> {
    await pb.collection(Collections.TRAINING_PLANS).update(id, {
        deleted_at: new Date().toISOString(),
    });
}

/** Get or create a plan for a specific phase+week */
export async function getOrCreatePlan(
    phaseId: string,
    weekNumber: number
): Promise<PlanWithExercises> {
    try {
        const existing = await pb
            .collection(Collections.TRAINING_PLANS)
            .getFirstListItem<PlanWithExercises>(
                pb.filter('phase_id = {:phaseId} && week_number = {:weekNumber} && deleted_at = ""', { phaseId, weekNumber }),
                { expand: 'plan_exercises(plan_id).exercise_id' }
            );
        return existing;
    } catch {
        // Not found — create a new one
        const created = await createPlan({ phase_id: phaseId, week_number: weekNumber });
        return { ...created, expand: { 'plan_exercises(plan_id)': [] } };
    }
}

// ─── Plan Exercises ──────────────────────────────────────────────

/** List exercises for a plan, sorted by day then order */
export async function listPlanExercises(planId: string): Promise<PlanExerciseWithExpand[]> {
    return pb.collection(Collections.PLAN_EXERCISES).getFullList<PlanExerciseWithExpand>({
        filter: pb.filter('plan_id = {:planId} && deleted_at = ""', { planId }),
        sort: 'day_of_week,order',
        expand: 'exercise_id',
    });
}

/** Add an exercise to a plan */
export async function addExerciseToPlan(data: {
    plan_id: string;
    exercise_id: string;
    day_of_week: number; // 0=Mon, 6=Sun
    session?: number;   // 0=AM (default), 1=PM
    order: number;
    sets?: number;
    reps?: string;
    intensity?: string;
    notes?: string;
    weight?: number;
    duration?: number;
    distance?: number;
    rest_seconds?: number;
}): Promise<PlanExerciseWithExpand> {
    return pb.collection(Collections.PLAN_EXERCISES).create<PlanExerciseWithExpand>(data, {
        expand: 'exercise_id',
    });
}

/** Update a plan exercise (sets, reps, intensity, order, day, unit-specific fields) */
export async function updatePlanExercise(
    id: string,
    data: Partial<Pick<PlanExercisesRecord,
        'sets' | 'reps' | 'intensity' | 'notes' | 'order' | 'day_of_week' | 'session'
        | 'weight' | 'duration' | 'distance' | 'rest_seconds'
    >>
): Promise<PlanExerciseWithExpand> {
    return pb.collection(Collections.PLAN_EXERCISES).update<PlanExerciseWithExpand>(id, data, {
        expand: 'exercise_id',
    });
}

/** Soft-delete a plan exercise */
export async function removePlanExercise(id: string): Promise<void> {
    await pb.collection(Collections.PLAN_EXERCISES).update(id, {
        deleted_at: new Date().toISOString(),
    });
}

/** Batch reorder exercises within a day */
export async function reorderExercises(
    exercises: Array<{ id: string; order: number }>
): Promise<void> {
    await Promise.all(
        exercises.map((ex) =>
            pb.collection(Collections.PLAN_EXERCISES).update(ex.id, { order: ex.order })
        )
    );
}

// ─── Helpers ─────────────────────────────────────────────────────

/** Group plan exercises by day_of_week (0-6) */
export function groupByDay(
    exercises: PlanExerciseWithExpand[]
): Record<number, PlanExerciseWithExpand[]> {
    const grouped: Record<number, PlanExerciseWithExpand[]> = {};
    for (let d = 0; d < 7; d++) grouped[d] = [];
    for (const ex of exercises) {
        const day = ex.day_of_week ?? 0;
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(ex);
    }
    // Sort each day by order
    for (const day of Object.keys(grouped)) {
        grouped[Number(day)].sort((a, b) => a.order - b.order);
    }
    return grouped;
}

/**
 * Group plan exercises by day_of_week → session → exercises[]
 * session 0 = AM, session 1 = PM
 * Returns: Record<day(0-6), Record<session(0|1), PlanExerciseWithExpand[]>>
 */
export function groupByDayAndSession(
    exercises: PlanExerciseWithExpand[]
): Record<number, Record<number, PlanExerciseWithExpand[]>> {
    const grouped: Record<number, Record<number, PlanExerciseWithExpand[]>> = {};
    for (let d = 0; d < 7; d++) grouped[d] = { 0: [] };

    for (const ex of exercises) {
        const day = ex.day_of_week ?? 0;
        const session = ex.session ?? 0;
        if (!grouped[day]) grouped[day] = {};
        if (!grouped[day][session]) grouped[day][session] = [];
        grouped[day][session].push(ex);
    }

    // Sort each day/session by order
    for (const day of Object.keys(grouped)) {
        for (const session of Object.keys(grouped[Number(day)])) {
            grouped[Number(day)][Number(session)].sort((a, b) => a.order - b.order);
        }
    }
    return grouped;
}

/** Calculate weekly CNS load summary (warmup block excluded) */
export function calculateWeeklyCNS(
    exercises: PlanExerciseWithExpand[]
): { total: number; highCount: number; status: 'green' | 'yellow' | 'red' } {
    let total = 0;

    for (const ex of exercises) {
        // Warmup items do not contribute to CNS load
        if (ex.block === 'warmup') continue;
        const cnsCost = ex.expand?.exercise_id?.cns_cost ?? 2;
        total += cnsCost;
    }

    const status: 'green' | 'yellow' | 'red' =
        total > 20 ? 'red' : total > 10 ? 'yellow' : 'green';

    return { total, highCount: 0, status };
}

// ─── Plan Lifecycle ───────────────────────────────────────────────

/** Publish a plan: draft → published (makes it read-only for athletes)
 * Automatically creates a snapshot of the current plan exercises before publishing.
 */
export async function publishPlan(planId: string): Promise<PlanWithExercises> {
    // 1. Load current exercises to snapshot
    const exercises = await listPlanExercises(planId);

    // 2. Create snapshot (non-blocking — if it fails, still publish)
    try {
        const { createSnapshot } = await import('./snapshots');
        await createSnapshot(planId, {
            exercises: exercises.map((ex) => ({
                id: ex.id,
                exercise_id: ex.exercise_id,
                order: ex.order,
                day_of_week: ex.day_of_week,
                sets: ex.sets,
                reps: ex.reps,
                intensity: ex.intensity,
                notes: ex.notes,
                exerciseName: ex.expand?.exercise_id?.name_en ?? '',
            })),
            publishedAt: new Date().toISOString(),
            exerciseCount: exercises.length,
        });
    } catch (snapErr) {
        console.warn('Snapshot creation failed (non-blocking):', snapErr);
    }

    // 3. Update plan status to published
    const published = await pb.collection(Collections.TRAINING_PLANS).update<PlanWithExercises>(planId, {
        status: 'published' as PlanStatus,
    });

    // Step 3.5: auto-deactivate assignments from other plans in the same phase (non-blocking)
    void (async () => {
        try {
            const { unassignPlan, listPlanAssignments } = await import('./planAssignments');
            const siblingPlans = await pb.collection(Collections.TRAINING_PLANS).getFullList({
                filter: pb.filter(
                    'phase_id = {:phaseId} && id != {:planId} && deleted_at = ""',
                    { phaseId: published.phase_id, planId }
                ),
                fields: 'id',
            });
            for (const sibling of siblingPlans) {
                const assignments = await listPlanAssignments(sibling.id);
                for (const a of assignments) {
                    await unassignPlan(a.id);
                }
            }
        } catch (deactivateErr) {
            console.warn('Auto-deactivate sibling assignments failed (non-blocking):', deactivateErr);
        }
    })();

    // 4. Notify assigned athletes (fire-and-forget, non-blocking)
    void (async () => {
        try {
            const { listActivePlanAssignments } = await import('./planAssignments');
            const { sendNotification, batchCheckPreferences } = await import('./notifications');
            const { listGroupMembers } = await import('./groups');

            const assignments = await listActivePlanAssignments(planId);
            const userIds: string[] = [];

            for (const assignment of assignments) {
                if (assignment.athlete_id) {
                    // Direct athlete assignment: resolve user_id
                    const athlete = assignment.expand?.athlete_id as (typeof assignment.expand extends { athlete_id?: infer A } ? A : never) | undefined;
                    const userId = (athlete as unknown as { user_id?: string } | undefined)?.user_id ?? '';
                    if (userId) userIds.push(userId);
                } else if (assignment.group_id) {
                    // Group assignment: resolve all group members' user_ids
                    const members = await listGroupMembers(assignment.group_id);
                    for (const m of members) {
                        const userId = m.expand?.athlete_id?.user_id ?? '';
                        if (userId) userIds.push(userId);
                    }
                }
            }

            if (userIds.length === 0) return;

            // Batch check preferences — 1 HTTP call instead of N
            const allowed = await batchCheckPreferences(userIds, 'plan_published');

            await Promise.all(
                [...allowed].map((userId) =>
                    sendNotification({
                        userId,
                        type: 'plan_published',
                        messageKey: 'planPublished',
                        messageParams: { week: published.week_number ?? '' },
                    })
                )
            );
        } catch (notifErr) {
            console.warn('Notification send failed (non-blocking):', notifErr);
        }
    })();

    return published;
}


/** Archive a plan (soft-removes it from active view) */
export async function archivePlan(planId: string): Promise<PlanWithExercises> {
    return pb.collection(Collections.TRAINING_PLANS).update<PlanWithExercises>(planId, {
        status: 'archived' as PlanStatus,
    });
}

/** Restore a plan to draft from any status */
export async function revertToDraft(planId: string): Promise<PlanWithExercises> {
    return pb.collection(Collections.TRAINING_PLANS).update<PlanWithExercises>(planId, {
        status: 'draft' as PlanStatus,
    });
}

// ─── Individual Overrides ─────────────────────────────────────────

/**
 * Create an individual override: a published copy of an existing plan
 * personalized for a specific athlete.
 *
 * Override resolution priority (in getPublishedPlanForToday):
 *   Step 0: override (athlete_id + parent_plan_id set ON training_plans)
 *   Step 1: plan_assignments direct
 *   Step 2: plan_assignments via group
 *   Step 3: season fallback
 *
 * @throws If planId is itself an override (chain prevention)
 */
export async function createIndividualOverride(
    planId: string,
    athleteId: string
): Promise<PlanWithExercises> {
    // 1. Fetch original plan
    const originalPlan = await pb
        .collection(Collections.TRAINING_PLANS)
        .getOne<TrainingPlansRecord>(planId);

    // Guard: prevent chain of overrides (override → override)
    if (originalPlan.parent_plan_id) {
        throw new Error(
            'Cannot create override from an existing override. Use the original plan.'
        );
    }

    // Guard: only published plans can be overridden
    if (originalPlan.status !== 'published') {
        throw new Error('Can only create overrides from published plans.');
    }

    // 2. Fetch all exercises from the original plan
    const originalExercises = await listPlanExercises(planId);

    // 3. Create the override plan (status = 'published' immediately)
    const overridePlan = await pb
        .collection(Collections.TRAINING_PLANS)
        .create<TrainingPlansRecord>({
            phase_id: originalPlan.phase_id,
            week_number: originalPlan.week_number,
            status: 'published' as PlanStatus,
            notes: originalPlan.notes ?? '',
            day_notes: originalPlan.day_notes ?? {},
            parent_plan_id: planId,   // link to master
            athlete_id: athleteId,    // personalized for this athlete
        });

    // 4. Copy exercises SEQUENTIALLY (SQLite safety — avoid parallel INSERT lock)
    for (const ex of originalExercises) {
        await pb.collection(Collections.PLAN_EXERCISES).create({
            plan_id: overridePlan.id,
            exercise_id: ex.exercise_id,
            day_of_week: ex.day_of_week ?? 0,
            session: ex.session ?? 0,
            block: ex.block ?? 'main',
            order: ex.order,
            sets: ex.sets,
            reps: ex.reps,
            intensity: ex.intensity,
            notes: ex.notes,
            weight: ex.weight,
            duration: ex.duration,
            distance: ex.distance,
            rest_seconds: ex.rest_seconds,
            custom_text_ru: ex.custom_text_ru,
            custom_text_en: ex.custom_text_en,
            custom_text_cn: ex.custom_text_cn,
            // source_template_id intentionally NOT copied — override is independent
        });
    }

    // 5. Return override with exercises expanded
    return pb
        .collection(Collections.TRAINING_PLANS)
        .getOne<PlanWithExercises>(overridePlan.id, {
            expand: 'plan_exercises(plan_id).exercise_id',
        });
}

/**
 * List all overrides for a given plan.
 * Used by SeasonDetail to show override details.
 */
export async function listOverridesForPlan(
    planId: string
): Promise<(TrainingPlansRecord & { expand?: { athlete_id?: { id: string; name: string } } })[]> {
    return pb.collection(Collections.TRAINING_PLANS).getFullList({
        filter: pb.filter(
            'parent_plan_id = {:pid} && deleted_at = ""',
            { pid: planId }
        ),

        expand: 'athlete_id',
    });
}

/**
 * Count overrides for all plans in a phase.
 * Efficient single query — used for "N overrides" badge in PhaseCard.
 */
export async function countOverridesForPhase(phaseId: string): Promise<number> {
    try {
        const result = await pb
            .collection(Collections.TRAINING_PLANS)
            .getList(1, 1, {
                filter: pb.filter(
                    'phase_id = {:pid} && parent_plan_id != "" && deleted_at = ""',
                    { pid: phaseId }
                ),
                fields: 'id',
            });
        return result.totalItems;
    } catch {
        /* expected: 404 or no overrides exist */
        return 0;
    }
}
