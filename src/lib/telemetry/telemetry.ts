import pb from '../pocketbase/client';

/**
 * Error Telemetry Reporter
 * Sends client-side errors to the `error_logs` PocketBase collection.
 *
 * - Rate-limited: max 10 errors per minute
 * - No auth required (error_logs createRule = "")
 * - Collects device info for debugging
 */

interface ErrorContext {
    component?: string;
    action?: string;
    extra?: Record<string, unknown>;
}

// Rate limiting state
let errorCount = 0;
let windowStart = Date.now();
const MAX_ERRORS_PER_MINUTE = 10;

function isRateLimited(): boolean {
    const now = Date.now();
    if (now - windowStart > 60_000) {
        errorCount = 0;
        windowStart = now;
    }
    errorCount++;
    return errorCount > MAX_ERRORS_PER_MINUTE;
}

function getDeviceInfo(): string {
    if (typeof window === 'undefined') return 'ssr';
    const { userAgent, language } = navigator;
    const { innerWidth: w, innerHeight: h } = window;
    return JSON.stringify({ userAgent, language, viewport: `${w}x${h}` });
}

/**
 * Report an error to the error_logs collection.
 * Safe to call anywhere — never throws.
 */
export async function reportError(
    error: unknown,
    context?: ErrorContext
): Promise<void> {
    try {
        if (isRateLimited()) return;

        const err = error instanceof Error ? error : new Error(String(error));
        const userId = pb.authStore.record?.id ?? '';

        const prefix = context
            ? `[${context.component ?? 'unknown'}/${context.action ?? '-'}] `
            : '';
        const extraInfo = context?.extra
            ? ` | ctx: ${JSON.stringify(context.extra)}`
            : '';

        await pb.collection('error_logs').create({
            user_id: userId,
            error: `${prefix}[${err.name || 'Error'}] ${err.message}`.slice(0, 5000),
            stack: err.stack?.slice(0, 10000) ?? '',
            device_info: getDeviceInfo() + extraInfo,
            url: typeof window !== 'undefined' ? window.location.href : '',
        });
    } catch {
        // Telemetry must never crash the app
        if (typeof console !== 'undefined') {
            console.warn('[telemetry] Failed to report error');
        }
    }
}

/**
 * Install global error handlers.
 * Call once in your app entry point (e.g., layout.tsx useEffect).
 */
export function installGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
        reportError(event.error ?? event.message, {
            component: 'global',
            action: 'window.onerror',
            extra: { filename: event.filename, lineno: event.lineno },
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        reportError(event.reason ?? 'Unhandled promise rejection', {
            component: 'global',
            action: 'unhandledrejection',
        });
    });
}
