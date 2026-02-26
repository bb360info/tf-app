/**
 * notifications.ts
 * In-app notification service.
 * Collection: notifications (user_id FK, type, message, read, link?)
 */

import pb from '@/lib/pocketbase/client';
import { Collections } from '@/lib/pocketbase/collections';
import type {
    NotificationsRecord,
    NotificationType,
    NotificationPriority,
    NotificationPreferencesRecord,
} from '@/lib/pocketbase/types';


// ─── Unified Notification Sender ────────────────────────────────────

interface SendNotificationParams {
    userId: string;
    type: NotificationType;
    messageKey: string;
    messageParams?: Record<string, string | number>;
    link?: string;
    priority?: NotificationPriority;
}

/**
 * Unified notification creator.
 * 1. Validates userId (throws if empty — Poka-Yoke: fail fast)
 * 2. Checks notification preferences (disabled_types) — fail-soft
 * 3. Creates notification record in PocketBase
 */
export async function sendNotification(
    params: SendNotificationParams
): Promise<NotificationsRecord | null> {
    if (!params.userId) {
        throw new Error('sendNotification: userId is required');
    }

    // Preference check: if type is muted → skip (fail-soft: no prefs = allow all)
    try {
        const prefs = await pb
            .collection(Collections.NOTIFICATION_PREFERENCES)
            .getFirstListItem<NotificationPreferencesRecord>(
                pb.filter('user_id = {:uid}', { uid: params.userId })
            );
        if (prefs.disabled_types?.includes(params.type)) return null;
    } catch {
        // No prefs record → all types allowed (safe default)
    }

    return pb.collection(Collections.NOTIFICATIONS).create<NotificationsRecord>({
        user_id: params.userId,
        type: params.type,
        message_key: params.messageKey,
        message_params: params.messageParams ?? {},
        message: params.messageKey, // fallback for old clients / debug
        read: false,
        link: params.link ?? '',
        priority: params.priority ?? 'normal',
    });
}

/**
 * Batch check notification preferences for multiple users.
 * Single HTTP request instead of N sequential calls.
 * Returns Set<userId> of users ALLOWED to receive this notification type.
 */
export async function batchCheckPreferences(
    userIds: string[],
    type: NotificationType
): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();

    const allowed = new Set(userIds); // default: all allowed

    try {
        // Build OR filter: user_id = {:uid0} || user_id = {:uid1} || ...
        const filterParts = userIds.map((_, i) => `user_id = {:uid${i}}`).join(' || ');
        const filterParams = Object.fromEntries(userIds.map((uid, i) => [`uid${i}`, uid]));

        const prefs = await pb
            .collection(Collections.NOTIFICATION_PREFERENCES)
            .getFullList<NotificationPreferencesRecord>({
                filter: pb.filter(filterParts, filterParams),
            });

        for (const pref of prefs) {
            if (pref.disabled_types?.includes(type)) {
                allowed.delete(pref.user_id);
            }
        }
    } catch {
        // Collection inaccessible or no results → allow all (safe default)
    }

    return allowed;
}

// ─── Coach Note (convenience wrapper) ───────────────────────────────

/**
 * Send a coach_note notification to an athlete.
 * Resolves athlete.user_id (strict — no fallback to athleteId).
 * Preserves custom coach message text via messageParams.text.
 * Returns null if athlete has no linked user_id.
 */
export async function sendCoachNote(
    athleteId: string,
    message: string,
    link?: string
): Promise<NotificationsRecord | null> {
    // Resolve user_id from athlete record — STRICT, no fallback
    const athlete = await pb.collection(Collections.ATHLETES).getOne(athleteId);
    const userId = (athlete as unknown as { user_id?: string }).user_id ?? '';

    if (!userId) {
        console.warn('sendCoachNote: athlete has no linked user_id, skipping notification');
        return null;
    }

    return sendNotification({
        userId,
        type: 'coach_note',
        messageKey: 'coachNoteSent',
        messageParams: message ? { text: message } : {},
        link,
    });
}

// ─── Read / List Operations ──────────────────────────────────────────

/** List unread notifications for the current user (first 20, returns totalItems for badge). */
export async function listUnread(
    userId: string
): Promise<{ items: NotificationsRecord[]; totalItems: number }> {
    const result = await pb.collection(Collections.NOTIFICATIONS).getList<NotificationsRecord>(1, 20, {
        filter: pb.filter('user_id = {:uid} && read = false', { uid: userId }),
        sort: '-id',
    });
    return { items: result.items, totalItems: result.totalItems };
}

/** List notifications with pagination (default page 1, 20 per page). */
export async function listPaginated(
    userId: string,
    page = 1,
    perPage = 20
): Promise<{ items: NotificationsRecord[]; totalItems: number; totalPages: number }> {
    const result = await pb
        .collection(Collections.NOTIFICATIONS)
        .getList<NotificationsRecord>(page, perPage, {
            filter: pb.filter('user_id = {:uid}', { uid: userId }),
            sort: '-id',
        });
    return { items: result.items, totalItems: result.totalItems, totalPages: result.totalPages };
}

/** List notifications filtered by type. */
export async function listByType(
    userId: string,
    type: NotificationsRecord['type'],
    page = 1,
    perPage = 20
): Promise<{ items: NotificationsRecord[]; totalItems: number }> {
    const result = await pb
        .collection(Collections.NOTIFICATIONS)
        .getList<NotificationsRecord>(page, perPage, {
            filter: pb.filter('user_id = {:uid} && type = {:type}', { uid: userId, type }),
            sort: '-id',
        });
    return { items: result.items, totalItems: result.totalItems };
}

/** @deprecated Use listPaginated() */
export async function listAll(userId: string): Promise<NotificationsRecord[]> {
    const result = await pb.collection(Collections.NOTIFICATIONS).getList<NotificationsRecord>(1, 20, {
        filter: pb.filter('user_id = {:uid}', { uid: userId }),

    });
    return result.items;
}

/** Mark a single notification as read. */
export async function markRead(notificationId: string): Promise<NotificationsRecord> {
    return pb.collection(Collections.NOTIFICATIONS).update<NotificationsRecord>(notificationId, {
        read: true,
    });
}

/** Mark all unread notifications as read for the current authenticated user.
 * Uses batch endpoint O(1) instead of N+1 HTTP calls. */
export async function markAllRead(): Promise<void> {
    if (!pb.authStore.isValid) return;
    await pb.send('/api/custom/mark-all-read', { method: 'POST' });
}

/** Count unread notifications. */
export async function countUnread(userId: string): Promise<number> {
    const result = await pb.collection(Collections.NOTIFICATIONS).getList(1, 1, {
        filter: pb.filter('user_id = {:userId} && read = false', { userId }),
        requestKey: `notifs-count-${userId}`,
    });
    return result.totalItems;
}
