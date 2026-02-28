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
import type { PlanExerciseStrict, PlanWithExercises } from './plans';
import { todayForUser, diffCalendarDays } from '@/lib/utils/dateHelpers';

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Calculate the current week number within a phase.
 * Week 1 = days 0-6, Week 2 = days 7-13, etc.
 * Always returns at least 1 (guards against timezone edge cases).
 * Uses diffCalendarDays (T12:00Z trick) to avoid DST-related off-by-one errors.
 */
export function calcWeekNumber(phaseStartDate: string, today: string): number {
    const diffDays = diffCalendarDays(phaseStartDate, today);
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
 * Step 1+2: Try to find a published plan via plan_assignments for a specific athlete today.
 *
 * [Post Track 4.265 BugFix #3] Hybrid approach:
 *   A) If athlete has an active season+phase: find published plan for CURRENT WEEK,
 *      then verify athlete/group is assigned to that specific plan.
 *      Prevents returning wrong-week plans.
 *   B) Fallback: if no season context OR no week-specific plan found,
 *      look for ANY active assignment to a published plan.
 *      Preserves backward-compat with manual assignments outside a season.
 *
 * Priority: direct athlete assignment → group assignment.
 */
async function getPublishedPlanViaAssignments(
    athleteId: string,
    today: string
): Promise<PlanWithExercises | null> {
    // ── Path A: Season-aware (week-specific) ───────────────────────
    try {
        // Preload group IDs once (reused for season lookup + assignment check)
        const { getMyGroupIds } = await import('./groups');
        const myGroupIds = await getMyGroupIds(athleteId);

        // Find the active season for this athlete (direct first, then group-based)
        const seasons = await pb.collection(Collections.SEASONS).getFullList({
            filter: pb.filter(
                'athlete_id = {:aid} && start_date <= {:today} && end_date >= {:today} && deleted_at = ""',
                { aid: athleteId, today }
            ),
            sort: '-start_date',
            fields: 'id',
        });

        let seasonId: string | null = seasons[0]?.id ?? null;

        // Also check group-based seasons (using already-loaded myGroupIds)
        if (!seasonId) {
            for (const gid of myGroupIds) {
                try {
                    const gs = await pb.collection(Collections.SEASONS).getFullList({
                        filter: pb.filter(
                            'group_id = {:gid} && start_date <= {:today} && end_date >= {:today} && deleted_at = ""',
                            { gid, today }
                        ),
                        sort: '-start_date',
                        fields: 'id',
                    });
                    if (gs.length) { seasonId = gs[0].id; break; }
                } catch { /* try next group */ }
            }
        }

        if (seasonId) {
            // Find current active phase
            const phases = await pb.collection(Collections.TRAINING_PHASES).getFullList({
                filter: pb.filter(
                    'season_id = {:sid} && start_date <= {:today} && end_date >= {:today} && deleted_at = ""',
                    { sid: seasonId, today }
                ),
                sort: '-start_date',
                fields: 'id,start_date',
            });
            const phase = phases[0] ?? null;

            if (phase) {
                const currentWeek = phase.start_date ? calcWeekNumber(phase.start_date, today) : 1;

                // Find published plan for this specific phase + week
                const plans = await pb.collection(Collections.TRAINING_PLANS).getFullList<PlanWithExercises>({
                    filter: pb.filter(
                        'phase_id = {:pid} && week_number = {:week} && status = "published" && deleted_at = "" && plan_type = "phase_based" && parent_plan_id = ""',
                        { pid: phase.id, week: currentWeek }
                    ),
                    expand: PLAN_EXPAND,
                });
                const weekPlan = plans[0] ?? null;

                if (weekPlan) {
                    // Step 1: direct athlete assignment to this plan
                    try {
                        await pb.collection(Collections.PLAN_ASSIGNMENTS).getFirstListItem(
                            pb.filter('plan_id = {:planId} && athlete_id = {:aid} && status = "active"', { planId: weekPlan.id, aid: athleteId })
                        );
                        return weekPlan;
                    } catch { /* no direct assignment */ }

                    // Step 2: group assignment to this plan (reuse myGroupIds)
                    for (const gid of myGroupIds) {
                        try {
                            await pb.collection(Collections.PLAN_ASSIGNMENTS).getFirstListItem(
                                pb.filter('plan_id = {:planId} && group_id = {:gid} && status = "active"', { planId: weekPlan.id, gid })
                            );
                            return weekPlan;
                        } catch { /* try next group */ }
                    }

                    // Week-specific plan found but athlete not directly/group-assigned.
                    // Do NOT return null here — fall through to Step 3 fallback which can
                    // return the plan via season.group_id path (no explicit assignment required).
                }
            }
        }
    } catch { /* no active season — fall through to Path B */ }

    // ── Path B: Fallback — any active assignment (manual/non-season) ──
    // Handles: coach manually assigned plan to athlete outside a season
    try {
        const direct = await pb.collection(Collections.PLAN_ASSIGNMENTS).getFirstListItem<RecordModel>(
            pb.filter('athlete_id = {:aid} && status = "active"', { aid: athleteId })
        );
        if (direct?.plan_id) {
            const plan = await getActivePlan(direct.plan_id as string);
            if (plan) return plan;
        }
    } catch { /* 404 = no direct assignment */ }

    // Path B, Step 2: assignment via group
    try {
        const { getMyGroupIds } = await import('./groups');
        const groupIds = await getMyGroupIds(athleteId);
        for (const gid of groupIds) {
            try {
                const groupAssign = await pb.collection(Collections.PLAN_ASSIGNMENTS).getFirstListItem<RecordModel>(
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
 * [Track 4.266 fix] Added 14-day start_date boundary to prevent stale overrides
 * from perpetually overriding the current plan.
 */
async function getPublishedOverrideForAthlete(
    athleteId: string,
    today: string
): Promise<PlanWithExercises | null> {
    // Cutoff: only overrides created within last 14 days are considered
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 14);
    const cutoff = d.toISOString().slice(0, 10);
    try {
        const override = await pb
            .collection(Collections.TRAINING_PLANS)
            .getFirstListItem<PlanWithExercises>(
                pb.filter(
                    'athlete_id = {:aid} && plan_type = "override" && parent_plan_id != "" && status = "published" && deleted_at = "" && start_date >= {:cutoff}',
                    { aid: athleteId, cutoff }
                ),
                { expand: PLAN_EXPAND, sort: '-start_date' }
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
    // [Track 4.266] Resolve athlete's IANA timezone from notification_preferences
    const { getUserTimezone } = await import('./notificationPreferences');
    const userId = pb.authStore.record?.id ?? '';
    const tz = userId ? await getUserTimezone(userId) : Intl.DateTimeFormat().resolvedOptions().timeZone;
    const today = todayForUser(tz);

    // Step 0: individual override (highest priority)
    const override = await getPublishedOverrideForAthlete(athleteId, today);
    if (override) return override;

    // Step 0.5: standalone plan (ad-hoc training without season/phase) [Track 4.263]
    const standalone = await getStandalonePlanForToday(athleteId, today);
    if (standalone) return standalone;

    // Steps 1 + 2: via plan_assignments (now week-aware)
    const viaAssignment = await getPublishedPlanViaAssignments(athleteId, today);
    if (viaAssignment) return viaAssignment;

    // Step 3: fallback — season.athlete_id OR season.group_id based lookup
    // Handles cases where plan exists but athlete has no explicit plan_assignment yet.
    try {
        // Try direct athlete season first
        let seasons = await pb.collection(Collections.SEASONS).getFullList({
            filter: pb.filter(
                'athlete_id = {:aid} && start_date <= {:today} && end_date >= {:today} && deleted_at = ""',
                { aid: athleteId, today }
            ),
            sort: '-start_date',
        });

        // If no direct athlete season, try group-based seasons
        if (!seasons.length) {
            try {
                const { getMyGroupIds } = await import('./groups');
                const groupIds = await getMyGroupIds(athleteId);
                for (const gid of groupIds) {
                    try {
                        const gs = await pb.collection(Collections.SEASONS).getFullList({
                            filter: pb.filter(
                                'group_id = {:gid} && start_date <= {:today} && end_date >= {:today} && deleted_at = ""',
                                { gid, today }
                            ),
                            sort: '-start_date',
                        });
                        if (gs.length) { seasons = gs; break; }
                    } catch { /* try next group */ }
                }
            } catch { /* no group membership */ }
        }

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

// ─── Public: applyAdjustments [Track 4.263 + 4.266] ─────────────────────────

/**
 * Merge exercise_adjustments into plan exercises for a specific athlete.
 * - Exercises with skip=true are filtered out
 * - Non-skipped exercises get their fields overridden by adjustment values
 * - `_adjusted: true` flag added for badge rendering
 *
 * [Track 4.266 Phase 2] Refactored: N+1 getFirstListItem → 1 getFullList.
 * Builds OR-filter for all exercise IDs — safe for typical plans (10-30 exercises).
 */
export async function applyAdjustments(
    exercises: PlanExercisesRecord[],
    athleteId: string
): Promise<PlanExerciseStrict[]> {
    if (!exercises.length) return exercises as PlanExerciseStrict[];

    // 1 request instead of N: OR-filter for all plan_exercise_ids
    const idFilter = exercises
        .map((ex) => `plan_exercise_id = "${ex.id}"`)
        .join(' || ');

    const adjustments = await pb
        .collection(Collections.EXERCISE_ADJUSTMENTS)
        .getFullList<ExerciseAdjustmentsRecord & RecordModel>({
            filter: `(${idFilter}) && athlete_id = "${athleteId}" && deleted_at = ""`,
        });

    if (!adjustments.length) return exercises as PlanExerciseStrict[];

    const adjMap = new Map(adjustments.map((a) => [a.plan_exercise_id, a]));

    return exercises
        .filter((ex) => {
            const adj = adjMap.get(ex.id);
            return !adj?.skip; // remove skipped exercises
        })
        .map((ex): PlanExerciseStrict => {
            const adj = adjMap.get(ex.id);
            if (!adj) return ex as PlanExerciseStrict;
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
            } as PlanExerciseStrict;
        });
}
