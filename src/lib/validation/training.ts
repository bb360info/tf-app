import { z } from 'zod/v4';

// ─── Shared ────────────────────────────────────────────────────────

const pbId = z.string().min(1);
const optionalDatetime = z.iso.datetime().optional();

// ─── Seasons ───────────────────────────────────────────────────────

export const SeasonsSchema = z.object({
    coach_id: pbId,
    name: z.string().min(1).max(255),
    start_date: z.iso.datetime(),
    end_date: z.iso.datetime(),
});

// ─── Training Phases ───────────────────────────────────────────────

export const PhaseTypeSchema = z.enum(['GPP', 'SPP', 'COMP', 'TRANSITION']);

export const TrainingPhasesSchema = z.object({
    season_id: pbId,
    phase_type: PhaseTypeSchema,
    order: z.number().int().min(0),
    start_date: optionalDatetime,
    end_date: optionalDatetime,
});

// ─── Training Plans ────────────────────────────────────────────────

export const PlanStatusSchema = z.enum(['draft', 'published', 'archived']);

export const TrainingPlansSchema = z.object({
    phase_id: pbId,
    week_number: z.number().int().min(1),
    status: PlanStatusSchema,
    notes: z.string().optional(),
    sync_id: z.string().optional(),
});

// ─── Plan Exercises ────────────────────────────────────────────────

export const PlanExercisesSchema = z.object({
    plan_id: pbId,
    exercise_id: pbId,
    order: z.number().int().min(0),
    day_of_week: z.number().int().min(1).max(7).optional(),
    sets: z.number().int().min(1).optional(),
    reps: z.string().optional(),
    intensity: z.string().optional(),
    notes: z.string().optional(),
});

// ─── Plan Snapshots ────────────────────────────────────────────────

export const PlanSnapshotsSchema = z.object({
    plan_id: pbId,
    snapshot: z.record(z.string(), z.unknown()),
    version: z.number().int().min(1),
});
