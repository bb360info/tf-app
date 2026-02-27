'use client';

/**
 * QuickEditView — Быстрое логирование с тоггл-статусами ✓/~/✗.
 * Атлет быстро отмечает, какие упражнения выполнил, частично выполнил или пропустил.
 * После «Сохранить» — batch write в log_exercises.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Check, Minus, ArrowLeft } from 'lucide-react';
import {
    batchSaveLogExercises,
} from '@/lib/pocketbase/services/logs';
import type { PlanExerciseWithExpand } from '@/lib/pocketbase/services/plans';
import type { Language, SetData } from '@/lib/pocketbase/types';
import styles from './QuickEditView.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type ExerciseStatus = 'done' | 'partial' | 'skipped';

function nextStatus(current: ExerciseStatus): ExerciseStatus {
    if (current === 'done') return 'partial';
    if (current === 'partial') return 'skipped';
    return 'done';
}

// ─── Helper: name resolution ──────────────────────────────────────────────────

function getExName(planEx: PlanExerciseWithExpand, locale: Language): string {
    const base = planEx.expand?.exercise_id;
    if (!base) {
        if (locale === 'ru') return planEx.custom_text_ru ?? planEx.custom_text_en ?? '';
        if (locale === 'cn') return planEx.custom_text_cn ?? planEx.custom_text_en ?? '';
        return planEx.custom_text_en ?? '';
    }
    switch (locale) {
        case 'ru': return base.name_ru || base.name_en;
        case 'cn': return base.name_cn || base.name_en;
        default: return base.name_en;
    }
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface QuickEditViewProps {
    exercises: PlanExerciseWithExpand[];
    logId: string;
    athleteId: string;
    locale: Language;
    onDone: () => void;
    onClose: () => void;
}

// ─── Status Icon ─────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: ExerciseStatus }) {
    if (status === 'done') return <Check size={20} aria-hidden="true" />;
    if (status === 'partial') return <Minus size={20} aria-hidden="true" />;
    return <X size={20} aria-hidden="true" />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickEditView({
    exercises,
    logId,
    locale,
    onDone,
    onClose,
}: QuickEditViewProps) {
    const t = useTranslations('training');

    // Filter non-warmup exercises
    const mainExercises = exercises.filter((ex) => !ex.is_warmup && ex.exercise_id);

    // Status per exercise id
    const [statuses, setStatuses] = useState<Record<string, ExerciseStatus>>(() =>
        Object.fromEntries(mainExercises.map((ex) => [ex.id, 'done' as ExerciseStatus]))
    );

    // Partial sets per exercise id (default = plan sets)
    const [partialSets, setPartialSets] = useState<Record<string, number>>(() =>
        Object.fromEntries(mainExercises.map((ex) => [ex.id, ex.sets ?? 1]))
    );

    const [isSaving, setIsSaving] = useState(false);

    const handleToggle = (id: string) => {
        setStatuses((prev) => ({ ...prev, [id]: nextStatus(prev[id] ?? 'done') }));
    };

    const handlePartialSets = (id: string, value: string) => {
        const n = parseInt(value, 10);
        if (!isNaN(n) && n >= 0) {
            setPartialSets((prev) => ({ ...prev, [id]: n }));
        }
    };

    const doneCount = mainExercises.filter((ex) => statuses[ex.id] !== 'skipped').length;
    const totalCount = mainExercises.length;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const entries = mainExercises
                .filter((ex) => statuses[ex.id] !== 'skipped' && ex.exercise_id)
                .map((ex) => {
                    const status = statuses[ex.id] ?? 'done';
                    const setsCount = status === 'partial'
                        ? (partialSets[ex.id] ?? 1)
                        : (ex.sets ?? 1);
                    const reps = parseInt(ex.reps || '8', 10) || 8;
                    const weight = ex.weight ?? 0;
                    const setsData: SetData[] = Array.from({ length: setsCount }, (_, i) => ({
                        set: i + 1,
                        reps,
                        weight,
                        time: ex.duration ?? 0,
                        distance: ex.distance ?? 0,
                    }));
                    return { exerciseId: ex.exercise_id!, setsData };
                });

            if (entries.length > 0) {
                await batchSaveLogExercises(logId, entries);
            }
            // Phase 5: haptic feedback
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(50);
            }
            onDone();
        } catch (e) {
            console.error('[QuickEditView] batchSave failed', e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={styles.root}>
            {/* Header */}
            <div className={styles.header}>
                <button
                    type="button"
                    className={styles.backBtn}
                    onClick={onClose}
                    aria-label={t('postWorkout.back')}
                >
                    <ArrowLeft size={20} aria-hidden="true" />
                </button>
                <h2 className={styles.title}>{t('postWorkout.quickEdit')}</h2>
            </div>

            {/* Exercise list */}
            <div className={styles.list}>
                {mainExercises.map((ex) => {
                    const status = statuses[ex.id] ?? 'done';
                    const name = getExName(ex, locale);

                    return (
                        <div key={ex.id} className={styles.row}>
                            {/* Status toggle button */}
                            <button
                                type="button"
                                className={`${styles.statusBtn} ${styles[`statusBtn_${status}`]}`}
                                onClick={() => handleToggle(ex.id)}
                                aria-label={`${name}: ${status}`}
                            >
                                <StatusIcon status={status} />
                            </button>

                            {/* Exercise name */}
                            <span className={`${styles.exName} ${status === 'skipped' ? styles.exNameSkipped : ''}`}>
                                {name}
                            </span>

                            {/* Partial sets input */}
                            {status === 'partial' && (
                                <div className={styles.partialWrap}>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        className={styles.partialInput}
                                        value={partialSets[ex.id] ?? ex.sets ?? 1}
                                        min={1}
                                        max={ex.sets ?? 20}
                                        onChange={(e) => handlePartialSets(ex.id, e.target.value)}
                                        aria-label={t('postWorkout.partialSets')}
                                    />
                                    <span className={styles.partialUnit}>{t('postWorkout.setsUnit')}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Save footer */}
            <div className={styles.footer}>
                <button
                    type="button"
                    className={styles.saveBtn}
                    onClick={handleSave}
                    disabled={isSaving || totalCount === 0}
                >
                    {isSaving
                        ? t('saving')
                        : t('postWorkout.saveCount', { done: doneCount, total: totalCount })
                    }
                </button>
            </div>
        </div>
    );
}
