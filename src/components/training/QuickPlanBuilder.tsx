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
    Save,
    CalendarDays,
    ClipboardList,
    CheckCircle2,
    BookOpen,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import type { ExerciseRecord } from '@/lib/pocketbase/services/exercises';
import type { CustomExercisesRecord } from '@/lib/pocketbase/types';
import styles from './QuickPlanBuilder.module.css';

// ─── Types ─────────────────────────────────────────────────────────

export interface QuickExerciseItem {
    uid: string;
    exerciseId: string;
    name: string;        // локализованное имя
    sets: number;
    reps: string;        // '8' | '3×60s' | свободный текст
    cns_cost: number;
}

export interface QuickWorkout {
    id: string;
    date: string;        // YYYY-MM-DD
    durationMin?: number;
    notes: string;
    exercises: QuickExerciseItem[];
    savedAt: string;     // ISO
}

// ─── Local Storage Helpers ─────────────────────────────────────────

const LS_KEY = 'jp_quick_workouts';

function loadHistory(): QuickWorkout[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? (JSON.parse(raw) as QuickWorkout[]) : [];
    } catch {
        /* expected: corrupt localStorage */
        return [];
    }
}

function saveToHistory(w: QuickWorkout): void {
    const history = loadHistory();
    const updated = [w, ...history.filter((h) => h.id !== w.id)].slice(0, 30);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

// ─── Lazy ExercisePicker ───────────────────────────────────────────

const ExercisePickerLazy = dynamic(() => import('./ExercisePicker'), {
    loading: () => null,
});

// ─── Props ─────────────────────────────────────────────────────────

interface Props {
    onClose: () => void;
}

// ─── Component ─────────────────────────────────────────────────────

export function QuickPlanBuilder({ onClose }: Props) {
    const t = useTranslations('quickPlan');
    const locale = useLocale();
    const uid = useId();

    const [date, setDate] = useState(todayISO());
    const [notes, setNotes] = useState('');
    const [durationMin, setDurationMin] = useState<string>('');
    const [exercises, setExercises] = useState<QuickExerciseItem[]>([]);
    const [showPicker, setShowPicker] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');
    // Save to Library (PB)
    const [savingToLibrary, setSavingToLibrary] = useState(false);
    const [savedToLibrary, setSavedToLibrary] = useState(false);
    const [libraryError, setLibraryError] = useState('');

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
        setSaved(false);
        setSaveError('');
    }, [t]);

    const handleSave = useCallback(() => {
        setSaveError('');
        try {
            const workout: QuickWorkout = {
                id: generateId(),
                date,
                durationMin: durationMin ? parseInt(durationMin) : undefined,
                notes,
                exercises,
                savedAt: new Date().toISOString(),
            };
            saveToHistory(workout);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch {
            /* non-critical: localStorage save */
            setSaveError(t('saveError'));
        }
    }, [date, durationMin, notes, exercises, t]);

    // ─── Save to Library (PocketBase) ───────────────────────────────
    const handleSaveToLibrary = useCallback(async () => {
        if (exercises.length === 0 || savingToLibrary) return;
        setSavingToLibrary(true);
        setLibraryError('');
        try {
            const { default: pb } = await import('@/lib/pocketbase/client');
            const coachId = pb.authStore.model?.id as string | undefined;
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
                                        <input
                                            type="number"
                                            className={styles.dosageInput}
                                            value={ex.sets}
                                            min={1}
                                            max={20}
                                            aria-label={t('sets')}
                                            onChange={(e) => handleUpdateSets(ex.uid, e.target.value)}
                                        />
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

                    {saveError && (
                        <p className={styles.errorMsg}>{saveError}</p>
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
                        className={styles.saveBtn}
                        onClick={handleSave}
                        disabled={exercises.length === 0 || saved}
                    >
                        {saved ? (
                            <>
                                <CheckCircle2 size={18} />
                                {t('saved')}
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                {t('save')}
                            </>
                        )}
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
        </>
    );
}
