'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { X, Plus, Trash2, Save, ClipboardCheck } from 'lucide-react';
import { getOrCreateLog, batchSaveLogExercises } from '@/lib/pocketbase/services/logs';
import { listPlanExercises } from '@/lib/pocketbase/services/plans';
import { getExerciseName } from '@/lib/pocketbase/services/exercises';
import type { SetData, UnitType } from '@/lib/pocketbase/types';
import { toLocalISODate } from '@/lib/utils/dateHelpers';
import styles from './TrainingLog.module.css';

// ─── Types ────────────────────────────────────────────

interface ExerciseState {
    planExerciseId: string;
    exerciseId: string | undefined; // nullable for warmup custom_text items
    name: string;
    unitType: UnitType;
    plannedSets: number;
    plannedReps: string;
    sets: SetRow[];
    rpe: number;
    /** For 'weight' unit_type (height jump attempts) */
    attempts?: HeightAttempt[];
}

interface SetRow {
    reps: string;
    weight: string;
    duration: string;
    distance: string;
}

interface HeightAttempt {
    height: string;
    result: 'made' | 'miss';
}

interface Props {
    planId: string;
    dayOfWeek: number; // 0=Mon … 6=Sun
    dayDate: Date | null;
    athleteId: string;
    readinessScore?: number;
    session?: number; // 0=AM (default), 1=PM
    onClose: () => void;
    onSaved: () => void;
}

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

// ─── Helpers ──────────────────────────────────────────

function buildSetsData(ex: ExerciseState): SetData[] {
    switch (ex.unitType) {
        case 'reps': // reps only (bodyweight)
        case 'weight': // reps + weight
            return ex.sets.map((s, i) => ({
                set: i + 1,
                reps: s.reps ? parseInt(s.reps, 10) : undefined,
                weight: ex.unitType === 'weight' && s.weight ? parseFloat(s.weight) : undefined,
            })).filter((s) => s.reps !== undefined || s.weight !== undefined);

        case 'time':
            return ex.sets.map((s, i) => ({
                set: i + 1,
                time: s.duration ? parseFloat(s.duration) : undefined,
            })).filter((s) => s.time !== undefined);

        case 'distance':
            return ex.sets.map((s, i) => ({
                set: i + 1,
                distance: s.distance ? parseFloat(s.distance) : undefined,
            })).filter((s) => s.distance !== undefined);

        default:
            return [];
    }
}

function defaultRows(count: number): SetRow[] {
    return Array.from({ length: count || 1 }, () => ({
        reps: '',
        weight: '',
        duration: '',
        distance: '',
    }));
}

function getReadinessLevel(score?: number): 'high' | 'medium' | 'low' {
    if (!score) return 'medium';
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
}

// ─── Main Component ───────────────────────────────────

