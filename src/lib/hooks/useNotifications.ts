/**
 * useNotifications.ts
 * Unified notification hook: SSE realtime + BG Sync polling.
 *
 * Architecture:
 *   - Primary: pb.collection('notifications').subscribe() — SSE for real-time bell update
 *   - Fallback: 15min polling — China/offline where SSE is blocked or firewalled
 *   - Dedup: seenIds: Set<string> shared between SSE and polling
 *   - SW_UPDATED: re-subscribe SSE if service worker activates new version
 *   - Exponential backoff: 1s→2s→4s→8s→max 60s on SSE errors
 *
 * Solves BUG-1 (SW_UPDATED→SSE restart), BUG-3 (reconnect), BUG-6 (dedup)
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import pb from '@/lib/pocketbase/client';
import { Collections } from '@/lib/pocketbase/collections';
import { listUnread } from '@/lib/pocketbase/services/notifications';
import type { NotificationsRecord } from '@/lib/pocketbase/types';

const CHINA_MODE_KEY = 'china_mode';
const BG_POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes (was 15, China needs more frequent)
const SSE_MAX_BACKOFF_MS = 60_000;
const SSE_INITIAL_BACKOFF_MS = 1_000;

export function useNotifications(userId: string) {
    const [notifications, setNotifications] = useState<NotificationsRecord[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Dedup: shared between SSE and polling (BUG-6 fix)
    const seenIds = useRef(new Set<string>());

    // SSE reconnect backoff state
    const backoffMs = useRef(SSE_INITIAL_BACKOFF_MS);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSseActive = useRef(false);

    /** Mark notification as seen locally */
    const markSeen = useCallback((id: string) => {
        seenIds.current.add(id);
    }, []);

    /** Add notification to state if not already seen */
    const addNotification = useCallback((record: NotificationsRecord) => {
        if (seenIds.current.has(record.id)) return;
        seenIds.current.add(record.id);
        setNotifications((prev) => [record, ...prev]);
        setUnreadCount((prev) => prev + 1);
    }, []);

    /** Remove notification from state (after marking read) */
    const removeNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        setUnreadCount((prev) => Math.max(0, prev - 1));
    }, []);

    /** Clear all notifications (mark all read) */
    const clearAll = useCallback(() => {
        // Clear seenIds too — so new notifications arriving after "mark all read"
        // are not incorrectly deduplicated on next loadInitial()
        seenIds.current.clear();
        setNotifications([]);
        setUnreadCount(0);
    }, []);

    /** Initial load */
    const loadInitial = useCallback(async () => {
        if (!userId) return;
        try {
            const { items } = await listUnread(userId);
            const now = new Date();
            // Filter expired notifications (expires_at < now)
            const valid = items.filter((n) => {
                if (!n.expires_at) return true; // no expiry = always valid
                return new Date(n.expires_at) >= now;
            });
            for (const n of valid) seenIds.current.add(n.id);
            setNotifications(valid);
            setUnreadCount(valid.length);
        } catch {
            /* non-critical: notification fetch */
        }
    }, [userId]);

    /** Subscribe to SSE with exponential backoff on error */
    const subscribeSSE = useCallback(function subscribe() {
        if (!userId || isSseActive.current) return;

        isSseActive.current = true;

        pb.collection(Collections.NOTIFICATIONS)
            .subscribe<NotificationsRecord>('*', (e) => {
                if (e.action === 'create' && !e.record.read) {
                    addNotification(e.record);
                } else if (e.action === 'update' && e.record.read) {
                    removeNotification(e.record.id);
                }
                backoffMs.current = SSE_INITIAL_BACKOFF_MS;
            })
            .catch(() => {
                isSseActive.current = false;
                const delay = backoffMs.current;
                backoffMs.current = Math.min(delay * 2, SSE_MAX_BACKOFF_MS);

                reconnectTimer.current = setTimeout(() => {
                    subscribe();
                }, delay);
            });

    }, [userId, addNotification, removeNotification]);

    /** BG Sync polling — for China/offline. interval defaults to BG_POLL_INTERVAL_MS (5min) */
    const startBgSync = useCallback((interval = BG_POLL_INTERVAL_MS) => {
        if (!userId) return;

        const poll = async () => {
            try {
                const { items } = await listUnread(userId);
                for (const n of items) {
                    addNotification(n);
                }
            } catch {
                /* non-critical: offline poll */
            }
        };

        const timer = setInterval(() => void poll(), interval);
        return () => clearInterval(timer);
    }, [userId, addNotification]);

    // Main effect: load + SSE + BG Sync coordination
    useEffect(() => {
        if (!userId) return;

        void loadInitial();

        // Check if china_mode is active
        const chinaMode = localStorage.getItem(CHINA_MODE_KEY) === 'true';

        // SSE subscription
        subscribeSSE();

        // BG Sync polling:
        //   - China mode: 5min interval (SSE blocked by firewall)
        //   - All others: 30min fallback (in case SSE silently fails)
        const cleanupBgSync = startBgSync(chinaMode ? BG_POLL_INTERVAL_MS : 30 * 60 * 1000);

        // navigator.onLine reconnect (BUG-3 fix)
        const handleOnline = () => {
            if (!isSseActive.current) {
                backoffMs.current = SSE_INITIAL_BACKOFF_MS; // reset backoff on reconnect
                subscribeSSE();
            }
        };

        window.addEventListener('online', handleOnline);

        // SW_UPDATED: new service worker activated → restart SSE (BUG-1 fix)
        const handleSWMessage = (event: MessageEvent) => {
            if ((event.data as { type?: string })?.type === 'SW_UPDATED') {
                // Unsubscribe and re-subscribe
                void pb.collection(Collections.NOTIFICATIONS).unsubscribe('*').then(() => {
                    isSseActive.current = false;
                    backoffMs.current = SSE_INITIAL_BACKOFF_MS;
                    subscribeSSE();
                });
            } else if ((event.data as { type?: string })?.type === 'NOTIFICATION_RECEIVED') {
                // Push arrived while app is open → reload notifications
                void loadInitial();
            }
        };

        navigator.serviceWorker?.addEventListener('message', handleSWMessage);

        return () => {
            // Cleanup SSE
            void pb.collection(Collections.NOTIFICATIONS).unsubscribe('*');
            isSseActive.current = false;

            if (reconnectTimer.current) {
                clearTimeout(reconnectTimer.current);
            }

            cleanupBgSync?.();
            window.removeEventListener('online', handleOnline);
            navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
        };
    }, [userId, loadInitial, subscribeSSE, startBgSync]);

    // ── App Badge API: sync unread count with OS badge ─────────────────────
    useEffect(() => {
        // Feature-detect: Badge API not available in all browsers (not in Firefox, China WebViews)
        if (typeof navigator === 'undefined') return;
        const nav = navigator as Navigator & { setAppBadge?(count?: number): Promise<void>; clearAppBadge?(): Promise<void> };

        if (unreadCount > 0) {
            if ('setAppBadge' in nav && typeof nav.setAppBadge === 'function') {
                void nav.setAppBadge(unreadCount).catch(() => { /* non-critical */ });
            }
        } else {
            if ('clearAppBadge' in nav && typeof nav.clearAppBadge === 'function') {
                void nav.clearAppBadge().catch(() => { /* non-critical */ });
            }
        }
    }, [unreadCount]);

    return {
        notifications,
        unreadCount,
        markSeen,
        removeNotification,
        clearAll,
        reload: loadInitial,
    };
}
