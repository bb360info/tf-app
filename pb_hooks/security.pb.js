/**
 * PocketBase Security Hooks
 *
 * 1. Security headers (HSTS, X-Content-Type-Options, etc.)
 * 2. CORS restricted to own domains (configured via Admin UI)
 * 3. Rate limiting on auth endpoints (5 attempts / 15 min per IP)
 *
 * Deploy: copy this file to your PocketBase's `pb_hooks/` directory
 *   scp pb_hooks/security.pb.js user@your-vps:/path/to/pocketbase/pb_hooks/
 *   Then restart PocketBase.
 *
 * NOTE: PocketBase uses Goja JS VM — no setTimeout/setInterval support.
 *       Headers are Go-style: e.request.header["Header-Name"] → string[]
 */

// --- 1. Security Headers ---
onRequest((e) => {
    e.response.header().set("X-Content-Type-Options", "nosniff");
    e.response.header().set("X-Frame-Options", "DENY");
    e.response.header().set("X-XSS-Protection", "1; mode=block");
    e.response.header().set("Referrer-Policy", "strict-origin-when-cross-origin");
    e.response.header().set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload"
    );
    e.response.header().set(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()"
    );

    return e.next();
});

// --- 2. CORS ---
// PocketBase handles CORS via Settings > Application in the admin UI.
// Set these allowed origins in the admin panel:
//   - https://jumpedia.app
//   - http://localhost:3000
//   - http://localhost:3001
//
// This file does NOT override PocketBase's built-in CORS.
// Configure it via: Admin UI → Settings → Application → Allowed origins.

// --- 3. Rate Limiting for Auth (login) ---
// Simple in-memory rate limiter: 5 login attempts per IP per 15 minutes.
// Stale entries are cleaned up inline on each request (no setInterval needed).
const loginAttempts = {};
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Get the real client IP, accounting for Cloudflare proxy.
 * Priority: CF-Connecting-IP > X-Forwarded-For (first) > remoteAddr
 */
function getRealIP(request) {
    // Cloudflare sets CF-Connecting-IP to the real client IP
    const cfIP = request.header["Cf-Connecting-Ip"];
    if (cfIP && cfIP.length > 0 && cfIP[0]) {
        return cfIP[0].trim();
    }

    // Fallback: X-Forwarded-For (first entry is original client)
    const xff = request.header["X-Forwarded-For"];
    if (xff && xff.length > 0 && xff[0]) {
        return xff[0].split(",")[0].trim();
    }

    // Last resort: direct connection IP
    return request.remoteAddr || "unknown";
}

onRequest((e) => {
    const path = e.request.url.path;

    // Only rate-limit auth-with-password endpoints
    if (!path.includes("/auth-with-password")) {
        return e.next();
    }

    const now = Date.now();

    // Inline cleanup: purge expired entries on each auth request
    for (const key in loginAttempts) {
        if (now > loginAttempts[key].resetAt) {
            delete loginAttempts[key];
        }
    }

    const ip = getRealIP(e.request);

    if (!loginAttempts[ip]) {
        loginAttempts[ip] = { count: 0, resetAt: now + RATE_WINDOW_MS };
    }

    const entry = loginAttempts[ip];

    // Reset window if expired
    if (now > entry.resetAt) {
        entry.count = 0;
        entry.resetAt = now + RATE_WINDOW_MS;
    }

    entry.count++;

    if (entry.count > RATE_LIMIT) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        e.response.header().set("Retry-After", String(retryAfter));
        return e.tooManyRequests("Too many login attempts. Try again later.");
    }

    return e.next();
});
