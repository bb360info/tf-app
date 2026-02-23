/**
 * notifications.ts
 * In-app notification service.
 * Collection: notifications (user_id FK, type, message, read, link?)
 */

import pb from '@/lib/pocketbase/client';
import { Collections } from '@/lib/pocketbase/collections';
import type { NotificationsRecord } from '@/lib/pocketbase/types';


/** Send a coach_note notification to an athlete. Creates a record in PB. */
export async function sendCoachNote(
    athleteId: string,
    message: string,
    link?: string
): Promise<NotificationsRecord> {
    return pb.collection(Collections.NOTIFICATIONS).create<NotificationsRecord>({
        user_id: athleteId,
        type: 'coach_note',
        message,
        read: false,
        link: link ?? '',
        priority: 'normal',
    });
}

/** List unread notifications for the current user (first 20, returns totalItems for badge). */
export async function listUnread(
    userId: string
): Promise<{ items: NotificationsRecord[]; totalItems: number }> {
    const result = await pb.collection(Collections.NOTIFICATIONS).getList<NotificationsRecord>(1, 20, {
        filter: pb.filter('user_id = {:uid} && read = false', { uid: userId }),

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
