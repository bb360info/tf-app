/**
 * PocketBase Service: Plan Assignments
 * Assigns training plans to athletes or groups.
 */

import pb from '../client';
import { Collections } from '../collections';
import type { PlanAssignmentsRecord } from '../types';
import type { RecordModel } from 'pocketbase';

// ─── Types ─────────────────────────────────────────────────────────

export type PlanAssignmentWithRelations = PlanAssignmentsRecord & RecordModel;

// ─── CRUD ──────────────────────────────────────────────────────────

/** List all assignments for a plan */
export async function listPlanAssignments(planId: string): Promise<PlanAssignmentWithRelations[]> {
    return pb.collection(Collections.PLAN_ASSIGNMENTS).getFullList<PlanAssignmentWithRelations>({
        filter: `plan_id = "${planId}"`,

    });
}

/** Assign a plan to an athlete */
export async function assignPlanToAthlete(
    planId: string,
    athleteId: string
): Promise<PlanAssignmentWithRelations> {
    // Check if assignment already exists
    try {
        const existing = await pb
            .collection(Collections.PLAN_ASSIGNMENTS)
            .getFirstListItem<PlanAssignmentWithRelations>(
                `plan_id = "${planId}" && athlete_id = "${athleteId}"`
            );
        // Reactivate if inactive
        if (existing.status === 'inactive') {
            return pb.collection(Collections.PLAN_ASSIGNMENTS).update<PlanAssignmentWithRelations>(
                existing.id,
                { status: 'active' }
            );
        }
        return existing;
    } catch {
        // Not found — create new
        return pb.collection(Collections.PLAN_ASSIGNMENTS).create<PlanAssignmentWithRelations>({
            plan_id: planId,
            athlete_id: athleteId,
            status: 'active',
        });
    }
}

/** Assign a plan to a group */
export async function assignPlanToGroup(
    planId: string,
    groupId: string
): Promise<PlanAssignmentWithRelations> {
    try {
        const existing = await pb
            .collection(Collections.PLAN_ASSIGNMENTS)
            .getFirstListItem<PlanAssignmentWithRelations>(
                `plan_id = "${planId}" && group_id = "${groupId}"`
            );
        if (existing.status === 'inactive') {
            return pb.collection(Collections.PLAN_ASSIGNMENTS).update<PlanAssignmentWithRelations>(
                existing.id,
                { status: 'active' }
            );
        }
        return existing;
    } catch {
        /* expected: 404 — assignment not found, create new */
        return pb.collection(Collections.PLAN_ASSIGNMENTS).create<PlanAssignmentWithRelations>({
            plan_id: planId,
            group_id: groupId,
            status: 'active',
        });
    }
}

/** Unassign: set status=inactive */
export async function unassignPlan(assignmentId: string): Promise<void> {
    await pb.collection(Collections.PLAN_ASSIGNMENTS).update(assignmentId, {
        status: 'inactive',
    });
}

/** Delete assignment permanently */
export async function deletePlanAssignment(assignmentId: string): Promise<void> {
    await pb.collection(Collections.PLAN_ASSIGNMENTS).delete(assignmentId);
}

/**
 * Lists active assignments for a plan, expanded with athlete/group info.
 */
export async function listActivePlanAssignments(planId: string): Promise<PlanAssignmentWithRelations[]> {
    return pb.collection(Collections.PLAN_ASSIGNMENTS).getFullList<PlanAssignmentWithRelations>({
        filter: `plan_id = "${planId}" && (status = "active" || status = "")`,
        expand: 'athlete_id,group_id',

    });
}

// ─── Plan Duplication ─────────────────────────────────────────────

/**
 * Duplicate a plan (same phase, new name, status=draft).
 * Used to create individual overrides from a group plan.
 */
export async function duplicatePlan(planId: string, newName?: string): Promise<RecordModel> {
    // Fetch the source plan
    const source = await pb.collection(Collections.TRAINING_PLANS).getOne(planId, {
        expand: 'plan_exercises(plan_id)',
    });

    // Duplicate the plan record
    const copy = await pb.collection(Collections.TRAINING_PLANS).create({
        phase_id: source.phase_id,
        week_number: source.week_number,
        name: newName ?? `${source.name || 'Plan'} (copy)`,
        status: 'draft',
        notes: source.notes ?? '',
        deleted_at: '',
    });

    // Duplicate all exercises
    const exercises = (source.expand?.['plan_exercises(plan_id)'] ?? []) as RecordModel[];
    await Promise.all(
        exercises.map((ex: RecordModel & Record<string, unknown>) =>
            pb.collection(Collections.PLAN_EXERCISES).create({
                plan_id: copy.id,
                exercise_id: ex.exercise_id,
                day_of_week: ex.day_of_week,
                session: ex.session ?? 0,
                order: ex.order ?? 0,
                sets: ex.sets,
                reps: ex.reps,
                intensity: ex.intensity,
                weight: ex.weight,
                duration: ex.duration,
                distance: ex.distance,
                rest_seconds: ex.rest_seconds,
                notes: ex.notes ?? '',
                unit_type: ex.unit_type,
            })
        )
    );

    return copy;
}

/**
 * Create an individual override: duplicates a plan and assigns it to a specific athlete.
 */
export async function createIndividualOverride(
    sourcePlanId: string,
    athleteId: string,
    athleteName?: string
): Promise<{ plan: RecordModel; assignment: PlanAssignmentWithRelations }> {
    const plan = await duplicatePlan(sourcePlanId, `Override: ${athleteName ?? athleteId}`);
    const assignment = await assignPlanToAthlete(plan.id, athleteId);
    return { plan, assignment };
}
