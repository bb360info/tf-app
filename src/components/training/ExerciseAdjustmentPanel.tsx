'use client';

/**
 * ExerciseAdjustmentPanel — per-athlete exercise override editor.
 * Task 3.3 of Track 4.267 Phase 3.
 *
 * Allows a coach to set per-athlete overrides (sets, reps, intensity, skip)
 * for a specific plan_exercise. Uses upsertAdjustment / removeAdjustment.
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import {
    upsertAdjustment,
    removeAdjustment,
    listAdjustmentsForPlan,
    type ExerciseAdjustmentRecord,
} from '@/lib/pocketbase/services/exerciseAdjustments';
import styles from './ExerciseAdjustmentPanel.module.css';

interface Props {
    /** The plan_exercise being overridden */
    planExerciseId: string;
    /** The athlete whose override this is */
    athleteId: string;
    /** The parent plan — needed to list adjustments */
    planId: string;
    /** Display name for the exercise */
    exerciseName?: string;
    /** Base dosage values from plan_exercise (for placeholder hints) */
    baseSets?: number;
    baseReps?: string;
    baseIntensity?: string;
    onClose: () => void;
    onSaved: () => void;
}

export function ExerciseAdjustmentPanel({
    planExerciseId,
    athleteId,
    planId,
    exerciseName,
    baseSets,
    baseReps,
    baseIntensity,
    onClose,
    onSaved,
}: Props) {
    const t = useTranslations('training');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [existing, setExisting] = useState<ExerciseAdjustmentRecord | null>(null);

    // Form fields — track only what user touches
    const [sets, setSets] = useState('');
    const [reps, setReps] = useState('');
    const [intensity, setIntensity] = useState('');
    const [skip, setSkip] = useState(false);
    const [notes, setNotes] = useState('');

    // Load existing adjustment on mount
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        listAdjustmentsForPlan(planId, athleteId)
            .then((list) => {
                if (cancelled) return;
                const match = list.find((a) => a.plan_exercise_id === planExerciseId);
                if (match) {
                    setExisting(match);
                    setSets(match.sets != null ? String(match.sets) : '');
                    setReps(match.reps ?? '');
                    setIntensity(match.intensity ?? '');
                    setSkip(match.skip ?? false);
                    setNotes(match.notes ?? '');
                }
            })
            .catch(console.error)
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [planId, athleteId, planExerciseId]);

    async function handleSave() {
        setSaving(true);
        try {
            await upsertAdjustment({
                plan_exercise_id: planExerciseId,
                athlete_id: athleteId,
                sets: sets ? Number(sets) : undefined,
                reps: reps || undefined,
                intensity: intensity || undefined,
                notes: notes || undefined,
                skip,
            });
            onSaved();
            onClose();
        } catch (err) {
            console.error('[ExerciseAdjustmentPanel] save failed:', err);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!existing) return;
        setDeleting(true);
        try {
            await removeAdjustment(existing.id);
            onSaved();
            onClose();
        } catch (err) {
            console.error('[ExerciseAdjustmentPanel] delete failed:', err);
        } finally {
            setDeleting(false);
        }
    }

    return (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={styles.panel} role="dialog" aria-modal="true" aria-label={t('adjustmentTitle')}>
                {/* Header */}
                <div className={styles.panelHeader}>
                    <h2 className={styles.panelTitle}>{t('adjustmentTitle')}</h2>
                    {exerciseName && (
                        <p className={styles.panelSubtitle}>{exerciseName}</p>
                    )}
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <div className={styles.loadingRow}>
                        <span className={styles.spinner} />
                    </div>
                ) : (
                    <div className={styles.form}>
                        {/* Sets */}
                        <label className={styles.fieldLabel}>
                            {t('adjustmentSets')}
                            <input
                                type="number"
                                className={styles.fieldInput}
                                value={sets}
                                onChange={(e) => setSets(e.target.value)}
                                placeholder={baseSets != null ? String(baseSets) : '—'}
                                min={1}
                                max={20}
                            />
                        </label>

                        {/* Reps */}
                        <label className={styles.fieldLabel}>
                            {t('adjustmentReps')}
                            <input
                                type="text"
                                className={styles.fieldInput}
                                value={reps}
                                onChange={(e) => setReps(e.target.value)}
                                placeholder={baseReps ?? '—'}
                            />
                        </label>

                        {/* Intensity */}
                        <label className={styles.fieldLabel}>
                            {t('adjustmentIntensity')}
                            <input
                                type="text"
                                className={styles.fieldInput}
                                value={intensity}
                                onChange={(e) => setIntensity(e.target.value)}
                                placeholder={baseIntensity ?? '—'}
                            />
                        </label>

                        {/* Notes */}
                        <label className={styles.fieldLabel}>
                            {t('adjustmentNotes')}
                            <textarea
                                className={styles.fieldTextarea}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                            />
                        </label>

                        {/* Skip toggle */}
                        <label className={styles.skipRow}>
                            <input
                                type="checkbox"
                                className={styles.skipCheck}
                                checked={skip}
                                onChange={(e) => setSkip(e.target.checked)}
                            />
                            <span>{t('adjustmentSkip')}</span>
                        </label>

                        {/* Actions */}
                        <div className={styles.actions}>
                            <button
                                className={styles.saveBtn}
                                onClick={handleSave}
                                disabled={saving || deleting}
                            >
                                {saving ? '...' : t('adjustmentSave')}
                            </button>
                            {existing && (
                                <button
                                    className={styles.deleteBtn}
                                    onClick={handleDelete}
                                    disabled={saving || deleting}
                                >
                                    {deleting ? '...' : t('adjustmentDelete')}
                                </button>
                            )}
                            <button
                                className={styles.cancelBtn}
                                onClick={onClose}
                                disabled={saving || deleting}
                            >
                                {t('editSeasonCancel')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
