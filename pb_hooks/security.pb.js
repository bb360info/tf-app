/**
 * PocketBase Security Hooks (v0.36+)
 *
 * PocketBase v0.36 has built-in:
 *   - Security headers (X-XSS, X-Content-Type-Options, X-Frame-Options)
 *   - Rate limiting (configurable via Admin Settings)
 *   - CORS (configurable via --origins flag)
 *
 * This hook adds:
 *   1. Extra security headers (HSTS, Referrer-Policy, Permissions-Policy)
 *   2. Custom auth rate limiting per real IP (5 attempts / 15 min)
 *
 * IMPORTANT: PocketBase Goja runs each handler in an isolated context.
 * Module-scope variables do NOT persist across requests.
 * We use require() + shared module registry for persistent state.
 */

// --- 1. Extra Security Headers ---
routerUse(function (e) {
    e.response.header().set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload"
    );
    e.response.header().set("Referrer-Policy", "strict-origin-when-cross-origin");
    e.response.header().set(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()"
    );
    return e.next();
});

// --- 2. Auth Rate Limiting (5 attempts / 15 min per IP) ---
routerUse(function (e) {
    var path = e.request.url.path;

    // Only rate-limit auth-with-password endpoints
    if (!path || path.indexOf("/auth-with-password") === -1) {
        return e.next();
    }

    var RATE_LIMIT = 5;
    var RATE_WINDOW_MS = 15 * 60 * 1000;

    // Load shared state module (persists via require registry)
    var rl = require(__hooks + "/ratelimit.js");

    var now = Date.now();

    // Cleanup expired entries
    rl.cleanup(now);

    // Get real client IP (Cloudflare → nginx → PocketBase)
    var ip = e.request.header.get("Cf-Connecting-Ip");
    if (!ip) {
        var xff = e.request.header.get("X-Forwarded-For");
        if (xff) {
            ip = xff.split(",")[0].trim();
        }
    }
    if (!ip) {
        ip = "unknown";
    }

    var entry = rl.get(ip);
    if (!entry) {
        entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
    }

    // Reset window if expired
    if (now > entry.resetAt) {
        entry.count = 0;
        entry.resetAt = now + RATE_WINDOW_MS;
    }

    entry.count = entry.count + 1;
    rl.set(ip, entry);

    if (entry.count > RATE_LIMIT) {
        var retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        e.response.header().set("Retry-After", String(retryAfter));
        return e.json(429, {
            "message": "Too many login attempts. Try again later.",
            "status": 429,
            "data": { "retryAfter": retryAfter }
        });
    }

    return e.next();
});
