'use client';

import { useState, useCallback, useEffect, useId } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
    X,
    Plus,
    Trash2,
    ChevronUp,
    ChevronDown,
    Zap,
    CalendarDays,
    ClipboardList,
    CheckCircle2,
    BookOpen,
    User,
    Users,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import type { ExerciseRecord } from '@/lib/pocketbase/services/exercises';
import type { CustomExercisesRecord } from '@/lib/pocketbase/types';
import { toLocalISODate } from '@/lib/utils/dateHelpers';
import { useToast } from '@/lib/hooks/useToast';
import styles from './QuickWorkout.module.css';

// ─── Types ─────────────────────────────────────────────────────────

export interface QuickExerciseItem {
    uid: string;
    exerciseId: string;
    name: string;        // локализованное имя
    sets: number;
    reps: string;        // '8' | '3×60s' | свободный текст
    cns_cost: number;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayISO() {
    return toLocalISODate();
}

// ─── Lazy ExercisePicker ───────────────────────────────────────────

const ExercisePickerLazy = dynamic(() => import('./ExercisePicker'), {
    loading: () => null,
});

// ─── Props ─────────────────────────────────────────────────────────

interface Props {
    onClose: () => void;
}

type AssignTarget = 'athlete' | 'group';
type ConflictAction = 'replace' | 'add';

interface AssignContext {
    target: AssignTarget;
    targetId: string;
}

// ─── Component ─────────────────────────────────────────────────────

export function QuickWorkout({ onClose }: Props) {
    const t = useTranslations('quickPlan');
    const locale = useLocale();
    const { showToast } = useToast();
    const uid = useId();

    const [date, setDate] = useState(todayISO());
    const [notes, setNotes] = useState('');
    const [durationMin, setDurationMin] = useState<string>('');
    const [exercises, setExercises] = useState<QuickExerciseItem[]>([]);
    const [showPicker, setShowPicker] = useState(false);
    // Save to Library (PB)
    const [savingToLibrary, setSavingToLibrary] = useState(false);
    const [savedToLibrary, setSavedToLibrary] = useState(false);
    const [libraryError, setLibraryError] = useState('');
    const [assignTarget, setAssignTarget] = useState<AssignTarget>('athlete');
    const [assigning, setAssigning] = useState(false);
    const [athleteOptions, setAthleteOptions] = useState<Array<{ id: string; name: string }>>([]);
    const [groupOptions, setGroupOptions] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedAthleteId, setSelectedAthleteId] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [conflictContext, setConflictContext] = useState<AssignContext | null>(null);

    // CNS total
    const cnsTotal = exercises.reduce((acc, ex) => acc + ex.cns_cost, 0);
    const cnsStatus = cnsTotal > 20 ? 'red' : cnsTotal > 10 ? 'yellow' : 'green';

    // ── Handlers ────────────────────────────────────────────────────

    const handleSelectExercise = useCallback(
        (exercise: ExerciseRecord | CustomExercisesRecord, source: 'library' | 'custom') => {
            const name =
                source === 'library'
                    ? ((exercise as ExerciseRecord)[`name_${locale}` as keyof ExerciseRecord] as string) ||
                    (exercise as ExerciseRecord).name_en ||
                    ''
                    : ((exercise as CustomExercisesRecord).name_en ?? '');

            const item: QuickExerciseItem = {
                uid: generateId(),
                exerciseId: exercise.id,
                name,
                sets: 3,
                reps: '8',
                cns_cost:
                    source === 'library'
                        ? (exercise as ExerciseRecord).cns_cost ?? 2
                        : 2,
            };
            setExercises((prev) => [...prev, item]);
            setShowPicker(false);
        },
        [locale]
    );

    const handleRemove = useCallback((uid: string) => {
        setExercises((prev) => prev.filter((ex) => ex.uid !== uid));
    }, []);

    const handleMoveUp = useCallback((uid: string) => {
        setExercises((prev) => {
            const idx = prev.findIndex((ex) => ex.uid === uid);
            if (idx <= 0) return prev;
            const next = [...prev];
            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
            return next;
        });
    }, []);

