'use client';

/**
 * ExerciseDetailSheet — bottom sheet / modal с полной информацией об упражнении.
 * Содержит: иллюстрация, название, описание, CNS cost, категория, оборудование,
 * мышцы, дозировка, Coach Tips с TTS, кнопки «Избранное» и «Показать атлету».
 */

import { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Star, Eye, Tag, Dumbbell, Zap } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import type { ExercisesRecord } from '@/lib/pocketbase/types';
import type { Language } from '@/lib/pocketbase/types';
import { cnsCostLabel } from '@/lib/pocketbase/services/exercises';
import { CoachTips } from './CoachTips';
import { useExerciseFavorites } from '@/lib/hooks/useExerciseFavorites';
import styles from './ExerciseDetailSheet.module.css';

interface ExerciseDetailSheetProps {
    exercise: ExercisesRecord;
    onClose: () => void;
    onShowAthlete: (exercise: ExercisesRecord) => void;
}

function getName(ex: ExercisesRecord, locale: Language): string {
    switch (locale) {
        case 'ru': return ex.name_ru || ex.name_en;
        case 'cn': return ex.name_cn || ex.name_en;
        default: return ex.name_en;
    }
}

function getDescription(ex: ExercisesRecord, locale: Language): string {
    switch (locale) {
        case 'ru': return ex.description_ru || ex.description_en || '';
        case 'cn': return ex.description_cn || ex.description_en || '';
        default: return ex.description_en || '';
    }
}

const CNS_COLORS = ['', '#22c55e', '#22c55e', '#f59e0b', '#ef4444', '#ef4444'] as const;

export function ExerciseDetailSheet({ exercise, onClose, onShowAthlete }: ExerciseDetailSheetProps) {
    const t = useTranslations('exercises');
    const locale = useLocale() as Language;
    const { isFavorite, toggleFavorite } = useExerciseFavorites();

    const favorite = isFavorite(exercise.id);
    const name = getName(exercise, locale);
    const description = getDescription(exercise, locale);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handler);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const handleBackdrop = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === e.currentTarget) onClose();
        },
        [onClose]
    );

    const cnsColor = CNS_COLORS[exercise.cns_cost] ?? '#9b9b9b';

    if (typeof document === 'undefined') return null;

    const portalElement = document.getElementById('portal-root');
    if (!portalElement) return null;

    return createPortal(
        <div
            className={styles.backdrop}
            role="dialog"
            aria-modal="true"
            aria-label={name}
            onClick={handleBackdrop}
        >
            <div className={styles.sheet}>
                {/* Drag handle */}
                <div className={styles.handle} aria-hidden="true" />

                {/* Header */}
                <div className={styles.header}>
                    <button
                        type="button"
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label={t('close')}
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className={styles.body}>
                    {/* Category accent bar */}
                    <div
                        className={styles.categoryBar}
                        style={{ background: `var(--color-${exercise.training_category})` }}
                        aria-hidden="true"
                    />

                    {/* Name */}
                    <h2 className={styles.name}>{name}</h2>

                    {/* Badges row */}
                    <div className={styles.badges}>
                        <span className={`${styles.badge} ${styles.badgeCategory}`}
                            style={{ color: `var(--color-${exercise.training_category})`, background: `color-mix(in srgb, var(--color-${exercise.training_category}) 12%, transparent)` }}
                        >
                            {t(`category.${exercise.training_category}`)}
                        </span>
                        <span className={styles.badge}>{t(`level.${exercise.level}`)}</span>
                        <span
                            className={styles.badge}
                            style={{ color: cnsColor, background: `color-mix(in srgb, ${cnsColor} 12%, transparent)` }}
                        >
                            <Zap size={12} aria-hidden="true" />
                            {t('cns')} {exercise.cns_cost}/5 — {cnsCostLabel(exercise.cns_cost)}
                        </span>
                    </div>

                    {/* Dosage */}
                    {exercise.dosage && (
                        <div className={styles.dosageBlock}>
                            <span className={styles.label}>{t('dosage')}</span>
                            <span className={styles.dosageValue}>{exercise.dosage}</span>
                        </div>
                    )}

                    {/* Description */}
                    {description && (
                        <p className={styles.description}>{description}</p>
                    )}

                    {/* Equipment */}
                    {exercise.equipment && exercise.equipment.length > 0 && (
                        <div className={styles.tagsSection}>
                            <div className={styles.tagsSectionHeader}>
                                <Dumbbell size={14} aria-hidden="true" />
                                <span className={styles.label}>{t('equipment')}</span>
                            </div>
                            <div className={styles.tags}>
                                {exercise.equipment.map((eq) => (
                                    <span key={eq} className={styles.tag}>{eq}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Muscles */}
                    {exercise.muscles && exercise.muscles.length > 0 && (
                        <div className={styles.tagsSection}>
                            <div className={styles.tagsSectionHeader}>
                                <Tag size={14} aria-hidden="true" />
                                <span className={styles.label}>{t('muscles')}</span>
                            </div>
                            <div className={styles.tags}>
                                {exercise.muscles.map((m) => (
                                    <span key={m} className={styles.tag}>{m}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Coach Tips */}
                    <div className={styles.section}>
                        <CoachTips
                            exercise={exercise}
                            locale={locale}
                            labels={{
                                title: t('coachTips'),
                                speak: t('ttsSpeak'),
                                stop: t('ttsStop'),
                                noTips: t('noTips'),
                            }}
                        />
                    </div>
                </div>

                {/* Actions footer */}
                <div className={styles.footer}>
                    <button
                        type="button"
                        className={`${styles.actionBtn} ${favorite ? styles.favoriteActive : ''}`}
                        onClick={() => toggleFavorite(exercise.id)}
                        aria-label={favorite ? t('removeFavorite') : t('addFavorite')}
                        aria-pressed={favorite}
                    >
                        <Star size={20} fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
                        {favorite ? t('inFavorites') : t('addFavorite')}
                    </button>
                    <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.showAthleteBtn}`}
                        onClick={() => onShowAthlete(exercise)}
                        aria-label={t('showAthlete')}
                    >
                        <Eye size={20} aria-hidden="true" />
                        {t('showAthlete')}
                    </button>
                </div>
            </div>
        </div>,
        portalElement
    );
}
