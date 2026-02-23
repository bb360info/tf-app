/**
 * push-service: Cloudflare Worker
 * Handles batch Web Push VAPID notifications for Jumpedia.
 *
 * Endpoint: POST /push-batch
 * Auth:     Authorization: Bearer <PUSH_WORKER_SECRET>
 * Health:   GET /health (public)
 *
 * Request body:
 * {
 *   "notifications": [
 *     {
 *       "payload": { "title": "...", "body": "...", "link": "/..." },
 *       "subscriptions": [
 *         { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } }
 *       ]
 *     }
 *   ]
 * }
 *
 * Response:
 * { "results": [{ "endpoint": "...", "status": 200|410|500 }] }
 */

import webpush from 'web-push';

/** Rate limiter: max 10 requests per second per IP (in-memory, resets on Worker restart) */
const rateLimitMap = new Map(); // ip -> { count, resetAt }

function checkRateLimit(ip) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + 1000 });
        return true;
    }

    if (entry.count >= 10) return false;
    entry.count++;
    return true;
}

/** Send a single push notification, returns status code */
async function sendPush(subscription, payload, env) {
    try {
        await webpush.sendNotification(
            {
                endpoint: subscription.endpoint,
                keys: subscription.keys,
            },
            JSON.stringify(payload),
            {
                vapidDetails: {
                    subject: env.VAPID_SUBJECT,
                    publicKey: env.VAPID_PUBLIC_KEY,
                    privateKey: env.VAPID_PRIVATE_KEY,
                },
                TTL: 86400, // 24 hours
            }
        );
        return 200;
    } catch (err) {
        // 410 Gone = stale subscription (must delete from DB)
        return err.statusCode ?? 500;
    }
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // ── Health check (public) ────────────────────────────────────
        if (request.method === 'GET' && url.pathname === '/health') {
            return Response.json({ ok: true, service: 'push-service', ts: Date.now() });
        }

        // ── Rate limiting ────────────────────────────────────────────
        const clientIp = request.headers.get('CF-Connecting-IP') ?? 'unknown';
        if (!checkRateLimit(clientIp)) {
            return new Response('Too Many Requests', {
                status: 429,
                headers: { 'Retry-After': '1' },
            });
        }

        // ── Auth check ───────────────────────────────────────────────
        const authHeader = request.headers.get('Authorization') ?? '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        if (!token || token !== env.PUSH_WORKER_SECRET) {
            return new Response('Unauthorized', { status: 401 });
        }

        // ── POST /push-batch ─────────────────────────────────────────
        if (request.method === 'POST' && url.pathname === '/push-batch') {
            let body;
            try {
                body = await request.json();
            } catch {
                return new Response('Bad Request: invalid JSON', { status: 400 });
            }

            if (!Array.isArray(body?.notifications)) {
                return new Response('Bad Request: notifications must be array', { status: 400 });
            }

            const results = [];

            for (const item of body.notifications) {
                if (!item.payload || !Array.isArray(item.subscriptions)) continue;

                // Process subscriptions in parallel (per notification item)
                const itemResults = await Promise.all(
                    item.subscriptions.map(async (sub) => {
                        const status = await sendPush(sub, item.payload, env);
                        return { endpoint: sub.endpoint, status };
                    })
                );

                results.push(...itemResults);
            }

            return Response.json({ results, ts: Date.now() });
        }

        return new Response('Not Found', { status: 404 });
    },
};
