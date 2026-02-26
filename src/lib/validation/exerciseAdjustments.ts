import { z } from 'zod/v4';

// ─── Shared ────────────────────────────────────────────────────────

const pbId = z.string().min(1);

// ─── Exercise Adjustments [Track 4.263] ───────────────────────────

/**
 * Validation schema for exercise_adjustments collection.
 * Per-athlete override for a specific plan exercise.
 * UNIQUE: (plan_exercise_id, athlete_id).
 */
export const ExerciseAdjustmentsSchema = z.object({
    plan_exercise_id: pbId,
    athlete_id: pbId,
    sets: z.number().int().min(1).optional(),
    reps: z.string().max(50).optional(),
    intensity: z.string().max(100).optional(),
    weight: z.number().min(0).optional(),
    duration: z.number().min(0).optional(),
    distance: z.number().min(0).optional(),
    rest_seconds: z.number().int().min(0).optional(),
    notes: z.string().max(1000).optional(),
    skip: z.boolean().optional(),
});

export type ExerciseAdjustmentsInput = z.infer<typeof ExerciseAdjustmentsSchema>;
