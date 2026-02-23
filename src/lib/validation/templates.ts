import { z } from 'zod/v4';

// ─── Shared ────────────────────────────────────────────────────────

const pbId = z.string().min(1);

// ─── Training Template ─────────────────────────────────────────────

export const TemplateTypeSchema = z.enum(['warmup', 'training_day']);

export const TrainingTemplateSchema = z.object({
    coach_id: pbId,
    name_ru: z.string().min(1).max(255),
    name_en: z.string().max(255).optional(),
    name_cn: z.string().max(255).optional(),
    type: TemplateTypeSchema,
    total_minutes: z.number().int().min(0).max(300).optional(),
    is_system: z.boolean().optional(),
    description_ru: z.string().max(1000).optional(),
    description_en: z.string().max(1000).optional(),
    description_cn: z.string().max(1000).optional(),
});

export type TrainingTemplateInput = z.infer<typeof TrainingTemplateSchema>;

// ─── Template Item ─────────────────────────────────────────────────

export const TemplateItemBlockSchema = z.enum(['warmup', 'main']);

export const TemplateItemSchema = z.object({
    template_id: pbId,
    order: z.number().int().min(0).optional(),
    block: TemplateItemBlockSchema,
    exercise_id: pbId.optional(),
    custom_text_ru: z.string().max(1000).optional(),
    custom_text_en: z.string().max(1000).optional(),
    custom_text_cn: z.string().max(1000).optional(),
    duration_seconds: z.number().int().min(0).max(7200).optional(),
    sets: z.number().int().min(1).max(100).optional(),
    reps: z.string().max(50).optional(),
    intensity: z.string().max(50).optional(),
    weight: z.number().min(0).optional(),
    distance: z.number().min(0).optional(),
    rest_seconds: z.number().int().min(0).max(600).optional(),
    notes: z.string().max(500).optional(),
}).refine(
    (data) => !!(data.exercise_id || data.custom_text_ru),
    {
        message: 'Either exercise_id or custom_text_ru must be provided',
        path: ['exercise_id'],
    }
);

export type TemplateItemInput = z.infer<typeof TemplateItemSchema>;

// ─── Plan Exercise Block ───────────────────────────────────────────

export const PlanExerciseBlockSchema = z.enum(['warmup', 'main']);

export const AddWarmupItemSchema = z.object({
    plan_id: pbId,
    day_of_week: z.number().int().min(0).max(6),
    session: z.number().int().min(0).max(1).optional(),
    order: z.number().int().min(0),
    exercise_id: pbId.optional(),
    custom_text_ru: z.string().max(1000).optional(),
    custom_text_en: z.string().max(1000).optional(),
    custom_text_cn: z.string().max(1000).optional(),
    duration_seconds: z.number().int().min(0).optional(),
    notes: z.string().max(500).optional(),
    source_template_id: pbId.optional(),
}).refine(
    (data) => !!(data.exercise_id || data.custom_text_ru),
    { message: 'exercise_id or custom_text_ru required', path: ['exercise_id'] }
);

export type AddWarmupItemInput = z.infer<typeof AddWarmupItemSchema>;
