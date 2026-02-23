/**
 * PocketBase Service: Training Logs & Log Exercises
 * Unified module — athlete records actual performance against a plan.
 * Replaces the old trainingLogs.ts (now a re-export shim).
 */

import pb from '../client';
import { Collections } from '../collections';
import type {
    TrainingLogsRecord,
    LogExercisesRecord,
    SetData,
    ExercisesRecord,
} from '../types';
import type { RecordModel } from 'pocketbase';
import type { PlanWithExercises } from './plans';

// ─── Type Helpers ─────────────────────────────────────────────────

export type LogExerciseWithExpand = LogExercisesRecord &
    RecordModel & {
        expand?: {
            exercise_id?: ExercisesRecord & RecordModel;
        };
    };

export type TrainingLogWithRelations = TrainingLogsRecord & RecordModel;

// ─── Private Helpers ──────────────────────────────────────────────

function todayISO(): string {
    return new Date().toISOString().split('T')[0];
}

// ─── Plan Fetch ───────────────────────────────────────────────────

const PLAN_EXPAND = 'plan_exercises(plan_id).exercise_id';

/**
 * Private helper: fetch a plan by ID with full exercise expand,
 * validating it is published and not deleted.
 */
async function getActivePlan(planId: string): Promise<PlanWithExercises | null> {
    try {
        const plan = await pb.collection(Collections.TRAINING_PLANS).getOne<PlanWithExercises>(
            planId,
            { expand: PLAN_EXPAND }
        );
        if (plan.status === 'published' && !plan.deleted_at) return plan;
        return null;
    } catch {
        /* expected: 404 — plan not found or not published */
        return null;
    }
}

/**
 * Step 1+2: Try to find a published plan via plan_assignments.
 * Priority: direct athlete assignment → group assignment (via getMyGroupIds).
 */
async function getPublishedPlanViaAssignments(
    athleteId: string
): Promise<PlanWithExercises | null> {
    // Step 1: direct assignment to athlete
    try {
        const direct = await pb.collection(Collections.PLAN_ASSIGNMENTS).getFirstListItem<RecordModel>(
            pb.filter('athlete_id = {:aid} && status = "active"', { aid: athleteId })
        );
        if (direct?.plan_id) {
            const plan = await getActivePlan(direct.plan_id as string);
            if (plan) return plan;
        }
    } catch { /* 404 = no direct assignment */ }

    // Step 2: assignment via group (two-step: get group IDs first)
    try {
        const { getMyGroupIds } = await import('./groups');
        const groupIds = await getMyGroupIds(athleteId);
        if (groupIds.length > 0) {
            // Build OR filter for each group_id
            const groupFilter = groupIds
                .map((id) => `group_id = "${id}"`)
                .join(' || ');
            const groupAssign = await pb
                .collection(Collections.PLAN_ASSIGNMENTS)
                .getFirstListItem<RecordModel>(
                    pb.filter(`(${groupFilter}) && status = "active"`)
                );
            if (groupAssign?.plan_id) {
                const plan = await getActivePlan(groupAssign.plan_id as string);
                if (plan) return plan;
            }
        }
    } catch { /* no group assignment */ }

    return null;
}

/**
 * Step 0: Check for individual override on training_plans.
 * Override = training_plans row WHERE athlete_id = X AND parent_plan_id != "".
 * This is the highest-priority resolution — overrides the group plan for one athlete.
 */
async function getPublishedOverrideForAthlete(
    athleteId: string
): Promise<PlanWithExercises | null> {
    try {
        const override = await pb
            .collection(Collections.TRAINING_PLANS)
            .getFirstListItem<PlanWithExercises>(
                pb.filter(
                    'athlete_id = {:aid} && parent_plan_id != "" && status = "published" && deleted_at = ""',
                    { aid: athleteId }
                ),
                { expand: PLAN_EXPAND }
            );
        return override ?? null;
    } catch {
        return null; // 404 = no override
    }
}

/**
 * Find the published plan for an athlete based on the current date.
 * Resolution order (highest priority first):
 *   0. Individual override: training_plans WHERE athlete_id + parent_plan_id set (NEW Phase 3)
 *   1. plan_assignments → athlete direct
 *   2. plan_assignments → group membership
 *   3. Fallback: season.athlete_id → active phase → published plan
 */
