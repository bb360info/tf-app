import { useState, useCallback, useEffect } from 'react';
import {
    getExistingPlan,
    listPlanExercises,
} from '@/lib/pocketbase/services/plans';
import { getLogsForPlan } from '@/lib/pocketbase/services/logs';
import { getSelfAthleteId } from '@/lib/pocketbase/services/readiness';
import type { PlanExerciseWithExpand, PlanWithExercises } from '@/lib/pocketbase/services/plans';

interface UsePlanDataOptions {
    phaseId: string;
    weekNumber: number;
    startDate?: string;
}

interface UsePlanDataReturn {
    plan: PlanWithExercises | null;
    setPlan: (p: PlanWithExercises) => void;
    exercises: PlanExerciseWithExpand[];
    loading: boolean;
    error: string | null;
    athleteId: string | null;
    loggedDays: Set<number>;
    dayNotes: Record<string, string>;
    setDayNotes: (notes: Record<string, string>) => void;
    groupReadiness: Map<string, number>;
    loadPlan: () => Promise<void>;
    /** Lazy-create plan on first coach action. [Track 4.267 Phase 2] */
    ensurePlanExists: () => Promise<PlanWithExercises>;
}

/**
 * Encapsulates plan data loading, state, and side-effects for WeekConstructor.
 * Extracted from WeekConstructor to reduce its LOC (Track 4.266 Phase 3).
 */
export function usePlanData({
    phaseId,
    weekNumber,
    startDate,
}: UsePlanDataOptions): UsePlanDataReturn {
    const [plan, setPlanState] = useState<PlanWithExercises | null>(null);
    const [exercises, setExercises] = useState<PlanExerciseWithExpand[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [athleteId, setAthleteId] = useState<string | null>(null);
    const [loggedDays, setLoggedDays] = useState<Set<number>>(new Set());
    const [dayNotes, setDayNotes] = useState<Record<string, string>>({});
    const [groupReadiness, setGroupReadiness] = useState<Map<string, number>>(new Map());

    // Type-safe setPlan wrapper
    const setPlan = useCallback((p: PlanWithExercises) => setPlanState(p), []);

    // Fetch athleteId on mount
    useEffect(() => {
        getSelfAthleteId().then(setAthleteId).catch(() => { /* non-blocking */ });
    }, []);

    const loadPlan = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // [Track 4.267 Phase 2] Use getExistingPlan — do NOT create plan automatically.
            // Empty weeks stay empty until the coach adds an exercise.
            const p = await getExistingPlan(phaseId, weekNumber);
            setPlanState(p);
            const exs = p ? await listPlanExercises(p.id) : [];
            setExercises(exs);

            // Load existing logs (which days are already logged)
            if (p) {
                try {
                    const logs = await getLogsForPlan(p.id);
                    const daysWithLog = new Set<number>();
                    logs.forEach((log) => {
                        if (startDate) {
                            // [Track 4.267] Midday UTC — prevents timezone shift
                            const weekStart = new Date(`${startDate.substring(0, 10)}T12:00:00.000Z`);
                            weekStart.setDate(weekStart.getDate() + (weekNumber - 1) * 7);
                            const logDate = new Date(log.date);
                            const diff = Math.floor((logDate.getTime() - weekStart.getTime()) / 86400000);
                            if (diff >= 0 && diff < 7) daysWithLog.add(diff);
                        }
                    });
                    setLoggedDays(daysWithLog);
                } catch {
                    /* non-blocking */
                }
            }

            // Init day notes from plan
            setDayNotes(p ? ((p.day_notes as Record<string, string>) ?? {}) : {});

            // Fetch group readiness (lazy load) — only if plan exists
            if (p) {
                try {
                    const { listActivePlanAssignments } = await import('@/lib/pocketbase/services/planAssignments');
                    const { listGroupMembers } = await import('@/lib/pocketbase/services/groups');
                    const { getLatestReadinessForGroup } = await import('@/lib/pocketbase/services/readinessHistory');
                    const pb = (await import('@/lib/pocketbase/client')).default;

                    const athleteSet = new Set<string>();

                    // 1. Check if season belongs to a specific athlete
                    // [Track 4.263] phase.season_id is now optional (Schema Decoupling)
                    const phase = await pb.collection('training_phases').getOne(phaseId);
                    if (phase.season_id) {
                        const season = await pb.collection('seasons').getOne(phase.season_id);
                        if (season.athlete_id) {
                            athleteSet.add(season.athlete_id as string);
                        }
                    }
                    if (athleteSet.size === 0) {
                        // 2. Fetch assignments
                        const assignments = await listActivePlanAssignments(p.id);
                        for (const a of assignments) {
                            if (a.athlete_id) athleteSet.add(a.athlete_id);
                            if (a.group_id) {
                                const members = await listGroupMembers(a.group_id);
                                members.forEach(m => athleteSet.add(m.athlete_id));
                            }
                        }
                    }

                    if (athleteSet.size > 0) {
                        const rData = await getLatestReadinessForGroup(Array.from(athleteSet));
                        setGroupReadiness(new Map(rData.map(r => [r.athleteId, r.score])));
                    }
                } catch (err) {
                    console.warn('Failed to load group readiness:', err);
                }
            }
        } catch (err) {
            console.error('Failed to load plan:', err);
            setError('Failed to load training plan');
        } finally {
            setLoading(false);
        }
    }, [phaseId, weekNumber, startDate]);

    useEffect(() => {
        loadPlan();
    }, [loadPlan]);

    /** [Track 4.267 Phase 2] Lazy-create plan on first coach action. */
    const ensurePlanExists = useCallback(async (): Promise<PlanWithExercises> => {
        if (plan) return plan;
        const { ensurePlan } = await import('@/lib/pocketbase/services/plans');
        const created = await ensurePlan(phaseId, weekNumber);
        setPlanState(created);
        return created;
    }, [plan, phaseId, weekNumber]);

    return {
        plan,
        setPlan,
        exercises,
        loading,
        error,
        athleteId,
        loggedDays,
        dayNotes,
        setDayNotes,
        groupReadiness,
        loadPlan,
        ensurePlanExists,
    };
}
