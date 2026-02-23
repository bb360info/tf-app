/**
 * pushSubscriptions.ts
 * Client-side service for managing Web Push subscriptions.
 *
 * Handles: request permission → subscribe via SW → save to PocketBase.
 * Collections: push_subscriptions (user_id, endpoint, p256dh, auth_key, user_agent)
 */

import pb from '@/lib/pocketbase/client';
import { Collections } from '@/lib/pocketbase/collections';
import type { PushSubscriptionsRecord } from '@/lib/pocketbase/types';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

/** Convert VAPID base64 URL-safe string to Uint8Array<ArrayBuffer> for pushManager.subscribe() */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const buffer = new ArrayBuffer(rawData.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < rawData.length; i++) {
        view[i] = rawData.charCodeAt(i);
    }
    return view;
}

/** Check if push is supported in this browser */
export function isPushSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

/** Get current push permission status */
export function getPushPermission(): NotificationPermission | null {
    if (!isPushSupported()) return null;
    return Notification.permission;
}

/**
 * Subscribe current user to Web Push notifications.
 * Requests permission, creates push subscription, saves to PocketBase.
 *
 * @returns The saved PushSubscriptionsRecord, or null if not supported/denied
 */
export async function subscribeToPush(userId: string): Promise<PushSubscriptionsRecord | null> {
    if (!isPushSupported()) return null;
    if (!VAPID_PUBLIC_KEY) {
        console.warn('subscribeToPush: NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set');
        return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    // Get SW registration
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription first
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
        // Already subscribed — ensure it's saved in PB
        return upsertSubscription(userId, existing);
    }

    // Create new subscription
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    return upsertSubscription(userId, subscription);
}

/** Save or update a PushSubscription in PocketBase */
async function upsertSubscription(
    userId: string,
    subscription: PushSubscription
): Promise<PushSubscriptionsRecord | null> {
    const keys = subscription.toJSON().keys ?? {};
    const endpoint = subscription.endpoint;
    const userAgent = navigator.userAgent.slice(0, 200);

    try {
        // Check if endpoint already saved
        const existing = await pb
            .collection(Collections.PUSH_SUBSCRIPTIONS)
            .getFirstListItem<PushSubscriptionsRecord>(
                pb.filter('user_id = {:userId} && endpoint = {:endpoint}', { userId, endpoint }),
                { requestKey: `push-sub-check-${userId}` }
            )
            .catch(() => null);

        if (existing) {
            // Update in case keys changed (browser may rotate them)
            return pb
                .collection(Collections.PUSH_SUBSCRIPTIONS)
                .update<PushSubscriptionsRecord>(existing.id, {
                    p256dh: keys.p256dh ?? '',
                    auth_key: keys.auth ?? '',
                    user_agent: userAgent,
                });
        }

        // Create new record
        return pb
            .collection(Collections.PUSH_SUBSCRIPTIONS)
            .create<PushSubscriptionsRecord>({
                user_id: userId,
                endpoint,
                p256dh: keys.p256dh ?? '',
                auth_key: keys.auth ?? '',
                user_agent: userAgent,
            });
    } catch (err) {
        console.error('subscribeToPush: failed to save subscription', err);
        return null;
    }
}

/**
 * Unsubscribe current user from Web Push notifications.
 * Removes browser subscription AND deletes record from PocketBase.
 */
export async function unsubscribeFromPush(userId: string): Promise<void> {
    if (!isPushSupported()) return;

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            const endpoint = subscription.endpoint;

            // Unsubscribe from browser push
            await subscription.unsubscribe();

            // Delete from PocketBase
            const existing = await pb
                .collection(Collections.PUSH_SUBSCRIPTIONS)
                .getFirstListItem<PushSubscriptionsRecord>(
                    pb.filter('user_id = {:userId} && endpoint = {:endpoint}', { userId, endpoint }),
                    { requestKey: `push-sub-delete-${userId}` }
                )
                .catch(() => null);

            if (existing) {
                await pb.collection(Collections.PUSH_SUBSCRIPTIONS).delete(existing.id);
            }
        }
    } catch (err) {
        console.error('unsubscribeFromPush: failed', err);
    }
}

/**
 * Check if user has an active push subscription in PocketBase.
 */
export async function getActivePushSubscription(
    userId: string
): Promise<PushSubscriptionsRecord | null> {
    try {
        return await pb
            .collection(Collections.PUSH_SUBSCRIPTIONS)
            .getFirstListItem<PushSubscriptionsRecord>(
                pb.filter('user_id = {:userId}', { userId }),
                { requestKey: `push-sub-get-${userId}` }
            );
    } catch {
        /* expected: 404 — no active push subscription */
        return null;
    }
}
