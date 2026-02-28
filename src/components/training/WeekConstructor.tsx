'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { UserCog, Wind } from 'lucide-react';
import {
    reorderExercises,
    groupByDayAndSession,
    calculateWeeklyCNS,
    updatePlan,
} from '@/lib/pocketbase/services/plans';

import { getWeekDayDate } from '@/lib/utils/dateHelpers';
import type { PhaseType } from '@/lib/pocketbase/types';
import { TemplatePanel } from '@/components/templates/TemplatePanel';
import { useOverrideModal } from './hooks/useOverrideModal';
import { useWeekNavigation } from './hooks/useWeekNavigation';
import { useTemplatePicker } from './hooks/useTemplatePicker';
import { useDayConstructor } from './hooks/useDayConstructor';
import { usePlanActions } from './hooks/usePlanActions';
import { usePlanData } from './hooks/usePlanData';
import { WeekStrip } from './WeekStrip';
import { WeekSummary } from './WeekSummary';
import { WeekToolbar } from './WeekToolbar';
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
const ExerciseAdjustmentPanelLazy = dynamic(
    () => import('./ExerciseAdjustmentPanel').then(mod => mod.ExerciseAdjustmentPanel),
    { loading: () => null }
);

interface Props {
    phaseId: string;
    phaseType: PhaseType;
    phaseName: string;
    maxWeeks: number; // total weeks in this phase
    startDate?: string;
    initialWeek?: number; // open on a specific week (e.g. from Weekly Status Map dot click)
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
    initialWeek,
    onBack,
    onSwitchToMultiView,
    readinessScore,
}: Props) {
    const t = useTranslations();

    // ─── Хуки-экстракты (Track 4.266 Phase 3) ────────────────
    const { weekNumber, handlePrevWeek, handleNextWeek } = useWeekNavigation({ maxWeeks, initialWeek });

    // ─── Plan data loading — extracted to usePlanData hook ─
    const {
        plan, setPlan,
        exercises,
        loading, error,
        athleteId,
        loggedDays,
        dayNotes, setDayNotes,
        groupReadiness,
        loadPlan,
        ensurePlanExists,
    } = usePlanData({ phaseId, weekNumber, startDate });

    // Локальный UI state
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [logActiveDay, setLogActiveDay] = useState<number | null>(null);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showQuickWorkout, setShowQuickWorkout] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'autofill' | 'duplicate' | 'publish' | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Adjustment panel state [Task 3.3.integration]
    const [adjustTarget, setAdjustTarget] = useState<{
        planExerciseId: string;
        name: string;
        baseSets?: number;
        baseReps?: string;
        baseIntensity?: string;
    } | null>(null);

    // Click outside menu close
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

    // Override modal — extracted to useOverrideModal hook
    const {
        showOverrideModal, setShowOverrideModal,
        overrideAthletes, overrideAthleteId, setOverrideAthleteId,
        isCreatingOverride, overrideError, overrideSuccess, overrideAthletesLoading,
        handleOpenOverrideModal, handleCreateOverride,
    } = useOverrideModal({ plan, t });

    // Template picker — extracted to useTemplatePicker hook (after loadPlan)

    const {
        templatePanelTarget, setTemplatePanelTarget,
        showWarmupPanel, setShowWarmupPanel,
        handleApplyTemplate, handleApplyWarmupToWeek,
    } = useTemplatePicker({ plan, exercises, loadPlan });

    // Day constructor — extracted to useDayConstructor hook (after loadPlan)
    const {
        activeDay, setActiveDay,
        pickerDay, setPickerDay,
        pickerSession, setPickerSession,
        pickerMode, setPickerMode,
        handleAddWarmupFromCatalog, handleEjectWarmup,
    } = useDayConstructor({ plan, loadPlan });

    // Group exercises by day and session
    const dayExercisesBySession = groupByDayAndSession(exercises);
    const cns = calculateWeeklyCNS(exercises);

    const isPublished = plan?.status === 'published';
    const isReadOnly = isPublished;

    // Plan actions (exercise CRUD, autofill, snapshot, publish) — extracted to usePlanActions hook
    const {
        handleAddExercise,
        handleUpdateExercise,
        handleRemoveExercise,
        handleReorder,
        handleAddWarmupItem,
        handleSaveAsTemplate,
        handleSaveSnapshot,
        handleAutoFill,
        handlePublish,
        handleDuplicateWeek,
        handleApplyWarmupToDay,
    } = usePlanActions({
        plan,
        exercises,
        phaseType,
        phaseId,
        weekNumber,
        isPublished,
        pickerDay,
        pickerSession,
        pickerMode,
        dayExercisesBySession,
        setIsAutoFilling,
        setIsPublishing,
        setConfirmAction,
        setPickerDay,
        setPickerSession,
        setPickerMode,
        setPlan,
        loadPlan,
        ensurePlanExists,
    });

    // handleAddExercise, handleUpdateExercise, handleRemoveExercise,
    // handleReorder, handleAddWarmupItem, handleSaveAsTemplate,
    // handleSaveSnapshot, handleAutoFill — в usePlanActions

    async function handleDayNoteChange(day: number, note: string) {
        if (!plan) return;
        const updated = { ...dayNotes, [String(day)]: note };
        setDayNotes(updated);
        try {
            await updatePlan(plan.id, { day_notes: updated as Record<string, string> });
        } catch (err) {
            console.warn('[WeekConstructor] Failed to save day note:', err);
        }
    }

    // Open ExerciseAdjustmentPanel for specific planExercise [Task 3.3.integration]
    function handleAdjustExercise(planExerciseId: string) {
        const planEx = exercises.find(e => e.id === planExerciseId);
        const exName = planEx?.expand?.exercise_id?.name_ru
            ?? planEx?.expand?.exercise_id?.name_en
            ?? planEx?.custom_text_ru
            ?? planEx?.custom_text_en
            ?? '';
        setAdjustTarget({
            planExerciseId,
            name: exName,
            baseSets: planEx?.sets ?? undefined,
            baseReps: planEx?.reps ?? undefined,
            baseIntensity: planEx?.intensity ?? undefined,
        });
    }

    // ─── Per-day warmup picker state [Task 3.2] ─────────────────
    const [warmupDayOpen, setWarmupDayOpen] = useState<number | null>(null);
    const [warmupTemplates, setWarmupTemplates] = useState<{ id: string; name_ru?: string; name_en?: string; name_cn?: string }[]>([]);
    const [warmupTemplatesLoaded, setWarmupTemplatesLoaded] = useState(false);
    const [warmupDayTemplateId, setWarmupDayTemplateId] = useState('');
    const [warmupDayApplying, setWarmupDayApplying] = useState(false);

    const handleOpenWarmupDayPicker = useCallback(async (day: number) => {
        if (!warmupTemplatesLoaded) {
            try {
                const { listTemplates } = await import('@/lib/pocketbase/services/templates');
                const tpls = await listTemplates('warmup');
                setWarmupTemplates(tpls);
                if (tpls.length > 0) setWarmupDayTemplateId(tpls[0].id);
                setWarmupTemplatesLoaded(true);
            } catch (err) {
                console.error('[WeekConstructor] Failed to load warmup templates:', err);
            }
        }
        setWarmupDayOpen(prev => prev === day ? null : day);
    }, [warmupTemplatesLoaded]);

    const handleApplyWarmupDay = useCallback(async (day: number) => {
        if (!warmupDayTemplateId) return;
        setWarmupDayApplying(true);
        try {
            await handleApplyWarmupToDay(day, warmupDayTemplateId);
            setWarmupDayOpen(null);
        } finally {
            setWarmupDayApplying(false);
        }
    }, [warmupDayTemplateId, handleApplyWarmupToDay]);


    // handlePrevWeek / handleNextWeek — в useWeekNavigation
    // handlePublish / handleDuplicateWeek — в usePlanActions

    // ─── Helpers ────────────────────────────────────────────

    /**
     * Monday of the current weekNumber, computed from startDate.
     * Uses T12:00:00Z trick to avoid DST shift (same as dateHelpers).
     */
    const computedWeekStart = useMemo<Date | null>(() => {
        if (!startDate) return null;
        const base = new Date(`${startDate}T12:00:00Z`);
        base.setUTCDate(base.getUTCDate() + (weekNumber - 1) * 7);
        // Find Monday
        const dow = base.getUTCDay();
        const diff = dow === 0 ? -6 : 1 - dow;
        base.setUTCDate(base.getUTCDate() + diff);
        return base;
    }, [startDate, weekNumber]);

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
            <WeekToolbar
                onBack={onBack}
                phaseName={phaseName}
                phaseType={phaseType}
                weekNumber={weekNumber}
                maxWeeks={maxWeeks}
                handlePrevWeek={handlePrevWeek}
                handleNextWeek={handleNextWeek}
                onSwitchToMultiView={onSwitchToMultiView}
                isAutoFilling={isAutoFilling}
                isPublishing={isPublishing}
                isPublished={isPublished}
                isReadOnly={isReadOnly}
                showMoreMenu={showMoreMenu}
                menuRef={menuRef}
                confirmAction={confirmAction}
                setConfirmAction={setConfirmAction}
                handleDuplicateWeek={handleDuplicateWeek}
                handleAutoFill={handleAutoFill}
                handlePublish={handlePublish}
                setShowWarmupPanel={setShowWarmupPanel}
                setShowMoreMenu={setShowMoreMenu}
                setShowQuickWorkout={setShowQuickWorkout}
                setShowHistory={setShowHistory}
                handleSaveSnapshot={handleSaveSnapshot}
                handleOpenOverrideModal={handleOpenOverrideModal}
                cns={cns}
                cnsColor={cnsColor}
                cnsLabelKey={cnsLabelKey}
            />

            {/* Status badge */}
            {plan && (
                <WeekSummary
                    planStatus={plan.status}
                    exerciseCount={exercises.length}
                    readinessScore={readinessScore}
                />
            )}

            {/* Empty week state — shown when no plan exists yet [Track 4.267 Phase 2] */}
            {!plan && !loading && (
                <div className={styles.emptyWeek}>
                    <p className={styles.emptyWeekText}>{t('training.emptyWeek')}</p>
                </div>
            )}

            {activeDay !== null ? (
                <>
                    {/* Per-day warmup template picker [Task 3.2] */}
                    {!isReadOnly && (
                        <div className={styles.dayWarmupPickerRow}>
                            <button
                                className={styles.dayWarmupBtn}
                                onClick={() => handleOpenWarmupDayPicker(activeDay)}
                                aria-expanded={warmupDayOpen === activeDay}
                                aria-label={t('training.applyWarmupToDay')}
                                title={t('training.applyWarmupToDay')}
                            >
                                <Wind size={14} />
                                {t('training.applyWarmupToDay')}
                            </button>
                            {warmupDayOpen === activeDay && (
                                <div className={styles.dayWarmupPicker}>
                                    {warmupTemplates.length === 0 ? (
                                        <span className={styles.dayWarmupEmpty}>
                                            {t('training.selectWarmupTemplate')}
                                        </span>
                                    ) : (
                                        <>
                                            <select
                                                className={styles.dayWarmupSelect}
                                                value={warmupDayTemplateId}
                                                onChange={e => setWarmupDayTemplateId(e.target.value)}
                                            >
                                                {warmupTemplates.map(tpl => (
                                                    <option key={tpl.id} value={tpl.id}>
                                                        {tpl.name_ru ?? tpl.id}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                className={styles.dayWarmupApplyBtn}
                                                onClick={() => handleApplyWarmupDay(activeDay)}
                                                disabled={warmupDayApplying || !warmupDayTemplateId}
                                            >
                                                {warmupDayApplying ? '...' : t('training.editSeasonSave')}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    <DayConstructorLazy
                        dayOfWeek={activeDay}
                        date={computedWeekStart ? getWeekDayDate(computedWeekStart, activeDay) : null}
                        exercisesBySession={dayExercisesBySession[activeDay] ?? { 0: [] }}
                        onAdd={(session) => { setPickerSession(session); setPickerDay(activeDay); setPickerMode('normal'); }}
                        onUpdate={handleUpdateExercise}
                        onRemove={handleRemoveExercise}
                        onReorder={handleReorder}
                        onEjectWarmup={!isReadOnly ? handleEjectWarmup : undefined}
                        onAddWarmupItem={!isReadOnly ? handleAddWarmupItem : undefined}
                        onAddFromCatalog={!isReadOnly ? (session: number) => handleAddWarmupFromCatalog(activeDay, session) : undefined}
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
                        onAdjustExercise={athleteId && !isReadOnly ? handleAdjustExercise : undefined}
                    />
                </>
            ) : (
                <WeekStrip
                    dayExercisesBySession={dayExercisesBySession}
                    loggedDays={loggedDays}
                    groupReadiness={groupReadiness}
                    onOpenDay={setActiveDay}
                    getDayDate={(d) => computedWeekStart ? getWeekDayDate(computedWeekStart, d) : null}
                />
            )}

            {/* Training Log Modal */}
            {logActiveDay !== null && plan && athleteId && (
                <TrainingLogLazy
                    planId={plan.id}
                    dayOfWeek={logActiveDay}
                    dayDate={computedWeekStart ? getWeekDayDate(computedWeekStart, logActiveDay) : null}
                    athleteId={athleteId}
                    readinessScore={readinessScore}
                    onClose={() => setLogActiveDay(null)}
                    onSaved={() => {
                        setLogActiveDay(null);
                        loadPlan(); // refresh to update hasLog badges
                    }}
                />
            )}

            {/* Exercise Adjustment Panel [Task 3.3.integration] */}
            {adjustTarget !== null && athleteId && plan && (
                <ExerciseAdjustmentPanelLazy
                    planExerciseId={adjustTarget.planExerciseId}
                    athleteId={athleteId}
                    planId={plan.id}
                    exerciseName={adjustTarget.name}
                    baseSets={adjustTarget.baseSets}
                    baseReps={adjustTarget.baseReps}
                    baseIntensity={adjustTarget.baseIntensity}
                    onClose={() => setAdjustTarget(null)}
                    onSaved={() => setAdjustTarget(null)}
                />
            )}

            {/* Exercise Picker (normal + warmup mode) */}
            {pickerDay !== null && (
                <ExercisePickerLazy
                    phaseType={phaseType}
                    onSelect={handleAddExercise}
                    onClose={() => { setPickerDay(null); setPickerMode('normal'); }}
                />
            )}

            {/* Warmup Panel (A3: Apply warmup to week) */}
            <TemplatePanel
                isOpen={showWarmupPanel}
                onClose={() => setShowWarmupPanel(false)}
                onApplyTemplate={handleApplyWarmupToWeek}
            />

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
