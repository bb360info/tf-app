/**
 * PocketBase Service: Training Logs & Log Exercises
 * Unified module — athlete records actual performance against a plan.
 * Replaces the old trainingLogs.ts (now a re-export shim).
 */

import pb from '../client';
import { Collections } from '../collections';
import type {
    TrainingLogsRecord,
    LogExercisesRecord,
    SetData,
    ExercisesRecord,
} from '../types';
import type { RecordModel } from 'pocketbase';
import { toLocalISODate } from '@/lib/utils/dateHelpers';

// Re-export plan resolution (moved to planResolution.ts for SRP)
export { getPublishedPlanForToday } from './planResolution';

// ─── Type Helpers ─────────────────────────────────────────────────

export type LogExerciseWithExpand = LogExercisesRecord &
    RecordModel & {
        expand?: {
            exercise_id?: ExercisesRecord & RecordModel;
        };
    };

export type TrainingLogWithRelations = TrainingLogsRecord & RecordModel;

// ─── Private Helpers ──────────────────────────────────────────────


// ─── Training Logs ────────────────────────────────────────────────

/**
 * Get or create a training log for a specific athlete + plan + date [+ session].
 * UNIQUE constraint: athlete_id + plan_id + date + session → idempotent.
 */
export async function getOrCreateLog(
    athleteId: string,
    planId: string,
    dateStr: string, // ISO date string, e.g. "2026-02-19"
    session = 0,     // 0=AM (default), 1=PM
    logMode?: import('../types').LogMode
): Promise<TrainingLogWithRelations> {
    const dateOnly = dateStr.slice(0, 10);
    const dateEnd = dateOnly + 'T23:59:59';
    try {
        const existing = await pb
            .collection(Collections.TRAINING_LOGS)
            .getFirstListItem<TrainingLogWithRelations>(
                pb.filter(
                    'athlete_id = {:aid} && plan_id = {:pid} && date >= {:start} && date < {:end} && session = {:session}',
                    { aid: athleteId, pid: planId, start: dateOnly, end: dateEnd, session }
                )
            );
        return existing;
    } catch {
        /* expected: 404 — log not found, create new one */
        const created = await pb.collection(Collections.TRAINING_LOGS).create<TrainingLogWithRelations>({
            athlete_id: athleteId,
            plan_id: planId,
            date: new Date(dateOnly).toISOString(),
            session,
            ...(logMode ? { log_mode: logMode } : {}),
        });
        return created;
    }
}

/**
 * Check if a training log exists for a given athlete + plan + date [+ session].
 * Returns null if not found (no create side-effect).
 */
export async function getLogIfExists(
    athleteId: string,
    planId: string,
    dateStr: string,
    session = 0
): Promise<TrainingLogWithRelations | null> {
    const dateOnly = dateStr.slice(0, 10);
    const dateEnd = dateOnly + 'T23:59:59';
    try {
        return await pb
            .collection(Collections.TRAINING_LOGS)
            .getFirstListItem<TrainingLogWithRelations>(
                pb.filter(
                    'athlete_id = {:aid} && plan_id = {:pid} && date >= {:start} && date < {:end} && session = {:session}',
                    { aid: athleteId, pid: planId, start: dateOnly, end: dateEnd, session }
                )
            );
    } catch {
        /* expected: 404 — log does not exist */
        return null;
    }
}

/** List today's training logs for an athlete */
export async function listTodayLogs(athleteId: string): Promise<TrainingLogWithRelations[]> {
    const today = toLocalISODate();
    const todayEnd = today + 'T23:59:59';
    return pb.collection(Collections.TRAINING_LOGS).getFullList<TrainingLogWithRelations>({
        filter: pb.filter(
            'athlete_id = {:aid} && date >= {:start} && date < {:end}',
            { aid: athleteId, start: today, end: todayEnd }
        ),
        sort: 'session',
    });
}

/** Create a new training log */
export async function createTrainingLog(data: {
    athlete_id: string;
    plan_id?: string;
    date?: string; // ISO YYYY-MM-DD, defaults to today
    session?: number;
    notes?: string;
    rpe?: number;
    duration_min?: number;
    log_mode?: import('../types').LogMode;
}): Promise<TrainingLogWithRelations> {
    return pb.collection(Collections.TRAINING_LOGS).create<TrainingLogWithRelations>({
        ...data,
        date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
        session: data.session ?? 0,
    });
}

/**
 * Update an existing training log (e.g. notes debounced autosave, readiness_score).
 */
export async function updateTrainingLog(
    logId: string,
    data: { notes?: string; readiness_score?: number }
): Promise<TrainingLogWithRelations> {
    return pb.collection(Collections.TRAINING_LOGS)
        .update<TrainingLogWithRelations>(logId, data);
}


/**
 * List all training logs for a plan (all athletes).
 * Useful for coach to see completion status.
 */
export async function getLogsForPlan(
    planId: string
): Promise<TrainingLogWithRelations[]> {
    return pb.collection(Collections.TRAINING_LOGS).getFullList<TrainingLogWithRelations>({
        filter: pb.filter('plan_id = {:pid}', { pid: planId }),
        sort: '-date',
    });
}

/**
 * List all training logs for an athlete in a given week.
 * @param athleteId
 * @param weekStartDate - Monday of the week (ISO date, YYYY-MM-DD)
 */