export async function getPublishedPlanForToday(athleteId: string): Promise<PlanWithExercises | null> {
    const today = todayISO();

    // Step 0: individual override (highest priority)
    const override = await getPublishedOverrideForAthlete(athleteId);
    if (override) return override;

    // Steps 1 + 2: via plan_assignments
    const viaAssignment = await getPublishedPlanViaAssignments(athleteId);
    if (viaAssignment) return viaAssignment;

    // Step 3: fallback — season.athlete_id based lookup
    try {
        const seasons = await pb.collection(Collections.SEASONS).getFullList({
            filter: pb.filter(
                'athlete_id = {:aid} && start_date <= {:today} && end_date >= {:today}',
                { aid: athleteId, today }
            ),
            sort: '-start_date',
        });
        if (!seasons.length) return null;
        const season = seasons[0];

        const phases = await pb.collection(Collections.TRAINING_PHASES).getFullList({
            filter: pb.filter(
                'season_id = {:sid} && start_date <= {:today} && end_date >= {:today}',
                { sid: season.id, today }
            ),
            sort: '-start_date',
        });
        if (!phases.length) return null;
        const phase = phases[0];

        const plans = await pb.collection(Collections.TRAINING_PLANS).getFullList<PlanWithExercises>({
            filter: pb.filter(
                'phase_id = {:pid} && status = "published" && deleted_at = "" && parent_plan_id = ""',
                { pid: phase.id }
            ),
            expand: PLAN_EXPAND,

        });
        return plans[0] ?? null;
    } catch {
        /* expected: season fallback — no active phase or published plan */
        return null;
    }
}

// ─── Training Logs ────────────────────────────────────────────────

/**
 * Get or create a training log for a specific athlete + plan + date [+ session].
 * UNIQUE constraint: athlete_id + plan_id + date + session → idempotent.
 */
export async function getOrCreateLog(
    athleteId: string,
    planId: string,
    dateStr: string, // ISO date string, e.g. "2026-02-19"
    session = 0      // 0=AM (default), 1=PM
): Promise<TrainingLogWithRelations> {
    const dateOnly = dateStr.slice(0, 10);
    const dateEnd = dateOnly + 'T23:59:59';
    try {
        const existing = await pb
            .collection(Collections.TRAINING_LOGS)
            .getFirstListItem<TrainingLogWithRelations>(
                pb.filter(
                    'athlete_id = {:aid} && plan_id = {:pid} && date >= {:start} && date < {:end} && session = {:session}',
                    { aid: athleteId, pid: planId, start: dateOnly, end: dateEnd, session }
                )
            );
        return existing;
    } catch {
        /* expected: 404 — log not found, create new one */
        const created = await pb.collection(Collections.TRAINING_LOGS).create<TrainingLogWithRelations>({
            athlete_id: athleteId,
            plan_id: planId,
            date: new Date(dateOnly).toISOString(),
            session,
        });
        return created;
    }
}

/**
 * Check if a training log exists for a given athlete + plan + date [+ session].
 * Returns null if not found (no create side-effect).
 */
export async function getLogIfExists(
    athleteId: string,
    planId: string,
    dateStr: string,
    session = 0
): Promise<TrainingLogWithRelations | null> {
    const dateOnly = dateStr.slice(0, 10);
    const dateEnd = dateOnly + 'T23:59:59';
    try {
        return await pb
            .collection(Collections.TRAINING_LOGS)
            .getFirstListItem<TrainingLogWithRelations>(
                pb.filter(
                    'athlete_id = {:aid} && plan_id = {:pid} && date >= {:start} && date < {:end} && session = {:session}',
                    { aid: athleteId, pid: planId, start: dateOnly, end: dateEnd, session }
                )
            );
    } catch {
        /* expected: 404 — log does not exist */
        return null;
    }
}

/** List today's training logs for an athlete */
export async function listTodayLogs(athleteId: string): Promise<TrainingLogWithRelations[]> {
    const today = todayISO();
    const todayEnd = today + 'T23:59:59';
    return pb.collection(Collections.TRAINING_LOGS).getFullList<TrainingLogWithRelations>({
        filter: pb.filter(
            'athlete_id = {:aid} && date >= {:start} && date < {:end}',
            { aid: athleteId, start: today, end: todayEnd }
        ),
        sort: 'session',
    });
}

