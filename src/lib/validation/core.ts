import { z } from 'zod/v4';

// ─── Shared ────────────────────────────────────────────────────────

/** PocketBase record ID format */
const pbId = z.string().min(1);

/** Optional ISO datetime */
const optionalDatetime = z.iso.datetime().optional();

// ─── Users ─────────────────────────────────────────────────────────

export const UserRoleSchema = z.enum(['coach', 'athlete', 'admin']);
export const LanguageSchema = z.enum(['ru', 'en', 'cn']);
export const UnitSystemSchema = z.enum(['metric', 'imperial']);

export const UsersSchema = z.object({
    email: z.email(),
    name: z.string().min(1).max(255),
    role: UserRoleSchema,
    language: LanguageSchema,
    units: UnitSystemSchema,
    avatar: z.string().optional(),
});

/** Login form validation */
export const LoginSchema = z.object({
    email: z.email(),
    password: z.string().min(8),
});

/** Registration form validation */
export const RegisterSchema = z
    .object({
        email: z.email(),
        name: z.string().min(1).max(255),
        password: z.string().min(8),
        passwordConfirm: z.string().min(8),
    })
    .refine((data) => data.password === data.passwordConfirm, {
        message: 'Passwords must match',
        path: ['passwordConfirm'],
    });

// ─── Athletes ──────────────────────────────────────────────────────

export const GenderSchema = z.enum(['male', 'female']);

export const AthletesSchema = z.object({
    coach_id: pbId,
    name: z.string().min(1).max(255),
    birth_date: optionalDatetime,
    gender: GenderSchema.optional(),
    height_cm: z.number().int().min(100).max(250).optional(),
});

// ─── Groups ────────────────────────────────────────────────────────

export const GroupsSchema = z.object({
    coach_id: pbId,
    name: z.string().min(1).max(255),
    timezone: z.string().optional(),
});

/** UNIQUE: group_id + athlete_id */
export const GroupMembersSchema = z.object({
    group_id: pbId,
    athlete_id: pbId,
});

// ─── Coach Preferences ────────────────────────────────────────────

/** UNIQUE: coach_id */
export const CoachPreferencesSchema = z.object({
    coach_id: pbId,
    default_plan_languages: z.array(LanguageSchema),
});
