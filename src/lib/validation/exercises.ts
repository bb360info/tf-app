import { z } from 'zod/v4';

// ─── Shared ────────────────────────────────────────────────────────

const pbId = z.string().min(1);

// ─── Exercises ─────────────────────────────────────────────────────

export const ExerciseLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export const UnitTypeSchema = z.enum(['reps', 'time', 'distance', 'weight']);
export const TrainingCategorySchema = z.enum([
    'plyometric',
    'highjump',
    'strength',
    'gpp',
    'speed',
    'flexibility',
    'jump',
]);
export const PhaseTypeSchema = z.enum(['GPP', 'SPP', 'COMP', 'TRANSITION']);

export const ExercisesSchema = z.object({
    name_ru: z.string().min(1).max(500),
    name_en: z.string().min(1).max(500),
    name_cn: z.string().min(1).max(500),
    description_ru: z.string().optional(),
    description_en: z.string().optional(),
    description_cn: z.string().optional(),
    level: ExerciseLevelSchema,
    unit_type: UnitTypeSchema,
    cns_cost: z.number().int().min(1).max(5),
    training_category: TrainingCategorySchema,
    phase_suitability: z.array(PhaseTypeSchema),
    tags: z.array(z.string()).optional(),
    illustration: z.string().optional(),
    equipment: z.array(z.string()).optional(),
    muscles: z.array(z.string()).optional(),
    dosage: z.string().max(200).optional(),
    coach_cues_ru: z.string().max(2000).optional(),
    coach_cues_en: z.string().max(2000).optional(),
    coach_cues_cn: z.string().max(2000).optional(),
});

// ─── Custom Exercises ──────────────────────────────────────────────

export const CustomExercisesSchema = z.object({
    coach_id: pbId,
    name_ru: z.string().max(500).optional(),
    name_en: z.string().max(500).optional(),
    name_cn: z.string().max(500).optional(),
    description_ru: z.string().optional(),
    description_en: z.string().optional(),
    description_cn: z.string().optional(),
    level: ExerciseLevelSchema,
    unit_type: UnitTypeSchema,
    cns_cost: z.number().int().min(1).max(5),
    training_category: TrainingCategorySchema,
    phase_suitability: z.array(PhaseTypeSchema),
    tags: z.array(z.string()).optional(),
    equipment: z.array(z.string()).optional(),
    muscles: z.array(z.string()).optional(),
    dosage: z.string().max(200).optional(),
    coach_cues_ru: z.string().max(2000).optional(),
    coach_cues_en: z.string().max(2000).optional(),
    coach_cues_cn: z.string().max(2000).optional(),
});

// ─── Exercise Videos ───────────────────────────────────────────────

export const ExerciseVideosSchema = z.object({
    exercise_id: pbId,
    file: z.string().min(1),
    coach_id: pbId,
    description: z.string().optional(),
});
