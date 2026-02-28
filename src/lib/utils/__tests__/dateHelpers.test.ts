/**
 * dateHelpers.test.ts — Track 4.266 Phase 4
 * Tests for DST-safe calendar helpers.
 *
 * Key focus: diffCalendarDays must return exactly 1 day across US/EU DST transitions,
 * not 0 or 2 as a naive ms/86400000 calculation would.
 */

import { describe, it, expect } from 'vitest';
import { diffCalendarDays, getWeekDayDate, todayForUser } from '../dateHelpers';

// ─── diffCalendarDays ──────────────────────────────────────────────

describe('diffCalendarDays', () => {
    it('returns 0 for same day', () => {
        expect(diffCalendarDays('2024-01-15', '2024-01-15')).toBe(0);
    });

    it('returns 1 for consecutive days (normal)', () => {
        expect(diffCalendarDays('2024-01-15', '2024-01-16')).toBe(1);
    });

    it('returns 1 across US spring-forward DST (2024-03-10 → 2024-03-11)', () => {
        // US clocks spring forward at 2am — 23h day, not 24h.
        // Naive ms/86400000 would give 0. T12:00Z trick gives exactly 1.
        expect(diffCalendarDays('2024-03-10', '2024-03-11')).toBe(1);
    });

    it('returns 1 across EU fall-back DST (2024-10-27 → 2024-10-28)', () => {
        // EU clocks fall back — 25h day, not 24h.
        // Naive ms/86400000 would give 2. T12:00Z trick gives exactly 1.
        expect(diffCalendarDays('2024-10-27', '2024-10-28')).toBe(1);
    });

    it('returns 7 for one full week across US DST boundary', () => {
        expect(diffCalendarDays('2024-03-10', '2024-03-17')).toBe(7);
    });
});

// ─── getWeekDayDate ────────────────────────────────────────────────

describe('getWeekDayDate', () => {
    // Monday 2024-03-11 at noon UTC (DST-safe reference date)
    const monday = new Date('2024-03-11T12:00:00Z');

    it('dayIndex=0 returns the same Monday', () => {
        const result = getWeekDayDate(monday, 0);
        expect(result.toISOString().slice(0, 10)).toBe('2024-03-11');
    });

    it('dayIndex=3 returns Thursday', () => {
        const result = getWeekDayDate(monday, 3);
        expect(result.toISOString().slice(0, 10)).toBe('2024-03-14');
    });

    it('dayIndex=6 returns Sunday', () => {
        const result = getWeekDayDate(monday, 6);
        expect(result.toISOString().slice(0, 10)).toBe('2024-03-17');
    });

    it('does not mutate the original weekStart', () => {
        const original = new Date('2024-03-11T12:00:00Z');
        const originalTime = original.getTime();
        getWeekDayDate(original, 5);
        expect(original.getTime()).toBe(originalTime);
    });
});

// ─── todayForUser ──────────────────────────────────────────────────

describe('todayForUser', () => {
    it('returns a YYYY-MM-DD formatted string without timezone argument', () => {
        const result = todayForUser();
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns a YYYY-MM-DD formatted string for UTC timezone', () => {
        const result = todayForUser('UTC');
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns a YYYY-MM-DD formatted string for Asia/Shanghai', () => {
        const result = todayForUser('Asia/Shanghai');
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns a YYYY-MM-DD formatted string for America/New_York', () => {
        const result = todayForUser('America/New_York');
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});
