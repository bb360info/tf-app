/**
 * notificationPreferences.ts
 * Client-side service for notification_preferences collection.
 *
 * Implements upsert pattern: getOrCreate → update.
 * Prevents duplicate records per user (UNIQUE idx on user_id).
 */

import pb from '@/lib/pocketbase/client';
import { Collections } from '@/lib/pocketbase/collections';
import type { NotificationPreferencesRecord, NotificationType } from '@/lib/pocketbase/types';
import { reportError } from '@/lib/telemetry';

/** Fetch preferences for a user, or create defaults if not found (upsert). */
export async function getOrCreatePreferences(
    userId: string
): Promise<NotificationPreferencesRecord> {
    try {
        return await pb
            .collection(Collections.NOTIFICATION_PREFERENCES)
            .getFirstListItem<NotificationPreferencesRecord>(
                pb.filter('user_id = {:userId}', { userId }),
                { requestKey: `notif-prefs-${userId}` }
            );
    } catch {
        // 404 → create default preferences
        return pb
            .collection(Collections.NOTIFICATION_PREFERENCES)
            .create<NotificationPreferencesRecord>({
                user_id: userId,
                push_enabled: true,
                email_enabled: false,
                disabled_types: [],
                quiet_hours_start: null,
                quiet_hours_end: null,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            });
    }
}

/** Get preferences (read-only, returns null if not found). */
export async function getPreferences(
    userId: string
): Promise<NotificationPreferencesRecord | null> {
    try {
        return await pb
            .collection(Collections.NOTIFICATION_PREFERENCES)
            .getFirstListItem<NotificationPreferencesRecord>(
                pb.filter('user_id = {:userId}', { userId }),
                { requestKey: `notif-prefs-${userId}` }
            );
    } catch {
        /* expected: 404 — no preferences found */
        return null;
    }
}

/** Update preferences by record ID. */
export async function updatePreferences(
    recordId: string,
    data: Partial<Pick<
        NotificationPreferencesRecord,
        'push_enabled' | 'email_enabled' | 'disabled_types' | 'quiet_hours_start' | 'quiet_hours_end' | 'timezone'
    >>
): Promise<NotificationPreferencesRecord> {
    return pb
        .collection(Collections.NOTIFICATION_PREFERENCES)
        .update<NotificationPreferencesRecord>(recordId, data);
}

/** Toggle a specific notification type on/off for a user.
 * Handles upsert internally. */
export async function toggleNotificationType(
    userId: string,
    type: NotificationType,
    enabled: boolean
): Promise<NotificationPreferencesRecord> {
    try {
        const prefs = await getOrCreatePreferences(userId);
        const current = prefs.disabled_types ?? [];
        const disabled_types = enabled
            ? current.filter((t) => t !== type)
            : [...new Set([...current, type])];

        return updatePreferences(prefs.id, { disabled_types });
    } catch (err) {
        reportError(err instanceof Error ? err : new Error(String(err)));
        throw err;
    }
}

/** Update quiet hours window (both start + end, nullable to disable). */
export async function updateQuietHours(
    userId: string,
    start: string | null,
    end: string | null,
    timezone?: string
): Promise<NotificationPreferencesRecord> {
    const prefs = await getOrCreatePreferences(userId);
    return updatePreferences(prefs.id, {
        quiet_hours_start: start ?? undefined,
        quiet_hours_end: end ?? undefined,
        ...(timezone ? { timezone } : {}),
    });
}
