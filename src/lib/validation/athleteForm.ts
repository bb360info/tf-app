import { z } from 'zod/v4';
import { DisciplineSchema, GenderSchema } from './core';

const isoDate = z.iso.date();

export const AthletePatchSchema = z
    .object({
        name: z.string().min(1).max(255).optional(),
        birth_date: isoDate.optional(),
        gender: GenderSchema.optional(),
        height_cm: z.number().int().min(100).max(250).optional(),
        primary_discipline: DisciplineSchema.optional(),
        secondary_disciplines: z.array(DisciplineSchema).max(2).optional(),
    })
    .refine(
        (data) => {
            if (!data.primary_discipline || !data.secondary_disciplines) return true;
            return !data.secondary_disciplines.includes(data.primary_discipline);
        },
        { message: 'Secondary discipline cannot repeat primary', path: ['secondary_disciplines'] }
    );

export const AthleteFormSubmitPayloadSchema = z.object({
    athletePatch: AthletePatchSchema,
});
