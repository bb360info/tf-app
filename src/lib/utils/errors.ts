/**
 * Centralized error utilities for Jumpedia.
 * Uses existing telemetry.reportError() for PocketBase error_logs persistence.
 *
 * Usage patterns:
 *   Services:  logError(err, { component: 'plans', action: 'createOverride' })
 *   Pages:     setError(getErrorMessage(err, t('loadError')))
 *   Hooks:     logError(err, { component: 'useNotifications', action: 'fetch' })
 */

import { reportError } from '@/lib/telemetry/telemetry';

// ─── Types ────────────────────────────────────────────────────────

export interface ErrorContext {
    component: string;
    action: string;
    extra?: Record<string, unknown>;
}

// ─── Core Functions ───────────────────────────────────────────────

/**
 * Log error to console + telemetry (fire-and-forget).
 * Safe to call from services, hooks, and components.
 * NEVER throws.
 */
export function logError(error: unknown, context: ErrorContext): void {
    const err = error instanceof Error ? error : new Error(String(error));
    console.warn(`[${context.component}/${context.action}]`, err.message);
    // Fire-and-forget — telemetry must never block the call site
    reportError(error, context).catch(() => {
        /* telemetry failure is silent */
    });
}

/**
 * Extract a user-friendly message from an unknown error.
 * Handles PocketBase API errors ({response.data.message}) and standard Error objects.
 */
export function getErrorMessage(error: unknown, fallback = 'An error occurred'): string {
    if (error instanceof Error) {
        // PocketBase validation errors expose response.data.message
        const pbErr = error as Error & {
            response?: { data?: { message?: string } };
        };
        const pbMessage = pbErr.response?.data?.message;
        if (pbMessage) return pbMessage;
        return error.message;
    }
    return fallback;
}
