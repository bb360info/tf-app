'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ChevronLeft, ChevronRight, Zap, Wand2, Send, RotateCcw, CalendarDays, Printer, History, Save, UserCog, MoreVertical } from 'lucide-react';
import {
    getOrCreatePlan,
    listPlanExercises,
    addExerciseToPlan,
    updatePlanExercise,
    removePlanExercise,
    reorderExercises,
    groupByDayAndSession,
    calculateWeeklyCNS,
    publishPlan,
    revertToDraft,
    updatePlan,
} from '@/lib/pocketbase/services/plans';
import type { UpdateExerciseData, AdHocWarmupData } from './types';
import { autoFillWeek } from '@/lib/autofill/processor';
import { getSelfAthleteId } from '@/lib/pocketbase/services/readiness';
import { getLogsForPlan } from '@/lib/pocketbase/services/logs';
import { stampTemplate, ejectTemplate, addWarmupItem } from '@/lib/pocketbase/services/templates';
import { TemplatePanel } from '@/components/templates/TemplatePanel';
import type { PlanExerciseWithExpand, PlanWithExercises } from '@/lib/pocketbase/services/plans';
import type { ExerciseRecord } from '@/lib/pocketbase/services/exercises';
import type { PhaseType } from '@/lib/pocketbase/types';
import { useOverrideModal } from './hooks/useOverrideModal';
import { WeekStrip } from './WeekStrip';
import { WeekSummary } from './WeekSummary';
import { QuickWorkout } from './QuickWorkout';
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
const DayConstructorLazy = dynamic(() => import('./DayConstructor').then(mod => mod.DayConstructor), {
    loading: () => <div className={styles.loading}>Loading day...</div>,
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
    const [activeDay, setActiveDay] = useState<number | null>(null);
    /** Set of day indices (0-6) that already have a log this week */
    const [loggedDays, setLoggedDays] = useState<Set<number>>(new Set());
    /** Per-day coach notes: key = day index (0-6) as string, value = note text */
    const [dayNotes, setDayNotes] = useState<Record<string, string>>({});
    /** Group readiness data: Map<athleteId, score> */
    const [groupReadiness, setGroupReadiness] = useState<Map<string, number>>(new Map());

    // Override modal — extracted to useOverrideModal hook
    const {
        showOverrideModal, setShowOverrideModal,
        overrideAthletes, overrideAthleteId, setOverrideAthleteId,
        isCreatingOverride, overrideError, overrideSuccess, overrideAthletesLoading,
        handleOpenOverrideModal, handleCreateOverride,
    } = useOverrideModal({ plan, t });
    const [templatePanelTarget, setTemplatePanelTarget] = useState<{ day: number; session: number } | null>(null);


    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showQuickWorkout, setShowQuickWorkout] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // click outside
    useEffect(() => {
        if (!showMoreMenu) return;
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMoreMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showMoreMenu]);

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

    // Override handlers are now in useOverrideModal hook

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
    const handleSaveAsTemplate = useCallback(
        async (day: number, session: number, name: string) => {
            if (!plan || !name.trim()) return;
            try {
                const pb = (await import('@/lib/pocketbase/client')).default;
                const coachId = pb.authStore.record?.id as string | undefined;
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

    // ─── Warmup Handlers ─────────────────────────────────────

    const handleApplyTemplate = async (templateId: string) => {
        if (!plan || !templatePanelTarget) return;
        try {
            await stampTemplate(templateId, plan.id, templatePanelTarget.day, templatePanelTarget.session);
            await loadPlan(); // Re-fetch to show new items
        } catch (err) {
            console.error('Failed to stamp template', err);
            throw err; // For ErrorBoundary or UI handle
        }
    };

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
                        title={isPublished ? t('training.revertAction') : t('training.publishAction')}
                        style={{
                            background: isPublished
                                ? 'var(--color-warning)'
                                : 'var(--color-success)',
                        }}
                    >
                        {isPublished ? <RotateCcw size={16} /> : <Send size={16} />}
                    </button>

                    <div className={styles.moreMenuContainer} ref={menuRef}>
                        <button
                            className={styles.exportBtn}
                            onClick={() => setShowMoreMenu(!showMoreMenu)}
                            title={t('training.moreActions')}
                        >
                            <MoreVertical size={16} />
                        </button>

                        {showMoreMenu && (
                            <div className={styles.moreMenuDropdown}>
                                <button
                                    className={styles.dropdownItem}
                                    onClick={() => { setShowQuickWorkout(true); setShowMoreMenu(false); }}
                                >
                                    <Zap size={16} />
                                    {t('training.quickWorkout') || 'Quick Workout'}
                                </button>
                                <button
                                    className={styles.dropdownItem}
                                    onClick={() => { window.print(); setShowMoreMenu(false); }}
                                >
                                    <Printer size={16} />
                                    {t('training.print')}
                                </button>
                                <button
                                    className={styles.dropdownItem}
                                    onClick={() => { setShowHistory(true); setShowMoreMenu(false); }}
                                >
                                    <History size={16} />
                                    {t('training.history')}
                                </button>
                                <button
                                    className={styles.dropdownItem}
                                    onClick={() => { handleSaveSnapshot(); setShowMoreMenu(false); }}
                                >
                                    <Save size={16} />
                                    {t('training.saveVersion')}
                                </button>
                                {isPublished && (
                                    <button
                                        className={styles.dropdownItem}
                                        onClick={() => { handleOpenOverrideModal(); setShowMoreMenu(false); }}
                                    >
                                        <UserCog size={16} />
                                        {t('training.createOverride')}
                                    </button>
                                )}
                            </div>
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
                <WeekSummary
                    planStatus={plan.status}
                    exerciseCount={exercises.length}
                    readinessScore={readinessScore}
                />
            )}

            {activeDay !== null ? (
                <DayConstructorLazy
                    dayOfWeek={activeDay}
                    date={getDayDate(activeDay)}
                    exercisesBySession={dayExercisesBySession[activeDay] ?? { 0: [] }}
                    onAdd={(session) => { setPickerSession(session); setPickerDay(activeDay); }}
                    onUpdate={handleUpdateExercise}
                    onRemove={handleRemoveExercise}
                    onReorder={handleReorder}
                    onEjectWarmup={!isReadOnly ? handleEjectWarmup : undefined}
                    onAddWarmupItem={!isReadOnly ? handleAddWarmupItem : undefined}
                    onOpenTemplates={!isReadOnly ? (session) => setTemplatePanelTarget({ day: activeDay, session }) : undefined}
                    onSaveAsTemplate={!isReadOnly ? (session, name) => handleSaveAsTemplate(activeDay, session, name) : undefined}
                    hasLog={loggedDays.has(activeDay)}
                    readOnly={isReadOnly}
                    dayNote={dayNotes[String(activeDay)] ?? ''}
                    onDayNoteChange={!isReadOnly ? (note) => handleDayNoteChange(activeDay, note) : undefined}
                    onReorderDrag={!isReadOnly ? async (updates) => {
                        await reorderExercises(updates);
                        await loadPlan();
                    } : undefined}
                    groupReadiness={groupReadiness}
                    onClose={() => setActiveDay(null)}
                />
            ) : (
                <WeekStrip
                    dayExercisesBySession={dayExercisesBySession}
                    loggedDays={loggedDays}
                    groupReadiness={groupReadiness}
                    onOpenDay={setActiveDay}
                    getDayDate={getDayDate}
                />
            )}

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

            {/* Template Panel */}
            <TemplatePanel
                isOpen={!!templatePanelTarget}
                onClose={() => setTemplatePanelTarget(null)}
                onApplyTemplate={handleApplyTemplate}
            />

            {/* Quick Workout Modal */}
            {showQuickWorkout && (
                <QuickWorkout onClose={() => setShowQuickWorkout(false)} />
            )}
        </div>
    );
}
