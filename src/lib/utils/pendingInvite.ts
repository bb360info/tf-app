/**
 * Pending Invite Utilities — Track 4.22
 *
 * Manages the pending invite code between clicking an invite link
 * and completing registration/login/onboarding.
 *
 * Storage strategy:
 *   - Primary: localStorage (survives tab close, cross-tab)
 *   - Fallback: sessionStorage (Safari Private Mode strips localStorage)
 *   - Auto-cleanup: stale entries >24h are dropped automatically
 */

interface PendingInvite {
    code: string;
    timestamp: number; // Date.now()
}

export type PendingInviteJoinStatus =
    | 'none'
    | 'joined'
    | 'alreadyMember'
    | 'invalidOrExpired'
    | 'coachCannotJoin'
    | 'error';

export interface PendingInviteJoinResult {
    status: PendingInviteJoinStatus;
    groupName?: string;
}

const STORAGE_KEY = 'pendingInviteCode';
const JOINED_KEY = 'joinedGroup'; // sessionStorage only — for OnboardingWizard feedback
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Core Storage Helpers ─────────────────────────────────────────

function readRaw(): string | null {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        /* localStorage blocked (quota, privacy mode) */
    }
    try {
        return sessionStorage.getItem(STORAGE_KEY);
    } catch {
        /* sessionStorage also blocked */
    }
    return null;
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Save invite code to localStorage + sessionStorage (Safari Private fallback).
 * Overwrites any previously saved code.
 */
export function savePendingInvite(code: string): void {
    const data = JSON.stringify({ code, timestamp: Date.now() } satisfies PendingInvite);
    try {
        localStorage.setItem(STORAGE_KEY, data);
    } catch {
        /* quota exceeded */
    }
    try {
        sessionStorage.setItem(STORAGE_KEY, data);
    } catch {
        /* quota exceeded */
    }
}

/**
 * Get pending invite code.
 * Returns null if entry is missing, malformed, or stale (>24h).
 * Auto-clears stale entries.
 */
export function getPendingInvite(): string | null {
    const raw = readRaw();
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as PendingInvite;
        if (Date.now() - parsed.timestamp > MAX_AGE_MS) {
            clearPendingInvite(); // Auto-cleanup stale
            return null;
        }
        return parsed.code;
    } catch {
        clearPendingInvite(); // Malformed — clear
        return null;
    }
}

/**
 * Clear pending invite from all storage locations.
 */
export function clearPendingInvite(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        /* ignore */
    }
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        /* ignore */
    }
}

/**
 * Atomically consume pending invite code (get + clear in one call).
 * Second call always returns null — safe to call from multiple places.
 */
export function consumePendingInvite(): string | null {
    const code = getPendingInvite();
    if (code) clearPendingInvite();
    return code;
}

function mapJoinError(err: unknown): PendingInviteJoinStatus {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('alreadyMember')) return 'alreadyMember';
    if (message.includes('invalidOrExpired')) return 'invalidOrExpired';
    if (message.includes('coachCannotJoin')) return 'coachCannotJoin';
    return 'error';
}

/**
 * Consume pending invite and join the group.
 * Saves group name to sessionStorage for OnboardingWizard StepDone feedback.
 *
 * Called from exactly 2 places:
 *   1. LoginForm.handleSubmit / handleGoogleLogin
 *   2. OnboardingWizard.handleFinish (BEFORE specialization save)
 *
 * Returns explicit status so callers can handle UX predictably.
 */
export async function joinWithPendingInvite(): Promise<PendingInviteJoinResult> {
    const code = getPendingInvite();
    if (!code) return { status: 'none' };

    try {
        const { joinByInviteCode } = await import('@/lib/pocketbase/services/groups');
        const group = await joinByInviteCode(code);
        const groupName = (group as { name?: string }).name || 'Group';
        clearPendingInvite();
        // Save for OnboardingWizard StepDone feedback (LoginForm may consume code first)
        try {
            sessionStorage.setItem(JOINED_KEY, groupName);
        } catch {
            /* ignore */
        }
        return { status: 'joined', groupName };
    } catch (err: unknown) {
        const status = mapJoinError(err);
        // Deterministic outcomes should clear stale invite; transient errors can retry.
        if (status !== 'error') {
            clearPendingInvite();
        }
        return { status };
    }
}

/**
 * Get joined group name from sessionStorage (set by joinWithPendingInvite).
 * Reads and clears in one call — safe to call multiple times.
 *
 * Used by OnboardingWizard.StepDone to show "You joined group X" when
 * LoginForm already consumed the invite code before onboarding started.
 */
export function getJoinedGroupName(): string | null {
    try {
        const name = sessionStorage.getItem(JOINED_KEY);
        if (name) sessionStorage.removeItem(JOINED_KEY);
        return name;
    } catch {
        return null;
    }
}
