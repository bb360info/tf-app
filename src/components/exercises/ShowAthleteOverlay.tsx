'use client';

/**
 * ShowAthleteOverlay — fullscreen overlay для демонстрации упражнения атлету.
 * Большой шрифт, тёмный фон, auto-TTS опционально.
 */

import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ExercisesRecord } from '@/lib/pocketbase/types';
import type { Language } from '@/lib/pocketbase/types';
import styles from './ShowAthleteOverlay.module.css';

interface ShowAthleteOverlayProps {
    exercise: ExercisesRecord;
    locale: Language;
    onClose: () => void;
    labels: {
        close: string;
        dosage: string;
    };
}

function getExerciseName(ex: ExercisesRecord, locale: Language): string {
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

export function ShowAthleteOverlay({ exercise, locale, onClose, labels }: ShowAthleteOverlayProps) {
    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handler);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const handleBackdropClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === e.currentTarget) onClose();
        },
        [onClose]
    );

    const name = getExerciseName(exercise, locale);
    const description = getDescription(exercise, locale);

    if (typeof document === 'undefined') return null;

    const portalElement = document.getElementById('portal-root');
    if (!portalElement) return null;

    return createPortal(
        <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-label={name}
            onClick={handleBackdropClick}
        >
            <div className={styles.content}>
                <button
                    type="button"
                    className={styles.closeBtn}
                    onClick={onClose}
                    aria-label={labels.close}
                >
                    <X size={24} aria-hidden="true" />
                </button>

                <div className={styles.body}>
                    <h1 className={styles.exerciseName}>{name}</h1>

                    {exercise.dosage && (
                        <div className={styles.dosage}>
                            <span className={styles.dosageLabel}>{labels.dosage}</span>
                            <span className={styles.dosageValue}>{exercise.dosage}</span>
                        </div>
                    )}

                    {description && (
                        <p className={styles.description}>{description}</p>
                    )}
                </div>
            </div>
        </div>,
        portalElement
    );
}
