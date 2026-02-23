/**
 * validation/push.ts
 * Zod schemas for push_subscriptions and notification_preferences collections.
 */

import { z } from 'zod/v4';

const pbId = z.string().min(1);

// IANA timezone format: "Europe/Moscow", "Asia/Shanghai", "America/New_York"
const ianaTimezone = z
    .string()
    .regex(/^[A-Za-z_]+\/[A-Za-z_\/]+$/, 'Must be IANA timezone (e.g. Europe/Moscow)');

// HH:MM time format
const timeHHMM = z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format (e.g. 22:00)');

export const NotificationTypeSchema = z.enum([
    'plan_published',
    'checkin_reminder',
    'achievement',
    'system',
    'low_readiness',
    'coach_note',
    'invite_accepted',
    'competition_upcoming',
]);

// ─── Push Subscription ──────────────────────────────────────────────

export const PushSubscriptionSchema = z.object({
    user_id: pbId,
    endpoint: z.url('Must be a valid push endpoint URL'),
    p256dh: z.string().min(1),
    auth_key: z.string().min(1),
    user_agent: z.string().optional(),
});

export type PushSubscriptionInput = z.infer<typeof PushSubscriptionSchema>;

// ─── Notification Preferences ───────────────────────────────────────

export const NotificationPreferencesSchema = z.object({
    user_id: pbId,
    push_enabled: z.boolean().default(true),
    email_enabled: z.boolean().default(false),
    disabled_types: z.array(NotificationTypeSchema).default([]),
    quiet_hours_start: timeHHMM.optional(),
    quiet_hours_end: timeHHMM.optional(),
    timezone: ianaTimezone.optional(),
});

export type NotificationPreferencesInput = z.infer<typeof NotificationPreferencesSchema>;
