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
    // Get today in the target timezone as YYYY-MM-DD string
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
    // Use T12:00:00Z trick to avoid DST: midnight local can shift day, noon Z never does
    const d = new Date(`${todayStr}T12:00:00Z`);
    const day = d.getUTCDay(); // 0=Sun, 1=Mon ... 6=Sat (UTC-safe at noon)
    const diff = day === 0 ? -6 : 1 - day; // distance back to Monday
    const mondayMs = d.getTime() + diff * 24 * 60 * 60 * 1000;
    return new Date(mondayMs).toISOString().slice(0, 10); // YYYY-MM-DD
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

/**
 * Calendar-day difference between two YYYY-MM-DD strings.
 * T12:00:00Z trick neutralises DST:
 * at noon UTC the date never shifts, so (to - from) / msPerDay is always exact.
 * Safe for US spring-forward (2024-03-10) and EU fall-back (2024-10-27).
 *
 * @example
 * diffCalendarDays('2024-03-10', '2024-03-11') // 1 (US DST — not 0 or 2)
 * diffCalendarDays('2024-01-01', '2024-01-01') // 0
 */
export function diffCalendarDays(from: string, to: string): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor(
        (new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / msPerDay
    );
}

/**
 * Get the Date for a specific weekday relative to the week's Monday.
 * DRY helper — replaces inline getDayDate() in WeekConstructor and AthleteTrainingView.
 *
 * @param weekStart - Monday of the week (Date object)
 * @param dayIndex  - 0=Monday, 1=Tuesday, ..., 6=Sunday
 *
 * @example
 * getWeekDayDate(monday, 0) // Monday
 * getWeekDayDate(monday, 6) // Sunday
 */
export function getWeekDayDate(weekStart: Date, dayIndex: number): Date {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + dayIndex);
    return d;
}
