/**
 * Date utility helpers for Jumpedia.
 * Timezone-aware date formatting for PocketBase filter compatibility.
 */

/**
 * Returns today's date as a YYYY-MM-DD string.
 * Uses 'en-CA' locale which formats as ISO-like YYYY-MM-DD.
 *
 * @param timezone - IANA timezone string (e.g. 'Asia/Shanghai', 'Europe/Moscow').
 *                   Defaults to 'UTC' for server-safe usage.
 *                   Athletes in China should pass their timezone for accurate date.
 *
 * @example
 * todayForUser()                    // '2026-02-23' (UTC)
 * todayForUser('Asia/Shanghai')     // '2026-02-24' (UTC+8, if past midnight)
 * todayForUser('America/New_York')  // '2026-02-23' (UTC-5)
 */
export function todayForUser(timezone?: string): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone ?? 'UTC',
    }).format(new Date());
}

/**
 * Returns the Monday of the current ISO week as a YYYY-MM-DD string.
 * Required for getWeeklyVolumeDelta() which expects a weekStartDate (Monday), not today.
 *
 * @param timezone - IANA timezone string (e.g. 'Asia/Shanghai').
 *                   Defaults to 'UTC'.
 * @example
 * getWeekStart()                    // '2026-02-23' (Monday of current UTC week)
 * getWeekStart('Asia/Shanghai')     // Monday in UTC+8
 */
export function getWeekStart(timezone?: string): string {
    const tz = timezone ?? 'UTC';
    // Get today in the target timezone
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
    const d = new Date(`${todayStr}T00:00:00`);
    const day = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat
    const diff = day === 0 ? -6 : 1 - day; // distance back to Monday
    d.setDate(d.getDate() + diff);
    return new Intl.DateTimeFormat('en-CA').format(d);
}

/**
 * Formats a Date as local calendar day (YYYY-MM-DD) without UTC shift.
 * Use this instead of toISOString().slice(0, 10) for "today" comparisons.
 */
export function toLocalISODate(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
