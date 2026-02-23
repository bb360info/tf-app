/**
 * usePushSubscription.ts
 * React hook for managing Web Push subscriptions.
 *
 * Features:
 *  - Request permission + subscribe via SW → save to PocketBase
 *  - Unsubscribe → delete from PocketBase
 *  - 30-day grace period after user declines (localStorage)
 *  - Respects Notification.permission === 'denied'
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    isPushSupported,
    getPushPermission,
    subscribeToPush,
    unsubscribeFromPush,
} from '@/lib/pocketbase/services/pushSubscriptions';

const DECLINED_KEY = 'push_declined_at';
const GRACE_DAYS = 30;

export type PushStatus =
    | 'idle'          // not yet checked
    | 'unsupported'   // browser doesn't support push
    | 'denied'        // user blocked permission
    | 'declined'      // user dismissed our prompt (within grace period)
    | 'subscribed'    // active subscription
    | 'unsubscribed'; // no subscription

export function usePushSubscription(userId: string) {
    const [status, setStatus] = useState<PushStatus>('idle');
    const [loading, setLoading] = useState(false);

    // Determine initial status on mount
    useEffect(() => {
        if (!isPushSupported()) {
            setStatus('unsupported');
            return;
        }

        const permission = getPushPermission();

        if (permission === 'denied') {
            setStatus('denied');
            return;
        }

        // Check 30-day grace period after user declined
        const declinedAt = localStorage.getItem(DECLINED_KEY);
        if (declinedAt) {
            const declinedDate = new Date(declinedAt);
            const diffDays = (Date.now() - declinedDate.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays < GRACE_DAYS) {
                setStatus('declined');
                return;
            }
            // Grace period expired — clear flag
            localStorage.removeItem(DECLINED_KEY);
        }

        if (permission === 'granted') {
            setStatus('subscribed');
        } else {
            setStatus('unsubscribed');
        }
    }, []);

    /** Subscribe: request permission → SW subscribe → save to PB */
    const subscribe = useCallback(async () => {
        if (!userId || loading) return;
        setLoading(true);
        try {
            const record = await subscribeToPush(userId);
            if (record) {
                setStatus('subscribed');
                localStorage.removeItem(DECLINED_KEY);
            } else {
                // Permission denied during request
                const perm = getPushPermission();
                setStatus(perm === 'denied' ? 'denied' : 'unsubscribed');
            }
        } catch {
            /* non-critical: push status check */
        } finally {
            setLoading(false);
        }
    }, [userId, loading]);

    /** Unsubscribe: browser + PB cleanup */
    const unsubscribe = useCallback(async () => {
        if (!userId || loading) return;
        setLoading(true);
        try {
            await unsubscribeFromPush(userId);
            setStatus('unsubscribed');
        } catch {
            /* non-critical: push unsubscribe */
        } finally {
            setLoading(false);
        }
    }, [userId, loading]);

    /** User dismissed our prompt — start 30-day grace period */
    const decline = useCallback(() => {
        localStorage.setItem(DECLINED_KEY, new Date().toISOString());
        setStatus('declined');
    }, []);

    return { status, loading, subscribe, unsubscribe, decline };
}
