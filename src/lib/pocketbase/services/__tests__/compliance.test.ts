/**
 * compliance.test.ts — TDD: RED phase
 * Tests for getWeeklyCompliance() and getExerciseComparison()
 *
 * Compliance model:
 *   - planned_sessions = unique (day_of_week, session) pairs from plan_exercises
 *   - completed_sessions = count of training_logs within the week
 *   - compliance_pct = (completed / planned) * 100, capped at 100
 */

import { describe, it, expect } from 'vitest';
import {
    calculateWeeklyCompliance,
    getExerciseComparison,
    type ComplianceInput,
    type ExerciseComparisonInput,
} from '@/lib/pocketbase/services/compliance';

// ─── Fixtures ─────────────────────────────────────────────────────

function makePlanExercise(dayOfWeek: number, session = 0, id = `ex-${dayOfWeek}-${session}`) {
    return { id, day_of_week: dayOfWeek, session };
}

function makeLog(dayOfWeek: number, weekStart: string, session = 0, id = `log-${dayOfWeek}`) {
    // weekStart = Monday, dayOfWeek=0 → Monday, 1 → Tuesday, etc.
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayOfWeek);
    return { id, date: date.toISOString(), session, plan_id: 'plan-1' };
}

const WEEK_START = '2026-02-16'; // Monday

// ─── calculateWeeklyCompliance ─────────────────────────────────────

describe('calculateWeeklyCompliance', () => {
    it('returns 0% when no sessions logged', () => {
        const input: ComplianceInput = {
            planExercises: [
                makePlanExercise(0), // Mon AM
                makePlanExercise(2), // Wed AM
                makePlanExercise(4), // Fri AM
            ],
            logs: [],
            weekStart: WEEK_START,
        };
        const result = calculateWeeklyCompliance(input);
        expect(result.percentage).toBe(0);
        expect(result.completedSessions).toBe(0);
        expect(result.plannedSessions).toBe(3);
    });

    it('returns 100% when all planned sessions have a log', () => {
        const input: ComplianceInput = {
            planExercises: [
                makePlanExercise(0), // Mon AM
                makePlanExercise(2), // Wed AM
                makePlanExercise(4), // Fri AM
            ],
            logs: [
                makeLog(0, WEEK_START, 0),
                makeLog(2, WEEK_START, 0),
                makeLog(4, WEEK_START, 0),
            ],
            weekStart: WEEK_START,
        };
        const result = calculateWeeklyCompliance(input);
        expect(result.percentage).toBe(100);
        expect(result.completedSessions).toBe(3);
        expect(result.plannedSessions).toBe(3);
    });

    it('returns ~60% when 3 of 5 sessions logged', () => {
        const input: ComplianceInput = {
            planExercises: [
                makePlanExercise(0),
                makePlanExercise(1),
                makePlanExercise(2),
                makePlanExercise(3),
                makePlanExercise(4),
            ],
            logs: [
                makeLog(0, WEEK_START),
                makeLog(1, WEEK_START),
                makeLog(2, WEEK_START),
            ],
            weekStart: WEEK_START,
        };
        const result = calculateWeeklyCompliance(input);
        expect(result.percentage).toBe(60);
        expect(result.completedSessions).toBe(3);
        expect(result.plannedSessions).toBe(5);
    });

    it('counts AM and PM sessions separately for the same day', () => {
        const input: ComplianceInput = {
            planExercises: [
                makePlanExercise(0, 0), // Mon AM
                makePlanExercise(0, 1), // Mon PM  ← different session
            ],
            logs: [
                makeLog(0, WEEK_START, 0), // logged AM
                // PM not logged
            ],
            weekStart: WEEK_START,
        };
        const result = calculateWeeklyCompliance(input);
        expect(result.plannedSessions).toBe(2);
        expect(result.percentage).toBe(50);
    });

    it('deduplicates multiple exercises on same day/session', () => {
        const input: ComplianceInput = {
            planExercises: [
                makePlanExercise(0, 0, 'ex-a'), // Mon AM — exercise 1
                makePlanExercise(0, 0, 'ex-b'), // Mon AM — exercise 2 (same slot)
                makePlanExercise(1, 0, 'ex-c'), // Tue AM
            ],
            logs: [
                makeLog(0, WEEK_START, 0), // Mon AM logged = 1 session
            ],
            weekStart: WEEK_START,
        };
        const result = calculateWeeklyCompliance(input);
        // 2 unique slots: Mon AM + Tue AM; 1 logged
        expect(result.plannedSessions).toBe(2);
        expect(result.percentage).toBe(50);
    });

    it('returns 0 for both when no exercises in plan', () => {
        const input: ComplianceInput = {
            planExercises: [],
            logs: [],
            weekStart: WEEK_START,
        };
        const result = calculateWeeklyCompliance(input);
        expect(result.percentage).toBe(0);
        expect(result.plannedSessions).toBe(0);
        expect(result.completedSessions).toBe(0);
    });

    it('caps at 100% even if extra logs exist', () => {
        const input: ComplianceInput = {
            planExercises: [makePlanExercise(0)],
            logs: [
                makeLog(0, WEEK_START, 0),
                makeLog(0, WEEK_START, 0, 'log-duplicate'), // duplicate log
            ],
            weekStart: WEEK_START,
        };
        const result = calculateWeeklyCompliance(input);
        expect(result.percentage).toBeLessThanOrEqual(100);
    });
});

