import { z } from 'zod/v4';

// ─── Shared ────────────────────────────────────────────────────────

const pbId = z.string().min(1);

// ─── Training Logs ─────────────────────────────────────────────────

/** UNIQUE: athlete_id + plan_id + date */
export const TrainingLogsSchema = z.object({
    athlete_id: pbId,
    plan_id: pbId,
    date: z.iso.datetime(),
    notes: z.string().optional(),
    readiness_score: z.number().int().min(0).max(100).optional(),
    sync_id: z.string().optional(),
});

// ─── Log Exercises ─────────────────────────────────────────────────

export const SetDataSchema = z.object({
    set: z.number().int().min(1),
    reps: z.number().int().min(0).optional(),
    weight: z.number().min(0).optional(),
    time: z.number().min(0).optional(),
    distance: z.number().min(0).optional(),
    notes: z.string().optional(),
});

export const LogExercisesSchema = z.object({
    log_id: pbId,
    exercise_id: pbId,
    sets_data: z.array(SetDataSchema),
});

// ─── Daily Check-ins ───────────────────────────────────────────────

/** UNIQUE: athlete_id + date */
export const DailyCheckinsSchema = z.object({
    athlete_id: pbId,
    date: z.iso.datetime(),
    sleep_hours: z.number().min(0).max(24).optional(),
    sleep_quality: z.number().int().min(1).max(5).optional(),
    pain_level: z.number().int().min(0).max(10).optional(),
    mood: z.number().int().min(1).max(5).optional(),
    notes: z.string().optional(),
    sync_id: z.string().optional(),
});

// ─── Test Results ──────────────────────────────────────────────────

export const TestTypeSchema = z.enum([
    'standing_jump',
    'approach_jump',
    'sprint_30m',
    'sprint_60m',
    'squat_max',
    'clean_max',
    'snatch_max',
]);

/** UNIQUE: athlete_id + test_type + date */
export const TestResultsSchema = z.object({
    athlete_id: pbId,
    test_type: TestTypeSchema,
    value: z.number(),
    date: z.iso.datetime(),
    notes: z.string().optional(),
});
