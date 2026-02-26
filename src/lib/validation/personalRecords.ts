import { z } from 'zod/v4';
import { DisciplineSchema, SeasonTypeSchema, PRSourceSchema } from './core';

/** Full personal record schema (all fields) */
export const PersonalRecordSchema = z.object({
    athlete_id: z.string().min(1),
    discipline: DisciplineSchema,
    season_type: SeasonTypeSchema,
    result: z.number().min(0).max(30),           // meters
    date: z.string().optional(),                  // ISO date
    competition_name: z.string().max(255).optional(),
    source: PRSourceSchema,
    is_current: z.boolean().default(true),
    notes: z.string().max(500).optional(),
});

/** Form schema for adding a new PR (athlete_id injected by service) */
export const AddPRSchema = PersonalRecordSchema.omit({
    athlete_id: true,
    is_current: true,
});

export type PersonalRecordFormData = z.infer<typeof AddPRSchema>;
export type PersonalRecordData = z.infer<typeof PersonalRecordSchema>;
