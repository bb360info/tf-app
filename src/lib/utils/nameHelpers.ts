/**
 * Name display helpers for users with first_name / last_name fields.
 * Falls back to legacy `name` field for backward compatibility.
 * Phase 5 will migrate all components to use these helpers.
 */

export interface HasName {
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
}

/**
 * Returns display name in priority order:
 *   "First Last" → name → email prefix → ""
 * Never throws; always returns something renderable.
 */
export function getDisplayName(user?: HasName | null): string {
    if (!user) return '';
    if (user.first_name && user.last_name) {
        return `${user.first_name} ${user.last_name}`.trim();
    }
    if (user.first_name) return user.first_name;
    if (user.last_name) return user.last_name;
    if (user.name) return user.name;
    if (user.email) return user.email.split('@')[0];
    return '';
}

/**
 * Returns 1-2 char uppercase initials:
 *   "FL" from "First Last" → first char of name → "?"
 */
export function getInitials(user?: HasName | null): string {
    if (!user) return '?';
    if (user.first_name && user.last_name) {
        return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.first_name) return user.first_name[0].toUpperCase();
    const displayName = user.name || user.email?.split('@')[0] || '';
    if (!displayName) return '?';
    const parts = displayName.trim().split(/\s+/);
    return parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : parts[0][0].toUpperCase();
}
