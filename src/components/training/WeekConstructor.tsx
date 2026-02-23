'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ChevronLeft, ChevronRight, Zap, Wand2, Send, RotateCcw, AlertTriangle, CalendarDays, Printer, FileText, History, Save, UserCog } from 'lucide-react';
import {
    getOrCreatePlan,
    listPlanExercises,
    addExerciseToPlan,
    updatePlanExercise,
    removePlanExercise,
    reorderExercises,
    groupByDay,
    groupByDayAndSession,
    calculateWeeklyCNS,
    publishPlan,
    revertToDraft,
    updatePlan,
} from '@/lib/pocketbase/services/plans';
import type { UpdateExerciseData, AdHocWarmupData } from './DayColumn';
import { autoFillWeek } from '@/lib/autofill/processor';
import { getSelfAthleteId } from '@/lib/pocketbase/services/readiness';
import { getLogsForPlan } from '@/lib/pocketbase/services/logs';
import { stampTemplate, ejectTemplate, addWarmupItem } from '@/lib/pocketbase/services/templates';
import type { PlanExerciseWithExpand, PlanWithExercises } from '@/lib/pocketbase/services/plans';
import type { ExerciseRecord } from '@/lib/pocketbase/services/exercises';
import type { PhaseType } from '@/lib/pocketbase/types';
import DayColumn from './DayColumn';
import dynamic from 'next/dynamic';
import styles from './WeekConstructor.module.css';

const ExercisePickerLazy = dynamic(() => import('./ExercisePicker'), {
    loading: () => <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>,
});
const PlanHistoryModalLazy = dynamic(() => import('./PlanHistoryModal'), {
    loading: () => null,
});
const TrainingLogLazy = dynamic(() => import('./TrainingLog'), {
    loading: () => null,
});

interface Props {
    phaseId: string;
    phaseType: PhaseType;
    phaseName: string;
    maxWeeks: number; // total weeks in this phase
    startDate?: string;
    onBack: () => void;
    onSwitchToMultiView?: () => void;
    readinessScore?: number;
}

