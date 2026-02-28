/**
 * PocketBase Service: Plan Assignments
 * Assigns training plans to athletes or groups.
 */

import pb from '../client';
import { Collections } from '../collections';
import type { PlanAssignmentsRecord } from '../types';
import type { RecordModel } from 'pocketbase';
// [Track 4.267] getPlan import removed — replaced with lightweight getOne in assign functions

// ─── Types ─────────────────────────────────────────────────────────

export type PlanAssignmentWithRelations = PlanAssignmentsRecord & RecordModel;

// ─── CRUD ──────────────────────────────────────────────────────────

/** List all assignments for a plan */
export async function listPlanAssignments(planId: string): Promise<PlanAssignmentWithRelations[]> {
    return pb.collection(Collections.PLAN_ASSIGNMENTS).getFullList<PlanAssignmentWithRelations>({
        filter: pb.filter('plan_id = {:planId} && (status = "active" || status = "")', { planId }),
    });
}

/** Assign a plan to an athlete */
export async function assignPlanToAthlete(
    planId: string,
    athleteId: string
): Promise<PlanAssignmentWithRelations> {
    // [Track 4.267] Lightweight status check — only fetch id+status, no exercise expand
    const plan = await pb.collection(Collections.TRAINING_PLANS)
        .getOne(planId, { fields: 'id,status' });
    if (plan.status !== 'published') {
        throw new Error(`Cannot assign plan: status is "${plan.status}", expected "published"`);
    }
    // Check if assignment already exists
    try {
        const existing = await pb
            .collection(Collections.PLAN_ASSIGNMENTS)
            .getFirstListItem<PlanAssignmentWithRelations>(
                pb.filter('plan_id = {:planId} && athlete_id = {:athleteId}', { planId, athleteId })
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
    // [Track 4.267] Lightweight status check — only fetch id+status, no exercise expand
    const plan = await pb.collection(Collections.TRAINING_PLANS)
        .getOne(planId, { fields: 'id,status' });
    if (plan.status !== 'published') {
        throw new Error(`Cannot assign plan: status is "${plan.status}", expected "published"`);
    }
    try {
        const existing = await pb
            .collection(Collections.PLAN_ASSIGNMENTS)
            .getFirstListItem<PlanAssignmentWithRelations>(
                pb.filter('plan_id = {:planId} && group_id = {:groupId}', { planId, groupId })
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
        filter: pb.filter('plan_id = {:planId} && (status = "active" || status = "")', { planId }),
        expand: 'athlete_id,group_id',

    });
}