export default function TrainingLog({
    planId,
    dayOfWeek,
    dayDate,
    athleteId,
    readinessScore,
    session = 0,
    onClose,
    onSaved,
}: Props) {
    const t = useTranslations();
    const locale = useLocale() as 'ru' | 'en' | 'cn';

    const [exercises, setExercises] = useState<ExerciseState[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load exercises for this day
    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const all = await listPlanExercises(planId);
                const dayExercises = all.filter((e) => (e.day_of_week ?? 0) === dayOfWeek);

                if (!cancelled) {
                    setExercises(
                        dayExercises
                            .filter((pe) => pe.block !== 'warmup') // skip warmup items in logging UI
                            .map((pe) => {
                                const ex = pe.expand?.exercise_id;
                                const unitType: UnitType = ex?.unit_type ?? 'reps';
                                const plannedSets = pe.sets ?? 3;
                                return {
                                    planExerciseId: pe.id,
                                    exerciseId: pe.exercise_id,
                                    name: ex ? getExerciseName(ex, locale) : (pe.exercise_id ?? pe.id),
                                    unitType,
                                    plannedSets,
                                    plannedReps: pe.reps ?? '',
                                    sets: defaultRows(plannedSets),
                                    rpe: 7,
                                };
                            })
                    );
                }
            } catch (err) {
                if (!cancelled) setError(String(err));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [planId, dayOfWeek, locale]);

    // ── Save handler ───────────────────────────────────

    const handleSave = useCallback(async () => {
        setSaving(true);
        setError(null);
        try {
            const dateStr = dayDate ? toLocalISODate(dayDate) : toLocalISODate();

            const log = await getOrCreateLog(athleteId, planId, dateStr, session);

            await batchSaveLogExercises(
                log.id,
                exercises
                    .filter((ex): ex is ExerciseState & { exerciseId: string } => !!ex.exerciseId)
                    .map((ex) => ({
                        exerciseId: ex.exerciseId,
                        setsData: buildSetsData(ex),
                        rpe: ex.rpe,
                    }))
            );
            onSaved();
        } catch (err) {
            setError(String(err));
        } finally {
            setSaving(false);
        }
    }, [athleteId, planId, dayDate, session, exercises, onSaved]);

    // ── Update helpers ─────────────────────────────────

    const updateSet = useCallback(
        (exIdx: number, setIdx: number, field: keyof SetRow, value: string) => {
            setExercises((prev) =>
                prev.map((ex, i) =>
                    i !== exIdx
                        ? ex
                        : {
                            ...ex,
                            sets: ex.sets.map((s, j) =>
                                j !== setIdx ? s : { ...s, [field]: value }
                            ),
                        }
                )
            );
        },
        []
    );

    const addSet = useCallback((exIdx: number) => {
        setExercises((prev) =>
            prev.map((ex, i) =>
                i !== exIdx
                    ? ex
                    : { ...ex, sets: [...ex.sets, { reps: '', weight: '', duration: '', distance: '' }] }
            )
        );
    }, []);

    const removeSet = useCallback((exIdx: number) => {
        setExercises((prev) =>
            prev.map((ex, i) =>
                i !== exIdx || ex.sets.length <= 1
                    ? ex
                    : { ...ex, sets: ex.sets.slice(0, -1) }
            )
        );
    }, []);

    const updateRpe = useCallback((exIdx: number, value: number) => {
        setExercises((prev) =>
            prev.map((ex, i) => (i !== exIdx ? ex : { ...ex, rpe: value }))
        );
    }, []);

    // ── Day label ──────────────────────────────────────

    const dayLabel = dayDate
        ? dayDate.toLocaleDateString(locale === 'en' ? 'en-US' : 'ru-RU', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
        })
        : t(`training.day_${DAY_KEYS[dayOfWeek]}`);

    // ── Render ─────────────────────────────────────────

    return (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={styles.panel} role="dialog" aria-modal aria-label={t('training.log.title')}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerInfo}>
                        <h2 className={styles.headerTitle}>
                            <ClipboardCheck size={18} aria-hidden />
                            {'  '}
                            {t('training.log.title')}
                        </h2>
                        <div className={styles.headerDay}>{dayLabel}</div>
                    </div>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label={t('app.close')}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Readiness badge */}
                {readinessScore !== undefined && (
                    <div className={styles.readinessBadge}>
                        <span className={styles.readinessLabel}>{t('training.readiness')}</span>
                        <span
                            className={styles.readinessScore}
                            data-level={getReadinessLevel(readinessScore)}
                        >
                            {readinessScore}/100
                        </span>
                    </div>
                )}

                {/* Error */}
                {error && <div className={styles.error}>{error}</div>}

                {/* Body */}
                <div className={styles.body}>
                    {loading ? (
                        <div className={styles.empty}>{t('app.loading')}</div>
                    ) : exercises.length === 0 ? (
                        <div className={styles.empty}>{t('training.log.noExercises')}</div>
                    ) : (
                        exercises.map((ex, exIdx) => (
                            <ExerciseCard
                                key={ex.planExerciseId}
                                ex={ex}
                                exIdx={exIdx}
                                onUpdateSet={updateSet}
                                onAddSet={addSet}
                                onRemoveSet={removeSet}
                                onUpdateRpe={updateRpe}
                                t={t}
                            />
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>
                        {t('app.cancel')}
                    </button>
                    <button
                        className={styles.saveBtn}
                        onClick={handleSave}
                        disabled={saving || loading || exercises.length === 0}
                    >
                        {saving ? (
                            <div className={styles.savingSpinner} />
                        ) : (
                            <>
                                <Save size={18} />
                                {t('training.log.save')}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Exercise Card ─────────────────────────────────────

interface CardProps {
    ex: ExerciseState;
    exIdx: number;
    onUpdateSet: (exIdx: number, setIdx: number, field: keyof SetRow, value: string) => void;
    onAddSet: (exIdx: number) => void;
    onRemoveSet: (exIdx: number) => void;
    onUpdateRpe: (exIdx: number, value: number) => void;
    t: ReturnType<typeof useTranslations>;
}

function ExerciseCard({ ex, exIdx, onUpdateSet, onAddSet, onRemoveSet, onUpdateRpe, t }: CardProps) {
    const unitType = ex.unitType;

    return (
        <div className={styles.exerciseCard}>
            <div className={styles.exerciseName}>{ex.name}</div>
            {ex.plannedReps && (
                <div className={styles.exercisePlanned}>
                    {t('training.log.planned')}: {ex.plannedSets}×{ex.plannedReps}
                </div>
            )}

            {/* Sets */}
            <SetsInput
                ex={ex}
                exIdx={exIdx}
                unitType={unitType}
                onUpdateSet={onUpdateSet}
                onAddSet={onAddSet}
                onRemoveSet={onRemoveSet}
                t={t}
            />

            {/* RPE */}
            <div className={styles.rpeSection}>
                <div className={styles.rpeLabel}>
                    <span>RPE ({t('training.log.rpe')})</span>
                    <span className={styles.rpeValue}>{ex.rpe}/10</span>
                </div>
                <input
                    type="range"
                    min={1}
                    max={10}
                    value={ex.rpe}
                    onChange={(e) => onUpdateRpe(exIdx, parseInt(e.target.value, 10))}
                    className={styles.rpeSlider}
                    aria-label="RPE"
                />
                <div className={styles.rpeHints}>
                    <span>{t('training.log.rpeEasy')}</span>
                    <span>{t('training.log.rpeMax')}</span>
                </div>
            </div>
        </div>
    );
}

// ─── Sets Input — varies by unit_type ─────────────────

interface SetsProps {
    ex: ExerciseState;
    exIdx: number;
    unitType: UnitType;
    onUpdateSet: (exIdx: number, setIdx: number, field: keyof SetRow, value: string) => void;
    onAddSet: (exIdx: number) => void;
    onRemoveSet: (exIdx: number) => void;
    t: ReturnType<typeof useTranslations>;
}

function SetsInput({ ex, exIdx, unitType, onUpdateSet, onAddSet, onRemoveSet, t }: SetsProps) {
    const sets = ex.sets;

    // ── reps (bodyweight) ──────────────────────────────
    if (unitType === 'reps') {
        return (
            <div className={styles.setsTable}>
                <div className={styles.setsHeader} data-type="reps_weight">
                    <span>#</span>
                    <span>{t('training.log.reps')}</span>
                </div>
                {sets.map((s, setIdx) => (
                    <div key={setIdx} className={styles.setRow} data-type="reps_weight">
                        <span className={styles.setNum}>{setIdx + 1}</span>
                        <input
                            type="number"
                            inputMode="numeric"
                            value={s.reps}
                            onChange={(e) => onUpdateSet(exIdx, setIdx, 'reps', e.target.value)}
                            placeholder="—"
                            className={styles.setInput}
                            min={0}
                        />
                    </div>
                ))}
                <div className={styles.setsActions}>
                    <button className={styles.addSetBtn} onClick={() => onAddSet(exIdx)}>
                        <Plus size={14} />{t('training.log.addSet')}
                    </button>
                    <button className={styles.removeSetBtn} onClick={() => onRemoveSet(exIdx)} disabled={sets.length <= 1}>
                        <Trash2 size={14} />
                    </button>
                </div>
                <p className={styles.unitNote}>{t('training.log.bodyweightNote')}</p>
            </div>
        );
    }

    // ── weight (reps + weight) ─────────────────────────
    if (unitType === 'weight') {
        return (
            <div className={styles.setsTable}>
                <div className={styles.setsHeader} data-type="reps_weight">
                    <span>#</span>
                    <span>{t('training.log.reps')}</span>
                    <span>{t('training.log.weightKg')}</span>
                </div>
                {sets.map((s, setIdx) => (
                    <div key={setIdx} className={styles.setRow} data-type="reps_weight">
                        <span className={styles.setNum}>{setIdx + 1}</span>
                        <input
                            type="number"
                            inputMode="numeric"
                            value={s.reps}
                            onChange={(e) => onUpdateSet(exIdx, setIdx, 'reps', e.target.value)}
                            placeholder="—"
                            className={styles.setInput}
                            min={0}
                        />
                        <input
                            type="number"
                            inputMode="decimal"
                            value={s.weight}
                            onChange={(e) => onUpdateSet(exIdx, setIdx, 'weight', e.target.value)}
                            placeholder="kg"
                            className={styles.setInput}
                            min={0}
                            step={0.5}
                        />
                    </div>
                ))}
                <div className={styles.setsActions}>
                    <button className={styles.addSetBtn} onClick={() => onAddSet(exIdx)}>
                        <Plus size={14} />{t('training.log.addSet')}
                    </button>
                    <button className={styles.removeSetBtn} onClick={() => onRemoveSet(exIdx)} disabled={sets.length <= 1}>
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        );
    }

    // ── time (duration per set) ────────────────────────
    if (unitType === 'time') {
        return (
            <div className={styles.setsTable}>
                <div className={styles.setsHeader} data-type="time">
                    <span>#</span>
                    <span>{t('training.log.duration')}</span>
                </div>
                {sets.map((s, setIdx) => (
                    <div key={setIdx} className={styles.setRow} data-type="time">
                        <span className={styles.setNum}>{setIdx + 1}</span>
                        <input
                            type="number"
                            inputMode="numeric"
                            value={s.duration}
                            onChange={(e) => onUpdateSet(exIdx, setIdx, 'duration', e.target.value)}
                            placeholder="sec"
                            className={styles.setInput}
                            min={0}
                        />
                    </div>
                ))}
                <div className={styles.setsActions}>
                    <button className={styles.addSetBtn} onClick={() => onAddSet(exIdx)}>
                        <Plus size={14} />{t('training.log.addSet')}
                    </button>
                    <button className={styles.removeSetBtn} onClick={() => onRemoveSet(exIdx)} disabled={sets.length <= 1}>
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        );
    }

    // ── distance ───────────────────────────────────────
    if (unitType === 'distance') {
        return (
            <div className={styles.setsTable}>
                <div className={styles.setsHeader} data-type="distance">
                    <span>#</span>
                    <span>{t('training.log.distance')}</span>
                </div>
                {sets.map((s, setIdx) => (
                    <div key={setIdx} className={styles.setRow} data-type="distance">
                        <span className={styles.setNum}>{setIdx + 1}</span>
                        <input
                            type="number"
                            inputMode="decimal"
                            value={s.distance}
                            onChange={(e) => onUpdateSet(exIdx, setIdx, 'distance', e.target.value)}
                            placeholder="m"
                            className={styles.setInput}
                            min={0}
                            step={0.1}
                        />
                    </div>
                ))}
                <div className={styles.setsActions}>
                    <button className={styles.addSetBtn} onClick={() => onAddSet(exIdx)}>
                        <Plus size={14} />{t('training.log.addSet')}
                    </button>
                    <button className={styles.removeSetBtn} onClick={() => onRemoveSet(exIdx)} disabled={sets.length <= 1}>
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
