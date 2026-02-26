/**
 * PocketBase Service: Plan Resolution
 * Determines which published training plan an athlete should follow today.
 * Extracted from logs.ts for Single Responsibility Principle (SRP).
 *
 * Resolution priority (highest first):
 *   0.   Individual override: training_plans WHERE plan_type='override' + athlete_id
 *   0.5  Standalone plan: plan_type='standalone' + active date range [Track 4.263]
 *   1.   plan_assignments → athlete direct
 *   2.   plan_assignments → group membership
 *   3.   Fallback: season.athlete_id → active phase → published plan
 */

import pb from '../client';
import { Collections } from '../collections';
import type { RecordModel } from 'pocketbase';
import type { ExerciseAdjustmentsRecord, PlanExercisesRecord } from '../types';
import type { PlanWithExercises } from './plans';
import { todayForUser } from '@/lib/utils/dateHelpers';

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Calculate the current week number within a phase.
 * Week 1 = days 0-6, Week 2 = days 7-13, etc.
 * Always returns at least 1 (guards against timezone edge cases).
 */
function calcWeekNumber(phaseStartDate: string, today: string): number {
    const diffMs = new Date(today).getTime() - new Date(phaseStartDate).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.floor(diffDays / 7) + 1);
}

// ─── Constants ────────────────────────────────────────────────────

export const PLAN_EXPAND = 'plan_exercises(plan_id).exercise_id';

// ─── Private: fetch plan by ID ────────────────────────────────────

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

// ─── Private: Step 1+2 via plan_assignments ───────────────────────

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
        // Safe: iterate through groupIds with individual pb.filter calls
        // PocketBase doesn't support IN operator in named params
        // Groups are typically 1-3, overhead is minimal
        for (const gid of groupIds) {
            try {
                const groupAssign = await pb
                    .collection(Collections.PLAN_ASSIGNMENTS)
                    .getFirstListItem<RecordModel>(
                        pb.filter('group_id = {:gid} && status = "active"', { gid })
                    );
                if (groupAssign?.plan_id) {
                    const plan = await getActivePlan(groupAssign.plan_id as string);
                    if (plan) return plan;
                }
            } catch { /* try next group */ }
        }
    } catch { /* no group membership */ }

    return null;
}

// ─── Private: Step 0 — individual override ────────────────────────

/**
 * Step 0: Check for individual override plan.
 * Override = plan_type='override', athlete_id = X, parent_plan_id != "".
 * [Track 4.263 fix] Removed phase_id.start_date filter — override plans may have
 * null phase_id, which caused the filter chain to break on NULL phase_id.
 */
async function getPublishedOverrideForAthlete(
    athleteId: string
): Promise<PlanWithExercises | null> {
    try {
        const override = await pb
            .collection(Collections.TRAINING_PLANS)
            .getFirstListItem<PlanWithExercises>(
                pb.filter(
                    'athlete_id = {:aid} && plan_type = "override" && parent_plan_id != "" && status = "published" && deleted_at = ""',
                    { aid: athleteId }
                ),
                { expand: PLAN_EXPAND }
            );
        return override ?? null;
    } catch {
        return null; // 404 = no override
    }
}

// ─── Private: Step 0.5 — standalone plan [Track 4.263] ───────────

/**
 * Step 0.5: Check for standalone ad-hoc plan active today.
 * Standalone = plan_type='standalone', athlete_id=X, start_date <= today <= end_date.
 * Guard: standalone plans have NULL phase_id — previous code crashed on phase_id.start_date.
 */
async function getStandalonePlanForToday(
    athleteId: string,
    today: string
): Promise<PlanWithExercises | null> {
    try {
        const plan = await pb
            .collection(Collections.TRAINING_PLANS)
            .getFirstListItem<PlanWithExercises>(
                pb.filter(
                    'athlete_id = {:aid} && plan_type = "standalone" && status = "published" && deleted_at = "" && start_date <= {:today} && (end_date = "" || end_date >= {:today})',
                    { aid: athleteId, today }
                ),
                { expand: PLAN_EXPAND }
            );
        return plan ?? null;
    } catch {
        return null; // 404 = no active standalone plan today
    }
}

