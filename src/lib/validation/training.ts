import { z } from 'zod/v4';

// ─── Shared ────────────────────────────────────────────────────────

const pbId = z.string().min(1);
const optionalDatetime = z.iso.datetime().optional();

// ─── Seasons ───────────────────────────────────────────────────────

export const SeasonsSchema = z.object({
    coach_id: pbId,
    athlete_id: pbId.optional(),
    group_id: pbId.optional(),
    name: z.string().min(1).max(255),
    start_date: z.iso.datetime(),
    end_date: z.iso.datetime(),
});

// ─── Training Phases ───────────────────────────────────────────────

export const PhaseTypeSchema = z.enum(['GPP', 'SPP', 'PRE_COMP', 'COMP', 'TRANSITION']);

export const TrainingPhasesSchema = z.object({
    season_id: pbId,
    phase_type: PhaseTypeSchema,
    order: z.number().int().min(0),
    start_date: optionalDatetime,
    end_date: optionalDatetime,
    focus: z.string().max(255).optional(),
});

// ─── Training Plans ────────────────────────────────────────────────

export const PlanStatusSchema = z.enum(['draft', 'published', 'archived']);

// [Track 4.263] Plan type discriminator
export const PlanTypeSchema = z.enum(['phase_based', 'standalone', 'override']);

export const TrainingPlansSchema = z.object({
    plan_type: PlanTypeSchema,                          // [NEW, required]
    phase_id: pbId.optional(),                         // [CHANGED: required→optional]
    week_number: z.number().int().min(1).optional(),   // [CHANGED: required→optional]
    start_date: z.string().optional(),                 // [NEW — ISO date string for standalone]
    end_date: z.string().optional(),                   // [NEW — ISO date string for standalone]
    status: PlanStatusSchema,
    notes: z.string().optional(),
    sync_id: z.string().optional(),
    athlete_id: pbId.optional(),
    parent_plan_id: pbId.optional(),
    day_notes: z.record(z.string(), z.string().max(500)).optional(),
});

// ─── Plan Exercises ────────────────────────────────────────────────

export const PlanExercisesSchema = z.object({
    plan_id: pbId,
    exercise_id: pbId.optional(), // nullable for warmup custom_text items
    order: z.number().int().min(0),
    day_of_week: z.number().int().min(1).max(7).optional(),
    session: z.number().int().min(0).optional(),
    block: z.enum(['warmup', 'main']).optional(),
    sets: z.number().int().min(1).optional(),
    reps: z.string().optional(),
    intensity: z.string().optional(),
    notes: z.string().optional(),
    weight: z.number().min(0).optional(),
    duration: z.number().min(0).optional(),
    distance: z.number().min(0).optional(),
    rest_seconds: z.number().int().min(0).optional(),
    custom_text_ru: z.string().max(1000).optional(),
    custom_text_en: z.string().max(1000).optional(),
    custom_text_cn: z.string().max(1000).optional(),
    source_template_id: pbId.optional(),
});

// ─── Plan Snapshots ────────────────────────────────────────────────

export const PlanSnapshotsSchema = z.object({
    plan_id: pbId,
    snapshot: z.record(z.string(), z.unknown()),
    version: z.number().int().min(1),
});
