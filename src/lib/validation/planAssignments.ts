import { z } from 'zod/v4';

const pbId = z.string().min(1);

// ─── Plan Assignment Status ────────────────────────────────────────

export const PlanAssignmentStatusSchema = z.enum(['active', 'inactive']);

// ─── Plan Assignments ──────────────────────────────────────────────

/**
 * Schema for plan_assignments collection.
 * Either athlete_id or group_id must be set (not both).
 */
export const PlanAssignmentsSchema = z.object({
    plan_id: pbId,
    athlete_id: pbId.optional(),
    group_id: pbId.optional(),
    status: PlanAssignmentStatusSchema.optional().default('active'),
}).refine(
    (data) => !!data.athlete_id || !!data.group_id,
    { message: 'Either athlete_id or group_id must be set' }
);

export type PlanAssignmentsInput = z.infer<typeof PlanAssignmentsSchema>;
