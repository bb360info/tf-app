/**
 * AssignmentLifecycleService — unified deactivation logic for plan assignments.
 *
 * [Track 4.267] Consolidates deactivation from:
 *   - publishPlan() (sibling deactivation)
 *   - revertToDraft() (was missing entirely — bug)
 *   - clearSeasonAssignments() (season participant change)
 *
 * All methods use sequential iteration for SQLite safety (no parallel writes).
 */

import pb from '../client';
import { Collections } from '../collections';

// ─── Deactivation Methods ─────────────────────────────────────────

/**
 * Deactivate all active assignments for a specific plan.
 * Used by: revertToDraft(), deletePlan()
 *
 * @returns Number of assignments deactivated
 */
export async function deactivateForPlan(planId: string): Promise<number> {
    const assignments = await pb.collection(Collections.PLAN_ASSIGNMENTS).getFullList({
        filter: pb.filter('plan_id = {:planId} && status = "active"', { planId }),
        fields: 'id',
    });

    for (const a of assignments) {
        await pb.collection(Collections.PLAN_ASSIGNMENTS).update(a.id, { status: 'inactive' });
    }

    return assignments.length;
}

/**
 * Deactivate assignments from sibling plans (same phase + week, different plan).
 * Used by: publishPlan() — ensures only one published plan per week has active assignments.
 *
 * @returns Number of assignments deactivated
 */
export async function deactivateSiblings(
    planId: string,
    phaseId: string,
    weekNumber: number
): Promise<number> {
    // Find sibling plans in the same phase+week (exclude current plan)
    const siblingPlans = await pb.collection(Collections.TRAINING_PLANS).getFullList({
        filter: pb.filter(
            'phase_id = {:phaseId} && id != {:planId} && week_number = {:weekNumber} && deleted_at = ""',
            { phaseId, planId, weekNumber }
        ),
        fields: 'id',
    });

    let deactivated = 0;
    for (const sibling of siblingPlans) {
        const count = await deactivateForPlan(sibling.id);
        deactivated += count;
    }

    return deactivated;
}

/**
 * Deactivate ALL active assignments for every plan in a season.
 * Used by: clearSeasonAssignments() before participant change.
 *
 * @returns Number of assignments deactivated
 */
export async function deactivateForSeason(seasonId: string): Promise<number> {
    // 1. All phases in season
    const phases = await pb.collection(Collections.TRAINING_PHASES).getFullList({
        filter: pb.filter('season_id = {:sid} && deleted_at = ""', { sid: seasonId }),
        fields: 'id',
    });
    if (!phases.length) return 0;

    // 2. All plans across all phases (sequential for SQLite)
    const planIds: string[] = [];
    for (const phase of phases) {
        const plans = await pb.collection(Collections.TRAINING_PLANS).getFullList({
            filter: pb.filter('phase_id = {:pid} && deleted_at = ""', { pid: phase.id }),
            fields: 'id',
        });
        for (const p of plans) planIds.push(p.id);
    }
    if (!planIds.length) return 0;

    // 3. Deactivate assignments for each plan
    let deactivated = 0;
    for (const planId of planIds) {
        const count = await deactivateForPlan(planId);
        deactivated += count;
    }

    return deactivated;
}