    const handleMoveDown = useCallback((uid: string) => {
        setExercises((prev) => {
            const idx = prev.findIndex((ex) => ex.uid === uid);
            if (idx < 0 || idx >= prev.length - 1) return prev;
            const next = [...prev];
            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
            return next;
        });
    }, []);

    const handleUpdateSets = useCallback((uid: string, val: string) => {
        setExercises((prev) =>
            prev.map((ex) =>
                ex.uid === uid ? { ...ex, sets: Math.max(1, parseInt(val) || 1) } : ex
            )
        );
    }, []);

    const handleUpdateReps = useCallback((uid: string, val: string) => {
        setExercises((prev) =>
            prev.map((ex) => (ex.uid === uid ? { ...ex, reps: val } : ex))
        );
    }, []);

    const handleClear = useCallback(() => {
        if (!window.confirm(t('confirmClear'))) return;
        setExercises([]);
        setNotes('');
        setDurationMin('');
    }, [t]);

    // ─── Save to Library (PocketBase) ───────────────────────────────
    const handleSaveToLibrary = useCallback(async () => {
        if (exercises.length === 0 || savingToLibrary) return;
        setSavingToLibrary(true);
        setLibraryError('');
        try {
            const { default: pb } = await import('@/lib/pocketbase/client');
            const coachId = pb.authStore.record?.id as string | undefined;
            if (!coachId) throw new Error('Not authenticated');
            const { createTemplate, addTemplateItem } = await import('@/lib/pocketbase/services/templates');
            const template = await createTemplate({
                coach_id: coachId,
                type: 'training_day',
                name_ru: `Quick-${new Date().toLocaleDateString('ru-RU')}`,
                name_en: `Quick-${new Date().toLocaleDateString('en-US')}`,
                name_cn: `Quick-${new Date().toLocaleDateString('zh-CN')}`,
            });
            // Chunked batch (5 at a time) — SQLite safety
            const items = exercises.map((ex, idx) => ({
                template_id: template.id,
                block: 'main' as const,
                exercise_id: ex.exerciseId,
                order: idx,
                sets: ex.sets,
                reps: ex.reps,
            }));
            for (let i = 0; i < items.length; i += 5) {
                await Promise.all(items.slice(i, i + 5).map(item => addTemplateItem(item)));
            }
            setSavedToLibrary(true);
            setTimeout(() => setSavedToLibrary(false), 2500);
        } catch (err) {
            setLibraryError(err instanceof Error ? err.message : t('saveError'));
        } finally {
            setSavingToLibrary(false);
        }
    }, [exercises, savingToLibrary, t]);

