import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

// ─── Push Notification Dedup ────────────────────────────────────────────────
// Prevents double-show when two pushes arrive in rapid succession
const seenPushIds = new Set<string>();

// ─── Serwist Core ──────────────────────────────────────────────────────────
const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// ─── Push Event Handler ────────────────────────────────────────────────────
/**
 * Handles incoming Web Push notifications.
 *
 * Foreground dedup: if the app window is visible + focused → send postMessage
 * to the React app to update the notification bell, skip OS system notification.
 *
 * Background: show system notification with click action.
 */
self.addEventListener("push", (event: PushEvent) => {
    if (!event.data) return;

    let data: { notifId?: string; title?: string; body?: string; link?: string; priority?: string } = {};
    try {
        data = event.data.json() as typeof data;
    } catch {
        /* expected: non-JSON push payload — fallback to text */
        data = { title: "New notification", body: event.data.text() };
    }

    const notifId = data.notifId ?? "";

    // Dedup: skip if already shown (rapid push burst)
    if (notifId && seenPushIds.has(notifId)) return;
    if (notifId) {
        seenPushIds.add(notifId);
        // Auto-cleanup after 60s to avoid unbounded memory growth
        setTimeout(() => seenPushIds.delete(notifId), 60_000);
    }

    const title = data.title ?? "Jumpedia";
    const body = data.body ?? "";
    const link = data.link ?? "/";

    event.waitUntil(
        (async () => {
            // Check if app window is open and visible
            const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
            const foregroundClient = clients.find((c) => c.visibilityState === "visible");

            if (foregroundClient) {
                // App is open → postMessage to React, skip OS notification
                foregroundClient.postMessage({
                    type: "NOTIFICATION_RECEIVED",
                    notifId,
                    title,
                    body,
                    link,
                });
                return;
            }

            // App is in background or closed → show OS notification
            await self.registration.showNotification(title, {
                body,
                icon: "/icons/icon-192.png",
                badge: "/icons/badge-72.png",
                tag: notifId || undefined, // tag deduplicates OS notifications by ID
                data: { link },
                requireInteraction: data.priority === "urgent",
            });

            // Increment app icon badge (PWA Badge API)
            if ('setAppBadge' in self.navigator) {
                try { await (self.navigator as Navigator & { setAppBadge(count?: number): Promise<void> }).setAppBadge(1); }
                catch { /* not critical: badge API may not be available */ }
            }
        })()
    );
});

// ─── Notification Click Handler ─────────────────────────────────────────────
/**
 * Handles click on OS notification.
 * Closes notification + navigates to the link stored in notification.data.
 */
self.addEventListener("notificationclick", (event: NotificationEvent) => {
    event.notification.close();

    // Clear app icon badge when user acts on a notification (PWA Badge API)
    if ('clearAppBadge' in self.navigator) {
        try { void (self.navigator as Navigator & { clearAppBadge(): Promise<void> }).clearAppBadge(); }
        catch { /* not critical */ }
    }

    const link: string = (event.notification.data?.link as string) ?? "/";

    event.waitUntil(
        (async () => {
            // Try to focus existing window at the link URL
            const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
            const targetUrl = new URL(link, self.location.origin).href;

            for (const client of clients) {
                if (client.url === targetUrl && "focus" in client) {
                    await client.focus();
                    return;
                }
            }

            // No matching window → open new tab
            if (self.clients.openWindow) {
                await self.clients.openWindow(link);
            }
        })()
    );
});

// ─── SW_UPDATED: notify app to restart SSE ──────────────────────────────────
/**
 * When Serwist activates a new SW (skipWaiting), open SSE connections
 * are interrupted. The app listens for SW_UPDATED and restarts subscribe().
 */
self.addEventListener("activate", () => {
    void self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
            client.postMessage({ type: "SW_UPDATED" });
        }
    });
});