/** Create a new training log */
export async function createTrainingLog(data: {
    athlete_id: string;
    plan_id?: string;
    date?: string; // ISO YYYY-MM-DD, defaults to today
    session?: number;
    notes?: string;
    rpe?: number;
    duration_min?: number;
}): Promise<TrainingLogWithRelations> {
    return pb.collection(Collections.TRAINING_LOGS).create<TrainingLogWithRelations>({
        ...data,
        date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
        session: data.session ?? 0,
    });
}

/**
 * Update an existing training log (e.g. notes debounced autosave, readiness_score).
 */
export async function updateTrainingLog(
    logId: string,
    data: { notes?: string; readiness_score?: number }
): Promise<TrainingLogWithRelations> {
    return pb.collection(Collections.TRAINING_LOGS)
        .update<TrainingLogWithRelations>(logId, data);
}


/**
 * List all training logs for a plan (all athletes).
 * Useful for coach to see completion status.
 */
export async function getLogsForPlan(
    planId: string
): Promise<TrainingLogWithRelations[]> {
    return pb.collection(Collections.TRAINING_LOGS).getFullList<TrainingLogWithRelations>({
        filter: pb.filter('plan_id = {:pid}', { pid: planId }),
        sort: '-date',
    });
}

/**
 * List all training logs for an athlete in a given week.
 * @param athleteId
 * @param weekStartDate - Monday of the week (ISO date, YYYY-MM-DD)
 */
export async function listWeekLogs(
    athleteId: string,
    weekStartDate: string
): Promise<TrainingLogWithRelations[]> {
    const start = weekStartDate.slice(0, 10);
    const end = new Date(new Date(start).getTime() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
    return pb.collection(Collections.TRAINING_LOGS).getFullList<TrainingLogWithRelations>({
        filter: pb.filter(
            'athlete_id = {:aid} && date >= {:start} && date < {:end}',
            { aid: athleteId, start, end: end + 'T00:00:00' }
        ),
        sort: 'date,session',
    });
}

// ─── Log Exercises ────────────────────────────────────────────────

/**
 * List all log exercises for a training log, with exercise expand.
 */
export async function listLogExercises(logId: string): Promise<LogExerciseWithExpand[]> {
    return pb.collection(Collections.LOG_EXERCISES).getFullList<LogExerciseWithExpand>({
        filter: pb.filter('log_id = {:lid}', { lid: logId }),
        expand: 'exercise_id',
    });
}

/**
 * Save (upsert) a log exercise.
 */
export async function saveLogExercise(
    logId: string,
    exerciseId: string,
    setsData: SetData[],
    rpe?: number,
    skipReason?: string   // Equipment | Pain | Time | CoachDecision | Other
): Promise<LogExerciseWithExpand> {
    if (!logId) throw new Error('saveLogExercise: logId is required');
    if (!exerciseId) throw new Error('saveLogExercise: exerciseId is required');

    const payload = {
        log_id: logId,
        exercise_id: exerciseId,
        sets_data: setsData,
        ...(rpe !== undefined ? { rpe } : {}),
        ...(skipReason !== undefined ? { skip_reason: skipReason } : {}),
    };

    try {
        const existing = await pb
            .collection(Collections.LOG_EXERCISES)
            .getFirstListItem<LogExerciseWithExpand>(
                pb.filter(
                    'log_id = {:lid} && exercise_id = {:eid}',
                    { lid: logId, eid: exerciseId }
                ),
                { expand: 'exercise_id' }
            );
        return pb.collection(Collections.LOG_EXERCISES).update<LogExerciseWithExpand>(
            existing.id,
            payload,
            { expand: 'exercise_id' }
        );
    } catch {
        /* expected: 404 — log exercise not found, create new */
        return pb.collection(Collections.LOG_EXERCISES).create<LogExerciseWithExpand>(
            payload,
            { expand: 'exercise_id' }
        );
    }
}

/**
 * Batch save all log exercises for a training session.
 */
export async function batchSaveLogExercises(
    logId: string,
    entries: Array<{
        exerciseId: string;
        setsData: SetData[];
        rpe?: number;
    }>
): Promise<LogExerciseWithExpand[]> {
    return Promise.all(
        entries.map((entry) =>
            saveLogExercise(logId, entry.exerciseId, entry.setsData, entry.rpe)
        )
    );
}