// ─── Public: main resolution function ─────────────────────────────

/**
 * Find the published plan for an athlete based on the current date.
 * Resolution order (highest priority first):
 *   0.   Individual override: plan_type='override' + athlete_id + parent_plan_id
 *   0.5  Standalone plan: plan_type='standalone' + active date range [Track 4.263]
 *   1.   plan_assignments → athlete direct
 *   2.   plan_assignments → group membership
 *   3.   Fallback: season.athlete_id → active phase → published plan
 */
export async function getPublishedPlanForToday(athleteId: string): Promise<PlanWithExercises | null> {
    const today = todayForUser();

    // Step 0: individual override (highest priority)
    const override = await getPublishedOverrideForAthlete(athleteId);
    if (override) return override;

    // Step 0.5: standalone plan (ad-hoc training without season/phase) [Track 4.263]
    const standalone = await getStandalonePlanForToday(athleteId, today);
    if (standalone) return standalone;

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

        const currentWeek = phase.start_date
            ? calcWeekNumber(phase.start_date, today)
            : 1;

        const plans = await pb.collection(Collections.TRAINING_PLANS).getFullList<PlanWithExercises>({
            filter: pb.filter(
                'phase_id = {:pid} && plan_type = "phase_based" && status = "published" && deleted_at = "" && parent_plan_id = "" && week_number = {:week}',
                { pid: phase.id, week: currentWeek }
            ),
            expand: PLAN_EXPAND,
        });
        return plans[0] ?? null;
    } catch {
        /* expected: season fallback — no active phase, published plan, or matching week */
        return null;
    }
}

// ─── Public: applyAdjustments [Track 4.263] ───────────────────────

type PlanExerciseWithAdjustment = PlanExercisesRecord & { _adjusted?: boolean };

/**
 * Merge exercise_adjustments into plan exercises for a specific athlete.
 * - Exercises with skip=true are filtered out
 * - Non-skipped exercises get their fields overridden by adjustment values
 * - `_adjusted: true` flag added for badge rendering
 *
 * NOTE: Individual per-exercise requests are used for UNIQUE lookup.
 * Optimization (batch fetch) is a future backlog item.
 */
export async function applyAdjustments(
    exercises: PlanExercisesRecord[],
    athleteId: string
): Promise<PlanExerciseWithAdjustment[]> {
    if (!exercises.length) return exercises;

    const adjustments: (ExerciseAdjustmentsRecord & RecordModel)[] = [];

    for (const ex of exercises) {
        try {
            const adj = await pb
                .collection(Collections.EXERCISE_ADJUSTMENTS)
                .getFirstListItem<ExerciseAdjustmentsRecord & RecordModel>(
                    pb.filter(
                        'plan_exercise_id = {:eid} && athlete_id = {:aid} && deleted_at = ""',
                        { eid: ex.id, aid: athleteId }
                    )
                );
            adjustments.push(adj);
        } catch { /* no adjustment for this exercise */ }
    }

    if (!adjustments.length) return exercises;

    const adjMap = new Map(adjustments.map((a) => [a.plan_exercise_id, a]));

    return exercises
        .filter((ex) => {
            const adj = adjMap.get(ex.id);
            return !adj?.skip; // remove skipped exercises
        })
        .map((ex): PlanExerciseWithAdjustment => {
            const adj = adjMap.get(ex.id);
            if (!adj) return ex;
            return {
                ...ex,
                sets: adj.sets ?? ex.sets,
                reps: adj.reps ?? ex.reps,
                intensity: adj.intensity ?? ex.intensity,
                weight: adj.weight ?? ex.weight,
                duration: adj.duration ?? ex.duration,
                distance: adj.distance ?? ex.distance,
                rest_seconds: adj.rest_seconds ?? ex.rest_seconds,
                notes: adj.notes ?? ex.notes,
                _adjusted: true, // signal for ⚡ badge in UI
            };
        });
}