    const ensurePlanAndAssign = useCallback(
        async (
            target: AssignTarget,
            targetId: string,
            conflictAction: ConflictAction
        ) => {
            const selectedDate = new Date(`${date}T12:00:00`);
            if (Number.isNaN(selectedDate.getTime())) {
                throw new Error(t('invalidDate'));
            }

            const day = selectedDate.getDay();
            const dayOfWeek = day === 0 ? 6 : day - 1;

            const mondayOf = (d: Date) => {
                const copy = new Date(d);
                const copyDay = copy.getDay();
                const delta = copyDay === 0 ? -6 : 1 - copyDay;
                copy.setDate(copy.getDate() + delta);
                copy.setHours(0, 0, 0, 0);
                return copy;
            };

            const { listSeasons } = await import('@/lib/pocketbase/services/seasons');
            const { getOrCreatePlan, listPlanExercises, addExerciseToPlan, removePlanExercise, publishPlan } = await import('@/lib/pocketbase/services/plans');
            const { assignPlanToAthlete, assignPlanToGroup } = await import('@/lib/pocketbase/services/planAssignments');

            const seasons = target === 'athlete' ? await listSeasons(targetId) : await listSeasons();
            const targetSeasons = target === 'group'
                ? seasons.filter((season) => season.group_id === targetId)
                : seasons;

            const season = targetSeasons.find((candidate) => {
                const start = new Date(candidate.start_date);
                const end = new Date(candidate.end_date);
                return start <= selectedDate && selectedDate <= end;
            });
            if (!season) {
                throw new Error(t('noSeasonForDate'));
            }

            const phases = (season.expand?.['training_phases(season_id)'] ?? [])
                .filter((phase) => phase.start_date && phase.end_date)
                .sort((a, b) => a.order - b.order);

            const phase = phases.find((candidate) => {
                const start = new Date(candidate.start_date as string);
                const end = new Date(candidate.end_date as string);
                return start <= selectedDate && selectedDate <= end;
            });
            if (!phase || !phase.start_date) {
                throw new Error(t('noPhaseForDate'));
            }

            const phaseMonday = mondayOf(new Date(phase.start_date));
            const selectedMonday = mondayOf(selectedDate);
            const weekNumber = Math.floor((selectedMonday.getTime() - phaseMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

            if (weekNumber < 1) {
                throw new Error(t('dateBeforePhase'));
            }

            const plan = await getOrCreatePlan(phase.id, weekNumber);
            const existing = (await listPlanExercises(plan.id))
                .filter((exercise) => (exercise.day_of_week ?? 0) === dayOfWeek && (exercise.session ?? 0) === 0);

            if (existing.length > 0 && !conflictContext) {
                setConflictContext({ target, targetId });
                return;
            }

            if (existing.length > 0 && conflictAction === 'replace') {
                await Promise.all(existing.map((exercise) => removePlanExercise(exercise.id)));
            }

            const refreshed = await listPlanExercises(plan.id);
            const dayItems = refreshed.filter((exercise) => (exercise.day_of_week ?? 0) === dayOfWeek && (exercise.session ?? 0) === 0);
            const nextOrderBase = dayItems.reduce((maxOrder, exercise) => Math.max(maxOrder, exercise.order), -1) + 1;

            for (let i = 0; i < exercises.length; i++) {
                await addExerciseToPlan({
                    plan_id: plan.id,
                    exercise_id: exercises[i].exerciseId,
                    day_of_week: dayOfWeek,
                    session: 0,
                    order: nextOrderBase + i,
                    sets: exercises[i].sets,
                    reps: exercises[i].reps,
                    notes: notes || undefined,
                });
            }

            const publishedPlan = plan.status === 'published' ? plan : await publishPlan(plan.id);

            if (target === 'athlete') {
                await assignPlanToAthlete(publishedPlan.id, targetId);
            } else {
                await assignPlanToGroup(publishedPlan.id, targetId);
            }
        },
        [date, exercises, notes, t, conflictContext]
    );

    const handleAssign = useCallback(async (target: AssignTarget, conflictAction: ConflictAction = 'add') => {
        const targetId = target === 'athlete' ? selectedAthleteId : selectedGroupId;
        if (!targetId || exercises.length === 0 || assigning) return;

        setAssigning(true);
        setLibraryError('');
        try {
            await ensurePlanAndAssign(target, targetId, conflictAction);

            if (conflictContext) {
                setConflictContext(null);
            } else {
                showToast({ message: t('assignedSuccess'), type: 'success' });
                onClose();
            }
        } catch (err) {
            setLibraryError(err instanceof Error ? err.message : t('saveError'));
            setConflictContext(null);
        } finally {
            setAssigning(false);
        }
    }, [
        selectedAthleteId,
        selectedGroupId,
        exercises.length,
        assigning,
        ensurePlanAndAssign,
        conflictContext,
        showToast,
        t,
        onClose,
    ]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [{ listMyAthletes }, { listMyGroups }] = await Promise.all([
                    import('@/lib/pocketbase/services/athletes'),
                    import('@/lib/pocketbase/services/groups'),
                ]);
                const [athletes, groups] = await Promise.all([listMyAthletes(), listMyGroups()]);
                if (cancelled) return;
                setAthleteOptions(athletes.map((athlete) => ({ id: athlete.id, name: athlete.name })));
                setGroupOptions(groups.map((group) => ({ id: group.id, name: group.name })));
                if (athletes.length > 0) setSelectedAthleteId((current) => current || athletes[0].id);
                if (groups.length > 0) setSelectedGroupId((current) => current || groups[0].id);
            } catch {
                if (!cancelled) setLibraryError(t('loadTargetsError'));
            }
        })();
        return () => { cancelled = true; };
    }, [t]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <>
            {/* Overlay */}
            <div
                className={styles.overlay}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sheet */}
            <div
                className={styles.sheet}
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${uid}-title`}
            >
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h2 id={`${uid}-title`} className={styles.title}>
                            {t('title')}
                        </h2>
                        <p className={styles.subtitle}>{t('subtitle')}</p>
                    </div>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className={styles.body}>
                    {/* Date + Duration row */}
                    <div className={styles.metaRow}>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor={`${uid}-date`}>
                                <CalendarDays size={14} />
                                {t('date')}
                            </label>
                            <input
                                id={`${uid}-date`}
                                type="date"
                                className={styles.input}
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor={`${uid}-duration`}>
                                <Zap size={14} />
                                {t('duration')}
                            </label>
                            <input
                                id={`${uid}-duration`}
                                type="number"
                                className={styles.input}
                                placeholder="60"
                                min={1}
                                max={480}
                                value={durationMin}
                                onChange={(e) => setDurationMin(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* CNS indicator */}
                    {exercises.length > 0 && (
                        <div
                            className={styles.cnsRow}
                            data-status={cnsStatus}
                        >
                            <Zap size={14} />
                            <span>{t('cnsTotal')}: <strong>{cnsTotal}</strong></span>
                        </div>
                    )}

                    {/* Exercise list */}
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTitle}>
                            <ClipboardList size={16} />
                            {t('exercises')}
                        </span>
                        <button
                            className={styles.addBtn}
                            onClick={() => setShowPicker(true)}
                            aria-label={t('addExercise')}
                        >
                            <Plus size={18} />
                            {t('addExercise')}
                        </button>
                    </div>

                    {exercises.length === 0 ? (
                        <div className={styles.empty}>{t('noExercises')}</div>
                    ) : (
                        <ul className={styles.exerciseList}>
                            {exercises.map((ex, idx) => (
                                <li key={ex.uid} className={styles.exerciseRow}>
                                    {/* Reorder */}
                                    <div className={styles.reorder}>
                                        <button
                                            className={styles.reorderBtn}
                                            onClick={() => handleMoveUp(ex.uid)}
                                            disabled={idx === 0}
                                            aria-label={`Move ${ex.name} up`}
                                        >
                                            <ChevronUp size={14} />
                                        </button>
                                        <button
                                            className={styles.reorderBtn}
                                            onClick={() => handleMoveDown(ex.uid)}
                                            disabled={idx === exercises.length - 1}
                                            aria-label={`Move ${ex.name} down`}
                                        >
                                            <ChevronDown size={14} />
                                        </button>
                                    </div>

                                    {/* Name */}
                                    <span className={styles.exName}>{ex.name}</span>

                                    {/* Sets × Reps */}
                                    <div className={styles.dosage}>
                                        <div className={styles.stepper}>
                                            <button
                                                type="button"
                                                className={styles.stepBtn}
                                                onClick={() => handleUpdateSets(ex.uid, String(Math.max(1, ex.sets - 1)))}
                                                aria-label={t('sets')}
                                            >−</button>
                                            <span className={styles.stepValue}>{ex.sets}</span>
                                            <button
                                                type="button"
                                                className={styles.stepBtn}
                                                onClick={() => handleUpdateSets(ex.uid, String(ex.sets + 1))}
                                                aria-label={t('sets')}
                                            >+</button>
                                        </div>
                                        <span className={styles.dosageSep}>×</span>
                                        <input
                                            type="text"
                                            className={styles.dosageInput}
                                            value={ex.reps}
                                            aria-label={t('reps')}
                                            onChange={(e) => handleUpdateReps(ex.uid, e.target.value)}
                                        />
                                    </div>

                                    {/* Remove */}
                                    <button
                                        className={styles.removeBtn}
                                        onClick={() => handleRemove(ex.uid)}
                                        aria-label={`${t('remove')} ${ex.name}`}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Notes */}
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor={`${uid}-notes`}>
                            {t('notes')}
                        </label>
                        <textarea
                            id={`${uid}-notes`}
                            className={styles.textarea}
                            placeholder={t('notesPlaceholder')}
                            value={notes}
                            rows={3}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <div className={styles.assignPanel}>
                        <div className={styles.assignTypeRow}>
                            <button
                                type="button"
                                className={`${styles.assignTypeBtn} ${assignTarget === 'athlete' ? styles.assignTypeBtnActive : ''}`}
                                onClick={() => setAssignTarget('athlete')}
                            >
                                <User size={14} />
                                {t('assignAthlete')}
                            </button>
                            <button
                                type="button"
                                className={`${styles.assignTypeBtn} ${assignTarget === 'group' ? styles.assignTypeBtnActive : ''}`}
                                onClick={() => setAssignTarget('group')}
                            >
                                <Users size={14} />
                                {t('assignGroup')}
                            </button>
                        </div>
                        <select
                            className={styles.assignSelect}
                            value={assignTarget === 'athlete' ? selectedAthleteId : selectedGroupId}
                            onChange={(event) => {
                                if (assignTarget === 'athlete') setSelectedAthleteId(event.target.value);
                                else setSelectedGroupId(event.target.value);
                            }}
                        >
                            {(assignTarget === 'athlete' ? athleteOptions : groupOptions).map((option) => (
                                <option key={option.id} value={option.id}>{option.name}</option>
                            ))}
                        </select>
                    </div>

                    {libraryError && (
                        <p className={styles.errorMsg}>{libraryError}</p>
                    )}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button
                        className={styles.clearBtn}
                        onClick={handleClear}
                        disabled={exercises.length === 0 && !notes}
                    >
                        <Trash2 size={16} />
                        {t('clear')}
                    </button>

                    {/* Save to Library */}
                    <button
                        className={styles.libraryBtn}
                        onClick={handleSaveToLibrary}
                        disabled={exercises.length === 0 || savingToLibrary}
                        title={t('saveToLibrary')}
                    >
                        {savedToLibrary ? (
                            <><CheckCircle2 size={16} />{t('savedToLibrary')}</>
                        ) : (
                            <><BookOpen size={16} />{t('saveToLibrary')}</>
                        )}
                    </button>
                    <button
                        className={styles.assignBtn}
                        onClick={() => handleAssign(assignTarget)}
                        disabled={exercises.length === 0 || assigning}
                        title={assignTarget === 'athlete' ? t('assignAthlete') : t('assignGroup')}
                    >
                        {assigning ? t('assigning') : (assignTarget === 'athlete' ? t('assignAthlete') : t('assignGroup'))}
                    </button>

                </div>
            </div>

            {/* Exercise Picker */}
            {showPicker && (
                <ExercisePickerLazy
                    onSelect={handleSelectExercise}
                    onClose={() => setShowPicker(false)}
                />
            )}

            {conflictContext && (
                <div className={styles.conflictOverlay}>
                    <div className={styles.conflictDialog}>
                        <h3 className={styles.conflictTitle}>{t('conflictTitle')}</h3>
                        <p className={styles.conflictText}>{t('conflictText')}</p>
                        <div className={styles.conflictActions}>
                            <button
                                type="button"
                                className={styles.conflictBtn}
                                onClick={() => {
                                    setConflictContext(null);
                                    setAssigning(false);
                                }}
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="button"
                                className={styles.conflictBtn}
                                onClick={() => void handleAssign(conflictContext.target, 'add')}
                            >
                                {t('addToExisting')}
                            </button>
                            <button
                                type="button"
                                className={`${styles.conflictBtn} ${styles.conflictDanger}`}
                                onClick={() => void handleAssign(conflictContext.target, 'replace')}
                            >
                                {t('replaceExisting')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
