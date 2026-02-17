import { z } from 'zod/v4';

// ─── Shared ────────────────────────────────────────────────────────

const pbId = z.string().min(1);

// ─── Competitions ──────────────────────────────────────────────────

export const CompetitionPrioritySchema = z.enum(['A', 'B', 'C']);

export const CompetitionsSchema = z.object({
    season_id: pbId,
    name: z.string().min(1).max(255),
    date: z.iso.datetime(),
    priority: CompetitionPrioritySchema,
    location: z.string().optional(),
    notes: z.string().optional(),
});

// ─── Achievements ──────────────────────────────────────────────────

export const AchievementTypeSchema = z.enum([
    'streak',
    'personal_best',
    'milestone',
    'consistency',
]);

export const AchievementsSchema = z.object({
    athlete_id: pbId,
    type: AchievementTypeSchema,
    earned_at: z.iso.datetime(),
    title: z.string().optional(),
    description: z.string().optional(),
});

// ─── Notifications ─────────────────────────────────────────────────

export const NotificationTypeSchema = z.enum([
    'plan_published',
    'checkin_reminder',
    'achievement',
    'system',
]);

export const NotificationsSchema = z.object({
    user_id: pbId,
    type: NotificationTypeSchema,
    message: z.string().min(1),
    read: z.boolean(),
    link: z.string().optional(),
});

// ─── Error Logs ────────────────────────────────────────────────────

export const ErrorLogsSchema = z.object({
    user_id: z.string().optional(),
    error: z.string().min(1),
    stack: z.string().optional(),
    device_info: z.string().optional(),
    url: z.string().optional(),
});
