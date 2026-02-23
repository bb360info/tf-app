/**
 * computeStreak.test.ts
 * Unit tests for the timezone-safe computeStreak function.
 */

import { describe, it, expect } from 'vitest';
import { computeStreak } from '../achievements';

// Helper: generate ISO date strings relative to today
function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

describe('computeStreak', () => {
    it('returns 0 for empty array', () => {
        expect(computeStreak([])).toBe(0);
    });

    it('returns 1 for a single check-in today', () => {
        expect(computeStreak([daysAgo(0)])).toBe(1);
    });

    it('returns 1 for a single check-in yesterday', () => {
        expect(computeStreak([daysAgo(1)])).toBe(1);
    });

    it('returns 0 if last check-in was 2+ days ago', () => {
        expect(computeStreak([daysAgo(2)])).toBe(0);
    });

    it('returns 3 for 3 consecutive days ending today', () => {
        const dates = [daysAgo(0), daysAgo(1), daysAgo(2)];
        expect(computeStreak(dates)).toBe(3);
    });

    it('returns 3 for 3 consecutive days ending yesterday', () => {
        const dates = [daysAgo(1), daysAgo(2), daysAgo(3)];
        expect(computeStreak(dates)).toBe(3);
    });

    it('stops counting at a gap', () => {
        // today, yesterday, gap, 4 days ago
        const dates = [daysAgo(0), daysAgo(1), daysAgo(4)];
        expect(computeStreak(dates)).toBe(2);
    });

    it('handles unsorted input (sorts internally)', () => {
        const dates = [daysAgo(2), daysAgo(0), daysAgo(1)];
        expect(computeStreak(dates)).toBe(3);
    });

    it('handles duplicate dates', () => {
        const dates = [daysAgo(0), daysAgo(0), daysAgo(1), daysAgo(1), daysAgo(2)];
        expect(computeStreak(dates)).toBe(3);
    });

    it('handles ISO datetime strings (not just dates)', () => {
        // PocketBase returns full ISO: "2026-02-19 12:30:00.000Z"
        const today = daysAgo(0);
        const yesterday = daysAgo(1);
        const dates = [`${today} 08:00:00.000Z`, `${yesterday} 23:59:59.000Z`];
        expect(computeStreak(dates)).toBe(2);
    });

    it('returns 7 for a full week streak', () => {
        const dates = Array.from({ length: 7 }, (_, i) => daysAgo(i));
        expect(computeStreak(dates)).toBe(7);
    });
});
