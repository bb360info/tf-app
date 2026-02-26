import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import styles from './DayHeader.module.css';

interface Props {
    dayName: string;
    formattedDate: string | null;
    totalExercises: number;
    hasLog: boolean;
    groupReadiness?: Map<string, number>;
    onBack: () => void;
}

export function DayHeader({
    dayName,
    formattedDate,
    totalExercises,
    hasLog,
    groupReadiness,
    onBack,
}: Props) {
    const t = useTranslations();

    return (
        <div className={styles.header}>
            <button className={styles.backBtn} onClick={onBack} aria-label={t('shared.back')}>
                <ArrowLeft size={18} />
            </button>
            <div className={styles.info}>
                <div className={styles.titleRow}>
                    <h2 className={styles.dayName}>{dayName}</h2>
                    {formattedDate && <span className={styles.date}>{formattedDate}</span>}
                </div>

                <div className={styles.metaRow}>
                    <span className={styles.exerciseCount}>
                        {totalExercises} {t('training.exercisesFound')}
                    </span>
                    {hasLog && (
                        <span className={styles.logStatus}>
                            ({t('training.log.record')} ✓)
                        </span>
                    )}
                </div>
            </div>

            {groupReadiness && groupReadiness.size > 0 && (
                <div className={styles.readinessBadges}>
                    {Array.from(groupReadiness.values()).map((score, i) => {
                        const color = score >= 80 ? 'var(--color-success)'
                            : score >= 60 ? 'var(--color-warning)'
                                : 'var(--color-error)';
                        return (
                            <span
                                key={i}
                                className={styles.badge}
                                style={{ background: color }}
                                title={`${t('training.readinessScore')}: ${score}`}
                            >
                                {score}
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
