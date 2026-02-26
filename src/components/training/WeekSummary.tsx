import type { TrainingPlansRecord } from '@/lib/pocketbase/types';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import styles from './WeekSummary.module.css';

interface Props {
    planStatus: TrainingPlansRecord['status'];
    exerciseCount: number;
    readinessScore?: number;
}

export function WeekSummary({ planStatus, exerciseCount, readinessScore }: Props) {
    const t = useTranslations('training');

    return (
        <div className={styles.statusRow}>
            <span className={`${styles.statusBadge} ${styles[`status_${planStatus}`]}`}>
                {t(`planStatus_${planStatus}`)}
            </span>
            <span className={styles.exerciseTotal}>
                {exerciseCount} {t('exercisesFound')}
            </span>

            {/* Adaptation Warning */}
            {readinessScore !== undefined && readinessScore < 50 && (
                <div className={styles.adaptationWarning}>
                    <AlertTriangle size={14} aria-hidden="true" /> {t('lowReadinessWarning')} — {t('reduceVolume')}
                </div>
            )}
        </div>
    );
}
