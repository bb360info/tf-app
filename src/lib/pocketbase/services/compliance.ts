/**
 * compliance.ts
 * Pure business logic for training plan compliance calculation.
 * NO PocketBase calls — takes pre-fetched data as input (testable without mocks).
 *
 * Two functions:
 *  1. calculateWeeklyCompliance() — session-aware compliance percentage
 *  2. getExerciseComparison()     — planned vs actual exercise diff
 */

import type { PlanExercisesRecord, ExercisesRecord, SetData } from '../types';

// ─── Input Types ──────────────────────────────────────────────────

type MinimalPlanExercise = Pick<PlanExercisesRecord, 'id' | 'day_of_week' | 'session'>;

type MinimalLog = {
    id: string;
    date: string;  // ISO datetime
    session?: number;
    plan_id?: string;
};

export type ComplianceInput = {
    planExercises: MinimalPlanExercise[];
    logs: MinimalLog[];
    weekStart: string;  // ISO date: YYYY-MM-DD (Monday of the week)
};

export type ComplianceResult = {
    plannedSessions: number;
    completedSessions: number;
    percentage: number; // 0-100, integer
};

// ─── Exercise Comparison Types ────────────────────────────────────

type ComparisonPlanExercise = Partial<PlanExercisesRecord> & {
    id: string;
    expand?: { exercise_id?: (Partial<ExercisesRecord> & { id: string; name_en: string }) };
};

type ComparisonLogExercise = {
    id: string;
    exercise_id: string;
    sets_data: SetData[];
    expand?: { exercise_id?: { id: string; name_en: string } };
};

export type ExerciseComparisonInput = {
    planExercises: ComparisonPlanExercise[];
    logExercises: ComparisonLogExercise[];
};

export type ExerciseComparisonStatus = 'matched' | 'partial' | 'missed' | 'added';

export type ExerciseComparisonRow = {
    exerciseId: string;
    exerciseName: string;
    plannedSets: number;
    actualSets: number;
    status: ExerciseComparisonStatus;
};

// ─── calculateWeeklyCompliance ────────────────────────────────────

/**
 * Calculate weekly training compliance.
 *
 * Algorithm:
 * 1. Count UNIQUE (day_of_week, session) pairs from plan_exercises → plannedSessions
 * 2. For each planned (day_of_week, session), check if a training_log exists on that date
 * 3. completedSessions = count of planned slots that have a matching log
 * 4. percentage = Math.round((completed / planned) * 100), capped at 100
 */
export function calculateWeeklyCompliance(input: ComplianceInput): ComplianceResult {
    const { planExercises, logs, weekStart } = input;

    if (planExercises.length === 0) {
        return { plannedSessions: 0, completedSessions: 0, percentage: 0 };
    }

    // Step 1: Collect unique (day_of_week, session) slots
    const plannedSlots = new Set<string>();
    for (const ex of planExercises) {
        const day = ex.day_of_week ?? 0;
        const session = ex.session ?? 0;
        plannedSlots.add(`${day}:${session}`);
    }

    const weekStartDate = new Date(weekStart);
    weekStartDate.setHours(0, 0, 0, 0);

    // Step 2: Build a set of logged (day_of_week, session) slots for this week
    const loggedSlots = new Set<string>();
    for (const log of logs) {
        const logDate = new Date(log.date);
        logDate.setHours(0, 0, 0, 0);

        const diffMs = logDate.getTime() - weekStartDate.getTime();
        const dayOfWeek = Math.floor(diffMs / 86400000); // 0=Mon, 6=Sun

        if (dayOfWeek >= 0 && dayOfWeek <= 6) {
            const session = log.session ?? 0;
            loggedSlots.add(`${dayOfWeek}:${session}`);
        }
    }

    // Step 3: Match planned vs logged
    let completedSessions = 0;
    for (const slot of plannedSlots) {
        if (loggedSlots.has(slot)) {
            completedSessions++;
        }
    }

    const plannedSessions = plannedSlots.size;
    const percentage = plannedSessions === 0
        ? 0
        : Math.min(100, Math.round((completedSessions / plannedSessions) * 100));

    return { plannedSessions, completedSessions, percentage };
}

// ─── getExerciseComparison ────────────────────────────────────────

/**
 * Compare planned exercises vs actual logged exercises for a session.
 *
 * Returns rows with status:
 *  - 'matched'  → logged sets == planned sets
 *  - 'partial'  → logged sets < planned sets (> 0)
 *  - 'missed'   → exercise planned but not logged
 *  - 'added'    → exercise logged but not in plan
 */
export function getExerciseComparison(input: ExerciseComparisonInput): ExerciseComparisonRow[] {
    const { planExercises, logExercises } = input;
    const rows: ExerciseComparisonRow[] = [];

    // Map by exercise_id for quick lookup
    const logByExercise = new Map<string, ComparisonLogExercise>();
    for (const le of logExercises) {
        logByExercise.set(le.exercise_id, le);
    }

    const plannedExerciseIds = new Set<string>();

    // Process planned exercises
    for (const pe of planExercises) {
        const exId = pe.exercise_id ?? '';
        plannedExerciseIds.add(exId);

        const plannedSets = pe.sets ?? 0;
        const logged = logByExercise.get(exId);
        const actualSets = logged ? (logged.sets_data?.length ?? 0) : 0;

        let status: ExerciseComparisonStatus;
        if (actualSets === 0) {
            status = 'missed';
        } else if (actualSets >= plannedSets) {
            status = 'matched';
        } else {
            status = 'partial';
        }

        rows.push({
            exerciseId: exId,
            exerciseName: pe.expand?.exercise_id?.name_en ?? exId,
            plannedSets,
            actualSets,
            status,
        });
    }

    // Process logged exercises NOT in plan → 'added'
    for (const le of logExercises) {
        if (!plannedExerciseIds.has(le.exercise_id)) {
            rows.push({
                exerciseId: le.exercise_id,
                exerciseName: le.expand?.exercise_id?.name_en ?? le.exercise_id,
                plannedSets: 0,
                actualSets: le.sets_data?.length ?? 0,
                status: 'added',
            });
        }
    }

    return rows;
}