export default function WeekConstructor({
    phaseId,
    phaseType,
    phaseName,
    maxWeeks,
    startDate,
    onBack,
    onSwitchToMultiView,
    readinessScore,
}: Props) {
    const t = useTranslations();

    const [weekNumber, setWeekNumber] = useState(1);
    const [plan, setPlan] = useState<PlanWithExercises | null>(null);
    const [exercises, setExercises] = useState<PlanExerciseWithExpand[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pickerDay, setPickerDay] = useState<number | null>(null);
    const [pickerSession, setPickerSession] = useState<number>(0);
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [athleteId, setAthleteId] = useState<string | null>(null);
    const [logActiveDay, setLogActiveDay] = useState<number | null>(null);
    /** Set of day indices (0-6) that already have a log this week */
    const [loggedDays, setLoggedDays] = useState<Set<number>>(new Set());
    /** Per-day coach notes: key = day index (0-6) as string, value = note text */
    const [dayNotes, setDayNotes] = useState<Record<string, string>>({});
    /** Group readiness data: Map<athleteId, score> */
    const [groupReadiness, setGroupReadiness] = useState<Map<string, number>>(new Map());

    // Override modal state
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [overrideAthletes, setOverrideAthletes] = useState<Array<{ id: string; name: string }>>([]);
    const [overrideAthleteId, setOverrideAthleteId] = useState('');
    const [isCreatingOverride, setIsCreatingOverride] = useState(false);
    const [overrideError, setOverrideError] = useState<string | null>(null);
    const [overrideSuccess, setOverrideSuccess] = useState(false);
    const [overrideAthletesLoading, setOverrideAthletesLoading] = useState(false);

    // Load plan for current week
    const loadPlan = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const p = await getOrCreatePlan(phaseId, weekNumber);
            setPlan(p);
            const exs = await listPlanExercises(p.id);
            setExercises(exs);
            // Load existing logs (which days are already logged)
            try {
                const logs = await getLogsForPlan(p.id);
                const daysWithLog = new Set<number>();
                logs.forEach((log) => {
                    // Determine day from log date vs week start date
                    if (startDate) {
                        const weekStart = new Date(startDate);
                        weekStart.setDate(weekStart.getDate() + (weekNumber - 1) * 7);
                        const logDate = new Date(log.date);
                        const diff = Math.floor((logDate.getTime() - weekStart.getTime()) / 86400000);
                        if (diff >= 0 && diff < 7) daysWithLog.add(diff);
                    }
                });
                setLoggedDays(daysWithLog);
            } catch {
                /* non-blocking: logs check failure should not break plan load */
            }
            // Init day notes from plan
            setDayNotes((p.day_notes as Record<string, string>) ?? {});

            // Fetch group readiness (lazy load)
            try {
                const { listActivePlanAssignments } = await import('@/lib/pocketbase/services/planAssignments');
                const { listGroupMembers } = await import('@/lib/pocketbase/services/groups');
                const { getLatestReadinessForGroup } = await import('@/lib/pocketbase/services/readinessHistory');
                const pb = (await import('@/lib/pocketbase/client')).default;

                const athleteSet = new Set<string>();

                // 1. Check if season belongs to a specific athlete
                const phase = await pb.collection('training_phases').getOne(phaseId);
                const season = await pb.collection('seasons').getOne(phase.season_id);
                if (season.athlete_id) {
                    athleteSet.add(season.athlete_id as string);
                } else {
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

        } catch (err) {
            console.error('Failed to load plan:', err);
            setError('Failed to load training plan');
        } finally {
            setLoading(false);
        }
    }, [phaseId, weekNumber, startDate]);

    useEffect(() => {
        getSelfAthleteId().then(setAthleteId).catch(() => {/* non-blocking */ });
    }, []);

    useEffect(() => {
        loadPlan();
    }, [loadPlan]);

    // Group exercises by day and session
    const dayExercises = groupByDay(exercises);
    const dayExercisesBySession = groupByDayAndSession(exercises);
    const cns = calculateWeeklyCNS(exercises);

    // ─── Handlers ────────────────────────────────────────────

    const handleAutoFill = useCallback(async () => {
        if (!plan) return;
        if (!window.confirm(t('training.confirmAutoFill'))) return;

        setIsAutoFilling(true);
        try {
            const result = await autoFillWeek(plan.id, phaseType);
            await loadPlan(); // Refresh logic

            if (result.added === 0) {
                alert(t('training.autoFillNoExercises'));
            }
        } catch (err) {
            console.error('Auto-fill failed', err);
            alert('Auto-fill failed');
        } finally {
            setIsAutoFilling(false);
        }
    }, [plan, phaseType, t, loadPlan]);

    const [showHistory, setShowHistory] = useState(false);

    // ─── Override Handlers ───────────────────────────────────────

    const handleOpenOverrideModal = useCallback(async () => {
        setShowOverrideModal(true);
        setOverrideError(null);
        setOverrideSuccess(false);
        setOverrideAthleteId('');
        if (overrideAthletes.length === 0) {
            setOverrideAthletesLoading(true);
            try {
                const { listMyAthletes } = await import('@/lib/pocketbase/services/athletes');
                const athletes = await listMyAthletes();
                setOverrideAthletes(
                    athletes.map((a) => ({
                        id: a.id,
                        name: a.name ?? a.id,
                    }))
                );
            } catch (err) {
                const { logError } = await import('@/lib/utils/errors');
                logError(err, { component: 'WeekConstructor', action: 'loadAthletes' });
                setOverrideError(t('errors.networkError'));
            } finally {
                setOverrideAthletesLoading(false);
            }
        }
    }, [overrideAthletes.length, t]);

    const handleCreateOverride = useCallback(async () => {
        if (!plan || !overrideAthleteId || isCreatingOverride) return;
        setIsCreatingOverride(true);
        setOverrideError(null);
        try {
            const { createIndividualOverride } = await import('@/lib/pocketbase/services/plans');
            await createIndividualOverride(plan.id, overrideAthleteId);
            setOverrideSuccess(true);
            setTimeout(() => {
                setShowOverrideModal(false);
                setOverrideSuccess(false);
                setOverrideAthleteId('');
            }, 1500);
        } catch (err) {
            setOverrideError(err instanceof Error ? err.message : t('errors.networkError'));
        } finally {
            setIsCreatingOverride(false);
        }
    }, [plan, overrideAthleteId, isCreatingOverride, t]);

    const handleSaveSnapshot = useCallback(async () => {
        if (!plan) return;
        try {
            const { createSnapshot } = await import('@/lib/pocketbase/services/snapshots');
            // Snapshot data: plan details + exercises
            await createSnapshot(plan.id, {
                plan,
                exercises,
                created: new Date().toISOString()
            });
            alert(t('training.saveVersion') + ' OK');
        } catch (err) {
            console.error('Snapshot failed', err);
            alert('Failed to save version');
        }
    }, [plan, exercises, t]);

    // ─── Phase 4: Template Integration Handlers ───────────────────

    /** Append training_day template exercises to a day (append-only, no eject) */
    const handleAppendTemplate = useCallback(
        async (day: number, session: number, templateId: string) => {
            if (!plan) return;
            try {
                const { appendTemplate } = await import('@/lib/pocketbase/services/templates');
                await appendTemplate(templateId, plan.id, day, session);
                await loadPlan();
            } catch (err) {
                console.error('Failed to append template:', err);
            }
        },
        [plan, loadPlan]
    );

    /** Save a plan day as a new training_day template (inline name from DayColumn) */
    const handleSaveAsTemplate = useCallback(
        async (day: number, session: number, name: string) => {
            if (!plan || !name.trim()) return;
            try {
                const pb = (await import('@/lib/pocketbase/client')).default;
                const coachId = pb.authStore.model?.id as string | undefined;
                if (!coachId) return;
                const { createTemplateFromPlanDay } = await import('@/lib/pocketbase/services/templates');
                await createTemplateFromPlanDay(plan.id, day, session, coachId, {
                    ru: name.trim(),
                    en: name.trim(),
                    cn: name.trim(),
                });
                // template saved silently — visible in Reference → Templates
            } catch (err) {
                console.error('Failed to save template:', err);
            }
        },
        [plan]
    );


    const handleAddExercise = useCallback(
        async (exercise: ExerciseRecord | import('@/lib/pocketbase/types').CustomExercisesRecord, source: 'library' | 'custom') => {
            if (!plan || pickerDay === null) return;
            const sessionExs = dayExercisesBySession[pickerDay]?.[pickerSession] ?? [];
            try {
                if (source === 'library') {
                    const ex = exercise as ExerciseRecord;
                    await addExerciseToPlan({
                        plan_id: plan.id,
                        exercise_id: ex.id,
                        day_of_week: pickerDay,
                        session: pickerSession,
                        order: sessionExs.length,
                        sets: undefined,
                        reps: ex.dosage ?? undefined,
                    });
                } else {
                    const ex = exercise as import('@/lib/pocketbase/types').CustomExercisesRecord;
                    await addExerciseToPlan({
                        plan_id: plan.id,
                        exercise_id: ex.id,
                        day_of_week: pickerDay,
                        session: pickerSession,
                        order: sessionExs.length,
                        sets: undefined,
                        reps: ex.dosage ?? undefined,
                    });
                }
                setPickerDay(null);
                setPickerSession(0);
                await loadPlan();
            } catch (err) {
                console.error('Failed to add exercise:', err);
            }
        },
        [plan, pickerDay, pickerSession, dayExercisesBySession, loadPlan]
    );


    const handleUpdateExercise = useCallback(
        async (id: string, data: UpdateExerciseData) => {
            try {
                await updatePlanExercise(id, data);
                await loadPlan();
            } catch (err) {
                console.error('Failed to update exercise:', err);
            }
        },
        [loadPlan]
    );

    const handleRemoveExercise = useCallback(
        async (id: string) => {
            try {
                await removePlanExercise(id);
                await loadPlan();
            } catch (err) {
                console.error('Failed to remove exercise:', err);
            }
        },
        [loadPlan]
    );

    const handleReorder = useCallback(
        async (id: string, direction: 'up' | 'down') => {
            const ex = exercises.find((e) => e.id === id);
            if (!ex) return;
            const day = ex.day_of_week ?? 0;
            const session = ex.session ?? 0;
            const sessionExs = [...(dayExercisesBySession[day]?.[session] ?? [])];
            const idx = sessionExs.findIndex((e) => e.id === id);
            if (idx < 0) return;

            const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= sessionExs.length) return;

            const updates = [
                { id: sessionExs[idx].id, order: sessionExs[swapIdx].order },
                { id: sessionExs[swapIdx].id, order: sessionExs[idx].order },
            ];

            try {
                await reorderExercises(updates);
                await loadPlan();
            } catch (err) {
                console.error('Failed to reorder:', err);
            }
        },
        [exercises, dayExercisesBySession, loadPlan]
    );

    // ─── Warmup Handlers ─────────────────────────────────────

    const handleStampTemplate = useCallback(
        async (day: number, session: number, templateId: string) => {
            if (!plan) return;
            try {
                await stampTemplate(templateId, plan.id, day, session);
                await loadPlan();
            } catch (err) {
                console.error('Failed to stamp template:', err);
            }
        },
        [plan, loadPlan]
    );

    const handleEjectWarmup = useCallback(
        async (day: number, session: number) => {
            if (!plan) return;
            try {
                await ejectTemplate(plan.id, day, session);
                await loadPlan();
            } catch (err) {
                console.error('Failed to eject warmup:', err);
            }
        },
        [plan, loadPlan]
    );

    const handleAddWarmupItem = useCallback(
        async (day: number, session: number, data: AdHocWarmupData) => {
            if (!plan) return;
            try {
                await addWarmupItem(plan.id, day, session, {
                    custom_text_ru: data.custom_text_ru,
                    custom_text_en: data.custom_text_en,
                    custom_text_cn: data.custom_text_cn,
                    duration_seconds: data.duration_seconds,
                });
                await loadPlan();
            } catch (err) {
                console.error('Failed to add warmup item:', err);
            }
        },
        [plan, loadPlan]
    );

    const handleDayNoteChange = useCallback(
        async (day: number, note: string) => {
            if (!plan) return;
            const updated = { ...dayNotes, [String(day)]: note };
            setDayNotes(updated);
            try {
                await updatePlan(plan.id, { day_notes: updated as Record<string, string> });
            } catch (err) {
                console.warn('[WeekConstructor] Failed to save day note:', err);
            }
        },
        [plan, dayNotes]
    );


    const handlePrevWeek = () => setWeekNumber((w) => Math.max(1, w - 1));
    const handleNextWeek = () => setWeekNumber((w) => Math.min(maxWeeks, w + 1));

    // ─── Publish / Revert ────────────────────────────────────

    const isPublished = plan?.status === 'published';
    const isReadOnly = isPublished; // Published plans are read-only

    const handlePublish = useCallback(async () => {
        if (!plan) return;
        setIsPublishing(true);
        try {
            if (isPublished) {
                const updated = await revertToDraft(plan.id);
                setPlan(updated);
            } else {
                if (!window.confirm(t('training.confirmPublish'))) return;
                const updated = await publishPlan(plan.id);
                setPlan(updated);
            }
        } catch (err) {
            console.error('Failed to update plan status:', err);
        } finally {
            setIsPublishing(false);
        }
    }, [plan, isPublished, t]);

    // ─── Helpers ────────────────────────────────────────────

    const getDayDate = (dayIndex: number) => {
        if (!startDate) return null;
        const start = new Date(startDate);
        // Add weeks
        start.setDate(start.getDate() + (weekNumber - 1) * 7);
        // Add days (assuming start_date is Monday, or adjust based on dayIndex)
        // Adjusting so day 0 is Monday
        const currentDay = start.getDay(); // 0 is Sunday
        const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;
        start.setDate(start.getDate() + distanceToMon + dayIndex);
        return start;
    };

    // ─── CNS status color ───────────────────────────────────

    const cnsColor =
        cns.status === 'red' ? 'var(--color-danger, #eb5757)' :
            cns.status === 'yellow' ? 'var(--color-warning, #f2994a)' :
                'var(--color-success, #00a86b)';

    // e.g. "Low", "Medium", "High"
    const cnsLabelKey = cns.status === 'green' ? 'cnsLow' : cns.status === 'yellow' ? 'cnsMed' : 'cnsHigh';

    if (loading && !plan) {
        // Only show full loading if no plan loaded yet (initial)
        return (
            <div className={styles.container}>
                <div className={styles.loading}>{t('loading')}</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>{error}</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Toolbar */}
            <div className={styles.toolbar}>
                <button className={styles.backBtn} onClick={onBack} aria-label={t('training.back')}>
                    <ArrowLeft size={20} />
                </button>
                <div className={styles.toolbarCenter}>
                    <span className={styles.phaseName}>{phaseName}</span>
                    <span className={styles.phaseGuideline}>
                        {t(`training.phaseGuideline_${phaseType}`)}
                    </span>
                    <div className={styles.weekNav}>
                        <button
                            className={styles.weekBtn}
                            onClick={handlePrevWeek}
                            disabled={weekNumber <= 1}
                            aria-label="Previous week"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className={styles.weekLabel}>
                            {t('training.weekConstructor')} {weekNumber}/{maxWeeks}
                        </span>
                        <button
                            className={styles.weekBtn}
                            onClick={handleNextWeek}
                            disabled={weekNumber >= maxWeeks}
                            aria-label="Next week"
                        >
                            <ChevronRight size={16} />
                        </button>

                        {onSwitchToMultiView && (
                            <button
                                className={styles.multiViewBtn}
                                onClick={onSwitchToMultiView}
                                title={t('training.multiWeekView')}
                            >
                                <CalendarDays size={16} />
                            </button>
                        )}
                    </div>
                </div>

                <div className={styles.actionsRight}>
                    <button
                        className={styles.autoFillBtn}
                        onClick={handleAutoFill}
                        disabled={isAutoFilling || isReadOnly}
                        title={t('training.autoFill')}
                    >
                        <Wand2 size={20} className={isAutoFilling ? 'animate-spin' : ''} />
                    </button>

                    {/* Publish / Revert to Draft */}
                    <button
                        className={styles.publishBtn}
                        onClick={handlePublish}
                        disabled={isPublishing}
                        title={isPublished ? t('training.planStatus_draft') : t('training.planStatus_published')}
                        style={{
                            background: isPublished
                                ? 'var(--color-warning)'
                                : 'var(--color-success)',
                        }}
                    >
                        {isPublished ? <RotateCcw size={16} /> : <Send size={16} />}
                    </button>

                    <div className={styles.exportControls}>
                        <button
                            className={styles.exportBtn}
                            onClick={() => window.print()}
                            title={t('training.print')}
                        >
                            <Printer size={16} />
                        </button>
                        <button
                            className={styles.exportBtn}
                            onClick={async () => {
                                const { generatePDF } = await import('@/lib/export/pdf-generator');
                                await generatePDF('week-grid-container', `${phaseName}-week-${weekNumber}`);
                            }}
                            title={t('training.savePdf')}
                        >
                            <FileText size={16} />
                        </button>
                        <button
                            className={styles.exportBtn}
                            onClick={() => setShowHistory(true)}
                            title={t('training.history')}
                        >
                            <History size={16} />
                        </button>
                        <button
                            className={styles.exportBtn}
                            onClick={handleSaveSnapshot}
                            title={t('training.saveVersion')}
                        >
                            <Save size={16} />
                        </button>
                        {/* Override button — only for published plans */}
                        {isPublished && (
                            <button
                                className={styles.exportBtn}
                                onClick={handleOpenOverrideModal}
                                title={t('training.createOverride')}
                                aria-label={t('training.createOverride')}
                            >
                                <UserCog size={16} />
                            </button>
                        )}
                    </div>

                    <div
                        className={styles.cnsIndicator}
                        style={{ borderColor: cnsColor }}
                        title={`${t('training.cnsLabel')}: ${cns.total} (${t(`training.${cnsLabelKey}`)})`}
                    >
                        <Zap size={14} style={{ color: cnsColor }} />
                        <span style={{ color: cnsColor }}>{cns.total}</span>
                    </div>
                </div>
            </div>

            {/* Status badge */}
            {plan && (
                <div className={styles.statusRow}>
                    <span className={`${styles.statusBadge} ${styles[`status_${plan.status}`]}`}>
                        {t(`training.planStatus_${plan.status}`)}
                    </span>
                    <span className={styles.exerciseTotal}>
                        {exercises.length} {t('training.exercisesFound')}
                    </span>

                    {/* Adaptation Warning */}
                    {readinessScore !== undefined && readinessScore < 50 && (
                        <div className={styles.adaptationWarning}>
                            <AlertTriangle size={14} /> {t('training.lowReadinessWarning')} — {t('training.reduceVolume')}
                        </div>
                    )}
                </div>
            )}

            {/* 7-day grid */}
            <div id="week-grid-container" className={styles.grid}>
                {Array.from({ length: 7 }, (_, day) => (
                    <DayColumn
                        key={day}
                        dayOfWeek={day}
                        date={getDayDate(day)}
                        groupReadiness={groupReadiness}
                        exercisesBySession={dayExercisesBySession[day] ?? { 0: [] }}
                        onAdd={(session) => { setPickerSession(session); setPickerDay(day); }}
                        onUpdate={handleUpdateExercise}
                        onRemove={handleRemoveExercise}
                        onReorder={handleReorder}
                        onStampTemplate={!isReadOnly ? handleStampTemplate : undefined}
                        onEjectWarmup={!isReadOnly ? handleEjectWarmup : undefined}
                        onAddWarmupItem={!isReadOnly ? handleAddWarmupItem : undefined}
                        onAppendTemplate={!isReadOnly ? handleAppendTemplate : undefined}
                        onSaveAsTemplate={!isReadOnly ? handleSaveAsTemplate : undefined}
                        planId={plan?.id}
                        athleteId={athleteId ?? undefined}
                        hasLog={loggedDays.has(day)}
                        onLogResult={() => setLogActiveDay(day)}
                        readOnly={isReadOnly}
                        dayNote={dayNotes[String(day)] ?? ''}
                        onDayNoteChange={!isReadOnly ? (note) => handleDayNoteChange(day, note) : undefined}
                    />
                ))}
            </div>

            {/* Training Log Modal */}
            {logActiveDay !== null && plan && athleteId && (
                <TrainingLogLazy
                    planId={plan.id}
                    dayOfWeek={logActiveDay}
                    dayDate={getDayDate(logActiveDay)}
                    athleteId={athleteId}
                    readinessScore={readinessScore}
                    onClose={() => setLogActiveDay(null)}
                    onSaved={() => {
                        setLogActiveDay(null);
                        loadPlan(); // refresh to update hasLog badges
                    }}
                />
            )}

            {/* Exercise Picker */}
            {pickerDay !== null && (
                <ExercisePickerLazy
                    phaseType={phaseType}
                    onSelect={handleAddExercise}
                    onClose={() => setPickerDay(null)}
                />
            )}

            {/* History Modal */}
            {showHistory && plan && (
                <PlanHistoryModalLazy
                    planId={plan.id}
                    onClose={() => setShowHistory(false)}
                />
            )}

            {/* Override Modal */}
            {showOverrideModal && (
                <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label={t('training.createOverride')}>
                    <div className={styles.modalCard}>
                        <h3 className={styles.modalTitle}>
                            <UserCog size={18} />
                            {t('training.createOverride')}
                        </h3>

                        {overrideSuccess ? (
                            <p className={styles.overrideSuccess}>{t('training.overrideSuccess')}</p>
                        ) : (
                            <>
                                <p className={styles.overrideWarning}>{t('training.overrideWarning')}</p>

                                {overrideAthletesLoading ? (
                                    <p className={styles.overrideLoading}>...</p>
                                ) : (
                                    <select
                                        className={styles.overrideSelect}
                                        value={overrideAthleteId}
                                        onChange={(e) => setOverrideAthleteId(e.target.value)}
                                        aria-label={t('training.selectAthleteForOverride')}
                                    >
                                        <option value="">{t('training.selectAthleteForOverride')}</option>
                                        {overrideAthletes.map((a) => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                )}

                                {overrideError && (
                                    <p className={styles.overrideError}>{overrideError}</p>
                                )}

                                <div className={styles.modalActions}>
                                    <button
                                        className={styles.overrideCancelBtn}
                                        onClick={() => setShowOverrideModal(false)}
                                    >
                                        {t('shared.cancel')}
                                    </button>
                                    <button
                                        className={styles.overrideConfirmBtn}
                                        onClick={handleCreateOverride}
                                        disabled={!overrideAthleteId || isCreatingOverride}
                                    >
                                        {isCreatingOverride ? '...' : t('shared.confirm')}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
