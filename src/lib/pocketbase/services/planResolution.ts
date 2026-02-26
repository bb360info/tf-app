/**
 * PocketBase Service: Plan Resolution
 * Determines which published training plan an athlete should follow today.
 * Extracted from logs.ts for Single Responsibility Principle (SRP).
 *
 * Resolution priority (highest first):
 *   0. Individual override: training_plans WHERE athlete_id + parent_plan_id set
 *   1. plan_assignments → athlete direct
 *   2. plan_assignments → group membership
 *   3. Fallback: season.athlete_id → active phase → published plan
 */

import pb from '../client';
import { Collections } from '../collections';
import type { RecordModel } from 'pocketbase';
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
 * Step 0: Check for individual override on training_plans.
 * Override = training_plans row WHERE athlete_id = X AND parent_plan_id != "".
 * This is the highest-priority resolution — overrides the group plan for one athlete.
 */
async function getPublishedOverrideForAthlete(
    athleteId: string
): Promise<PlanWithExercises | null> {
    const today = todayForUser();
    try {
        const override = await pb
            .collection(Collections.TRAINING_PLANS)
            .getFirstListItem<PlanWithExercises>(
                pb.filter(
                    'athlete_id = {:aid} && parent_plan_id != "" && status = "published" && deleted_at = "" && phase_id.start_date <= {:today} && phase_id.end_date >= {:today}',
                    { aid: athleteId, today }
                ),
                { expand: PLAN_EXPAND }
            );
        return override ?? null;
    } catch {
        return null; // 404 = no override or no active phase
    }
}

// ─── Public: main resolution function ─────────────────────────────

/**
 * Find the published plan for an athlete based on the current date.
 * Resolution order (highest priority first):
 *   0. Individual override: training_plans WHERE athlete_id + parent_plan_id set
 *   1. plan_assignments → athlete direct
 *   2. plan_assignments → group membership
 *   3. Fallback: season.athlete_id → active phase → published plan
 */
export async function getPublishedPlanForToday(athleteId: string): Promise<PlanWithExercises | null> {
    const today = todayForUser();

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

        const currentWeek = phase.start_date
            ? calcWeekNumber(phase.start_date, today)
            : 1;

        const plans = await pb.collection(Collections.TRAINING_PLANS).getFullList<PlanWithExercises>({
            filter: pb.filter(
                'phase_id = {:pid} && status = "published" && deleted_at = "" && parent_plan_id = "" && week_number = {:week}',
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