export async function listWeekLogs(
    athleteId: string,
    weekStartDate: string
): Promise<TrainingLogWithRelations[]> {
    const start = weekStartDate.slice(0, 10);
    const end = new Date(new Date(start).getTime() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
    return pb.collection(Collections.TRAINING_LOGS).getFullList<TrainingLogWithRelations>({
        filter: pb.filter(
            'athlete_id = {:aid} && date >= {:start} && date < {:end}',
            { aid: athleteId, start, end: end + 'T00:00:00' }
        ),
        sort: 'date,session',
    });
}

// ─── Log Exercises ────────────────────────────────────────────────

/**
 * List all log exercises for a training log, with exercise expand.
 */
export async function listLogExercises(logId: string): Promise<LogExerciseWithExpand[]> {
    return pb.collection(Collections.LOG_EXERCISES).getFullList<LogExerciseWithExpand>({
        filter: pb.filter('log_id = {:lid}', { lid: logId }),
        expand: 'exercise_id',
    });
}

/**
 * Save (upsert) a log exercise.
 */
export async function saveLogExercise(
    logId: string,
    exerciseId: string,
    setsData: SetData[],
    rpe?: number,
    skipReason?: string   // Equipment | Pain | Time | CoachDecision | Other
): Promise<LogExerciseWithExpand> {
    if (!logId) throw new Error('saveLogExercise: logId is required');
    if (!exerciseId) throw new Error('saveLogExercise: exerciseId is required');

    const payload = {
        log_id: logId,
        exercise_id: exerciseId,
        sets_data: setsData,
        ...(rpe !== undefined ? { rpe } : {}),
        ...(skipReason !== undefined ? { skip_reason: skipReason } : {}),
    };

    try {
        const existing = await pb
            .collection(Collections.LOG_EXERCISES)
            .getFirstListItem<LogExerciseWithExpand>(
                pb.filter(
                    'log_id = {:lid} && exercise_id = {:eid}',
                    { lid: logId, eid: exerciseId }
                ),
                { expand: 'exercise_id' }
            );
        return pb.collection(Collections.LOG_EXERCISES).update<LogExerciseWithExpand>(
            existing.id,
            payload,
            { expand: 'exercise_id' }
        );
    } catch {
        /* expected: 404 — log exercise not found, create new */
        return pb.collection(Collections.LOG_EXERCISES).create<LogExerciseWithExpand>(
            payload,
            { expand: 'exercise_id' }
        );
    }
}

/**
 * Batch save all log exercises for a training session.
 */
export async function batchSaveLogExercises(
    logId: string,
    entries: Array<{
        exerciseId: string;
        setsData: SetData[];
        rpe?: number;
    }>
): Promise<LogExerciseWithExpand[]> {
    return Promise.all(
        entries.map((entry) =>
            saveLogExercise(logId, entry.exerciseId, entry.setsData, entry.rpe)
        )
    );
}

/**
 * Get the last (most recent) log exercise for a specific athlete and exercise.
 * Used for Autofill functionality.
 */
export async function getLastExerciseLog(
    athleteId: string,
    exerciseId: string
): Promise<LogExerciseWithExpand | null> {
    try {
        return await pb.collection(Collections.LOG_EXERCISES).getFirstListItem<LogExerciseWithExpand>(
            pb.filter(
                'log_id.athlete_id = {:aid} && exercise_id = {:eid}',
                { aid: athleteId, eid: exerciseId }
            ),
            {
                sort: '-id',
                expand: 'exercise_id',
            }
        );
    } catch {
        return null; // 404 if no previous log exists
    }
}

/**
 * Compare weekly volume (total sets) for a given week vs the previous week.
 * @param athleteId
 * @param weekStartDate - ISO date string (YYYY-MM-DD) for Monday of the target week.
 */
export async function getWeeklyVolumeDelta(
    athleteId: string,
    weekStartDate: string
): Promise<{ current: number; previous: number; delta: number }> {
    const start = weekStartDate.slice(0, 10);
    const currentLogs = await listWeekLogs(athleteId, start);

    const prevWeekStart = new Date(new Date(start).getTime() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
    const prevLogs = await listWeekLogs(athleteId, prevWeekStart);

    const countSets = async (logs: TrainingLogWithRelations[]) => {
        let total = 0;
        for (const log of logs) {
            const exercises = await listLogExercises(log.id);
            total += exercises.reduce((acc, ex) => acc + (ex.sets_data?.length || 0), 0);
        }
        return total;
    };

    const current = await countSets(currentLogs);
    const previous = await countSets(prevLogs);

    return {
        current,
        previous,
        delta: current - previous,
    };
}

// ─── Week Status Mapping ───────────────────────────────────────────

export type DayStatus = 'done' | 'missed' | 'rest' | 'today' | 'future';

/**
 * Convert training logs for a week into a 7-slot DayStatus array (Mon–Sun).
 * @param logs - result of listWeekLogs()
 * @param weekStart - Monday of the week (YYYY-MM-DD)
 * @param today - today's date (YYYY-MM-DD), from todayForUser()
 * @param plannedDays - set of ISO date strings when training is planned
 */
export function mapLogsToWeekStatus(
    logs: TrainingLogWithRelations[],
    weekStart: string,
    today: string,
    plannedDays: Set<string> = new Set()
): DayStatus[] {
    const logDates = new Set(logs.map((l) => l.date.slice(0, 10)));
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        const iso = d.toISOString().slice(0, 10);
        if (iso === today) return 'today';
        if (iso > today) return 'future';
        if (logDates.has(iso)) return 'done';
        if (plannedDays.has(iso)) return 'missed';
        return 'rest';
    });
}