// ─── getExerciseComparison ─────────────────────────────────────────

describe('getExerciseComparison', () => {
    it('returns matched status when planned and actual sets match', () => {
        const input: ExerciseComparisonInput = {
            planExercises: [
                {
                    id: 'pe-1',
                    exercise_id: 'squat',
                    day_of_week: 0,
                    session: 0,
                    sets: 3,
                    reps: '8',
                    expand: { exercise_id: { id: 'squat', name_en: 'Squat' } as never },
                },
            ],
            logExercises: [
                {
                    id: 'le-1',
                    exercise_id: 'squat',
                    sets_data: [
                        { set: 0, reps: 8, weight: 100 },
                        { set: 1, reps: 8, weight: 100 },
                        { set: 2, reps: 8, weight: 100 },
                    ],
                    expand: { exercise_id: { id: 'squat', name_en: 'Squat' } as never },
                },
            ],
        };
        const result = getExerciseComparison(input);
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('matched');
        expect(result[0].plannedSets).toBe(3);
        expect(result[0].actualSets).toBe(3);
    });

    it('returns partial status when fewer sets completed', () => {
        const input: ExerciseComparisonInput = {
            planExercises: [
                {
                    id: 'pe-1',
                    exercise_id: 'squat',
                    day_of_week: 0,
                    session: 0,
                    sets: 4,
                    reps: '5',
                    expand: { exercise_id: { id: 'squat', name_en: 'Squat' } as never },
                },
            ],
            logExercises: [
                {
                    id: 'le-1',
                    exercise_id: 'squat',
                    sets_data: [{ set: 0, reps: 5, weight: 80 }, { set: 1, reps: 5, weight: 80 }],
                    expand: { exercise_id: { id: 'squat', name_en: 'Squat' } as never },
                },
            ],
        };
        const result = getExerciseComparison(input);
        expect(result[0].status).toBe('partial');
        expect(result[0].plannedSets).toBe(4);
        expect(result[0].actualSets).toBe(2);
    });

    it('returns missed status when exercise planned but not logged', () => {
        const input: ExerciseComparisonInput = {
            planExercises: [
                {
                    id: 'pe-1',
                    exercise_id: 'jump',
                    day_of_week: 0,
                    session: 0,
                    sets: 3,
                    reps: '5',
                    expand: { exercise_id: { id: 'jump', name_en: 'Jump' } as never },
                },
            ],
            logExercises: [], // nothing logged
        };
        const result = getExerciseComparison(input);
        expect(result[0].status).toBe('missed');
        expect(result[0].actualSets).toBe(0);
    });

    it('returns added status for logged exercise not in plan', () => {
        const input: ExerciseComparisonInput = {
            planExercises: [],
            logExercises: [
                {
                    id: 'le-1',
                    exercise_id: 'bonus',
                    sets_data: [{ set: 0, reps: 10 }],
                    expand: { exercise_id: { id: 'bonus', name_en: 'Bonus Exercise' } as never },
                },
            ],
        };
        const result = getExerciseComparison(input);
        expect(result[0].status).toBe('added');
        expect(result[0].plannedSets).toBe(0);
        expect(result[0].actualSets).toBe(1);
    });
});
