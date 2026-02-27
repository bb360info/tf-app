'use client';

/**
 * ExerciseListItem — compact exercise row for AthleteTrainingView Overview mode.
 * Shows: CNS dot, name, dosage, adjustment badge, logged status.
 * No SetLogger — logging happens in Focus Mode (Phase 3).
 */

import { CheckCircle2, Circle, Zap } from 'lucide-react';
import { cnsCostColor, getExerciseName } from '@/lib/pocketbase/services/exercises';
import type { PlanExerciseWithExpand } from '@/lib/pocketbase/services/plans';
import type { Language } from '@/lib/pocketbase/types';
import styles from './ExerciseListItem.module.css';

interface ExerciseListItemProps {
    planEx: PlanExerciseWithExpand;
    locale: Language;
    isLogged: boolean;
}

export function ExerciseListItem({ planEx, locale, isLogged }: ExerciseListItemProps) {
    const exercise = planEx.expand?.exercise_id;
    const unitType = exercise?.unit_type ?? 'reps';

    // Resolve display name
    let name = '—';
    let cnsCost = 2;
    if (exercise) {
        name = getExerciseName(exercise, locale);
        cnsCost = exercise.cns_cost ?? 2;
    } else {
        const textMap: Record<string, string | null | undefined> = {
            ru: planEx.custom_text_ru,
            en: planEx.custom_text_en,
            cn: planEx.custom_text_cn,
        };
        name = textMap[locale] ?? planEx.custom_text_ru ?? planEx.custom_text_en ?? '—';
    }

    // Build dosage label
    const dosageLabel = (() => {
        const s = planEx.sets;
        if (!s) return '—';
        switch (unitType) {
            case 'weight':
                return `${s}×${planEx.reps || '?'}${planEx.weight ? ` @${planEx.weight}kg` : ''}`;
            case 'distance':
                return `${s}×${planEx.distance ? `${planEx.distance}m` : '?m'}`;
            case 'time':
                return `${s}×${planEx.duration ? `${planEx.duration}s` : '?s'}`;
            default:
                return planEx.reps
                    ? `${s}×${planEx.reps}${planEx.intensity ? ` @${planEx.intensity}` : ''}`
                    : `${s} sets`;
        }
    })();

    const isAdjusted = Boolean((planEx as Record<string, unknown>)._adjusted);

    return (
        <li className={`${styles.item} ${isLogged ? styles.itemLogged : ''}`}>
            {/* CNS dot */}
            <span
                className={styles.cnsDot}
                style={{ backgroundColor: cnsCostColor(cnsCost) }}
                aria-hidden="true"
            />

            {/* Info */}
            <span className={styles.info}>
                <span className={styles.name}>{name}</span>
                <span className={styles.dosage}>{dosageLabel}</span>
            </span>

            {/* Adjustment badge — per [GAP-2] */}
            {isAdjusted && (
                <Zap
                    size={12}
                    className={styles.adjustedBadge}
                    aria-label="Персонализированная корректировка"
                />
            )}

            {/* Logged status */}
            {isLogged ? (
                <CheckCircle2 size={16} className={styles.statusDone} aria-label="Выполнено" />
            ) : (
                <Circle size={16} className={styles.statusEmpty} aria-hidden="true" />
            )}
        </li>
    );
}
