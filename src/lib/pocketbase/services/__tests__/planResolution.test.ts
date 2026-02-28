/**
 * planResolution.test.ts — Track 4.266 Phase 4
 * Tests for calcWeekNumber — DST-safe week calculation.
 *
 * Key requirement: calcWeekNumber('2024-03-10', '2024-03-17') must return 2
 * (DST spring-forward boundary — naive ms calculation returns 1 incorrectly).
 */

import { describe, it, expect } from 'vitest';
import { calcWeekNumber } from '../planResolution';

describe('calcWeekNumber', () => {
    it('returns 1 on the first day (day 0 offset)', () => {
        // Same day: diff=0, floor(0/7)+1 = 1
        expect(calcWeekNumber('2024-03-11', '2024-03-11')).toBe(1);
    });

    it('returns 1 on day 7 (last day of week 1)', () => {
        // diff=6 days: floor(6/7)+1 = 0+1 = 1
        expect(calcWeekNumber('2024-03-11', '2024-03-17')).toBe(1);
    });

    it('returns 2 on day 8 (first day of week 2)', () => {
        // diff=7 days: floor(7/7)+1 = 1+1 = 2
        expect(calcWeekNumber('2024-03-11', '2024-03-18')).toBe(2);
    });

    it('returns 2 across US DST spring-forward boundary (gate.md edge-case)', () => {
        // 2024-03-10 → 2024-03-17: exactly 7 calendar days
        // Naive ms/86400000 would give 6.958... → floor → 0 → week 1 (WRONG!)
        // diffCalendarDays T12:00Z fix gives exactly 7 → week 2 (CORRECT)
        expect(calcWeekNumber('2024-03-10', '2024-03-17')).toBe(2);
    });

    it('returns 5 for 28 days offset (4 full weeks after start)', () => {
        // diff=28: floor(28/7)+1 = 4+1 = 5
        expect(calcWeekNumber('2024-01-01', '2024-01-29')).toBe(5);
    });

    it('returns at least 1 for negative offset (timezone guard)', () => {
        // Guards against edge case where today < phaseStartDate due to tz rounding
        expect(calcWeekNumber('2024-03-15', '2024-03-14')).toBe(1);
    });
});
