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

/**
 * Strict interface for plan exercises with expand.
 * All fields are explicit — no [key: string]: any.
 * TypeScript will catch field-name typos at compile time.
 * [Track 4.266 Phase 2]
 */
export interface PlanExerciseStrict extends PlanExercisesRecord, RecordModel {
    expand?: {
        exercise_id?: ExercisesRecord & RecordModel;
    };
    /** set by applyAdjustments — signals ⚡ badge in UI */
    _adjusted?: boolean;
}

/** Backward-compatible alias — 40+ components use this name, no changes needed */
export type PlanExerciseWithExpand = PlanExerciseStrict;

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
    plan_type?: 'phase_based' | 'standalone' | 'override';
}): Promise<PlanWithExercises> {
    return pb.collection(Collections.TRAINING_PLANS).create<PlanWithExercises>({
        ...data,
        status: data.status ?? 'draft',
        // [Track 4.263] plan_type is required — phase-based plans always use 'phase_based'
        plan_type: data.plan_type ?? 'phase_based',
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

/**
 * Find an existing plan for phase+week WITHOUT creating one.
 * Returns null if no plan exists yet.
 * [Track 4.267 Phase 2] Used by usePlanData to avoid creating "garbage" drafts.
 */
export async function getExistingPlan(
    phaseId: string,
    weekNumber: number
): Promise<PlanWithExercises | null> {
    try {
        return await pb
            .collection(Collections.TRAINING_PLANS)
            .getFirstListItem<PlanWithExercises>(
                pb.filter(
                    'phase_id = {:phaseId} && week_number = {:weekNumber} && deleted_at = ""',
                    { phaseId, weekNumber }
                ),
                { expand: 'plan_exercises(plan_id).exercise_id' }
            );
    } catch {
        return null;
    }
}

/**
 * Ensure a plan exists for phase+week — lazy create on first coach action.
 * [Track 4.267 Phase 2] Call this only when the coach actually adds something.
 */
export async function ensurePlan(
    phaseId: string,
    weekNumber: number
): Promise<PlanWithExercises> {
    const existing = await getExistingPlan(phaseId, weekNumber);
    if (existing) return existing;
    const created = await createPlan({ phase_id: phaseId, week_number: weekNumber });
    return { ...created, expand: { 'plan_exercises(plan_id)': [] } };
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

    // Step 3.5: auto-deactivate sibling assignments (SAME phase + week)
    // [Track 4.267] Changed from fire-and-forget to synchronous — eliminates race condition
    // [Track 4.265] Guard: override plans never have assignments — skip entirely
    if (published.plan_type !== 'override' && published.phase_id) {
        try {
            const { deactivateSiblings } = await import('./assignmentLifecycle');
            await deactivateSiblings(planId, published.phase_id, published.week_number ?? 0);
        } catch (deactivateErr) {
            console.warn('[publishPlan] sibling deactivation failed:', deactivateErr);
        }
    }

    // Step 3.6: auto-assign to season athlete/group (idempotent, skip override)
    // [Post Track 4.265 BugFix #2] Changed from fire-and-forget to await.
    // Previously: publishPlan() returned BEFORE auto-assign completed.
    // Consequence: loadAssignments() in UI ran before assignments existed → showed "no assignments".
    if (published.plan_type !== 'override') {
        try {
            const { assignPlanToAthlete, assignPlanToGroup } = await import('./planAssignments');
            if (published.phase_id) {
                const phase = await pb.collection(Collections.TRAINING_PHASES).getOne(published.phase_id);
                if (phase.season_id) {
                    const season = await pb.collection(Collections.SEASONS).getOne(phase.season_id);
                    if (season.athlete_id) {
                        await assignPlanToAthlete(published.id, season.athlete_id);
                    } else if (season.group_id) {
                        await assignPlanToGroup(published.id, season.group_id);
                    }
                }
            }
        } catch (autoAssignErr) {
            console.warn('Auto-assign on publish failed (non-blocking):', autoAssignErr);
        }
    }

    // 4. Notify assigned athletes + season members (fire-and-forget, non-blocking)
    void (async () => {
        try {
            const { listActivePlanAssignments } = await import('./planAssignments');
            const { sendNotification, batchCheckPreferences } = await import('./notifications');
            const { listGroupMembers } = await import('./groups');

            const assignments = await listActivePlanAssignments(planId);
            const userIds: string[] = [];

            // 4a. Collect from plan_assignments (direct + group)
            for (const assignment of assignments) {
                if (assignment.athlete_id) {
                    const athlete = assignment.expand?.athlete_id as (typeof assignment.expand extends { athlete_id?: infer A } ? A : never) | undefined;
                    const userId = (athlete as unknown as { user_id?: string } | undefined)?.user_id ?? '';
                    if (userId) userIds.push(userId);
                } else if (assignment.group_id) {
                    const members = await listGroupMembers(assignment.group_id);
                    for (const m of members) {
                        const userId = m.expand?.athlete_id?.user_id ?? '';
                        if (userId) userIds.push(userId);
                    }
                }
            }

            // 4b. Season membership: athletes in the season (no explicit assignment needed)
            if (published.phase_id) {
                try {
                    const phase = await pb.collection(Collections.TRAINING_PHASES).getOne(published.phase_id);
                    if (phase.season_id) {
                        const season = await pb.collection(Collections.SEASONS).getOne(phase.season_id);

                        // Direct season athlete
                        if (season.athlete_id) {
                            const athlete = await pb.collection(Collections.ATHLETES).getOne(season.athlete_id);
                            const userId = (athlete as unknown as { user_id?: string })?.user_id;
                            if (userId) userIds.push(userId);
                        }

                        // Group-based season
                        if (season.group_id) {
                            const members = await listGroupMembers(season.group_id);
                            for (const m of members) {
                                const userId = m.expand?.athlete_id?.user_id ?? '';
                                if (userId) userIds.push(userId);
                            }
                        }
                    }
                } catch {
                    /* season resolution failed — non-blocking */
                }
            }

            // Deduplicate
            const uniqueUserIds = [...new Set(userIds)];
            if (uniqueUserIds.length === 0) return;

            // Batch check preferences — 1 HTTP call instead of N
            const allowed = await batchCheckPreferences(uniqueUserIds, 'plan_published');

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

/**
 * Publish all draft plans in a phase sequentially (SQLite-safe).
 * Skips override plans (they have no assignments).
 * Returns count of successfully published plans.
 * [Track 4.265 Phase 2]
 */
export async function publishAllDrafts(phaseId: string): Promise<number> {
    const plans = await listPlansForPhase(phaseId);
    const drafts = plans.filter(p => p.status === 'draft' && p.plan_type !== 'override');
    let count = 0;
    for (const draft of drafts) {
        try {
            await publishPlan(draft.id);
            count++;
        } catch (err) {
            console.warn(`publishAllDrafts: plan ${draft.id} failed (continuing):`, err);
        }
    }
    return count;
}

/** Restore a plan to draft from any status.
 * [Track 4.267] Deactivates all active assignments BEFORE reverting.
 * Without this, athletes continue seeing plans the coach considers drafts.
 */
export async function revertToDraft(planId: string): Promise<PlanWithExercises> {
    // Deactivate assignments first — if this fails, plan stays published (safe)
    const { deactivateForPlan } = await import('./assignmentLifecycle');
    await deactivateForPlan(planId);

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

    // [Track 4.266 Phase 2] start_date = today enables 14-day boundary in planResolution
    const { todayForUser } = await import('@/lib/utils/dateHelpers');
    const today = todayForUser();

    // 3. Create the override plan (status = 'published' immediately)
    const overridePlan = await pb
        .collection(Collections.TRAINING_PLANS)
        .create<TrainingPlansRecord>({
            phase_id: originalPlan.phase_id,
            week_number: originalPlan.week_number,
            status: 'published' as PlanStatus,
            // [Track 4.263] plan_type is required — override plans use 'override'
            plan_type: 'override' as import('../types').PlanType,
            notes: originalPlan.notes ?? '',
            day_notes: originalPlan.day_notes ?? {},
            parent_plan_id: planId,   // link to master
            athlete_id: athleteId,    // personalized for this athlete
            start_date: today,        // [Track 4.266] boundary for 14-day override resolution
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

/**
 * Duplicate all main exercises from one week to another within the same phase.
 * Used for "Duplicate Previous Week" feature in WeekConstructor.
 * Sequential inserts for SQLite safety. Warmup block items are NOT copied.
 * [Track 4.265 Phase 6]
 * [Track 4.267] Guard: throws if destination plan is already published.
 */
export async function duplicatePlanWeek(
    phaseId: string,
    fromWeek: number,
    toWeek: number
): Promise<void> {
    // 1. Find source plan
    let sourcePlan: PlanWithExercises | null = null;
    try {
        sourcePlan = await pb
            .collection(Collections.TRAINING_PLANS)
            .getFirstListItem<PlanWithExercises>(
                pb.filter(
                    'phase_id = {:phaseId} && week_number = {:fromWeek} && deleted_at = ""',
                    { phaseId, fromWeek }
                )
            );
    } catch {
        // No source plan — nothing to copy
        return;
    }

    // 2. Get source exercises (main block only — no warmup copy)
    const sourceExercises = await pb
        .collection(Collections.PLAN_EXERCISES)
        .getFullList<PlanExerciseWithExpand>({
            filter: pb.filter(
                'plan_id = {:planId} && deleted_at = "" && block != "warmup"',
                { planId: sourcePlan.id }
            ),
            sort: 'day_of_week,order',
        });

    if (sourceExercises.length === 0) return;

    // 3. Get or create destination plan
    const destPlan = await getOrCreatePlan(phaseId, toWeek);

    // [Track 4.267] Guard: NEVER overwrite a published plan — data loss risk
    if (destPlan.status === 'published') {
        throw new Error(
            'Cannot duplicate into a published plan. Revert it to draft first.'
        );
    }

    // 4. Soft-delete existing exercises in destination (safe — can be recovered)
    const existingDestExs = await pb
        .collection(Collections.PLAN_EXERCISES)
        .getFullList({
            filter: pb.filter('plan_id = {:planId} && deleted_at = ""', { planId: destPlan.id }),
            fields: 'id',
        });
    for (const ex of existingDestExs) {
        await pb.collection(Collections.PLAN_EXERCISES).update(ex.id, {
            deleted_at: new Date().toISOString(),
        });
    }

    // 5. Copy exercises sequentially
    for (const ex of sourceExercises) {
        await pb.collection(Collections.PLAN_EXERCISES).create({
            plan_id: destPlan.id,
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
        });
    }
}

