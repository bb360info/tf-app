import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, Zap, Plus } from 'lucide-react';
import type { PlanExerciseWithExpand } from '@/lib/pocketbase/services/plans';
import styles from './DayColumn.module.css';

interface Props {
    dayOfWeek: number; // 0=Mon, 6=Sun
    date: Date | null;
    exercisesBySession: Record<number, PlanExerciseWithExpand[]>;
    hasLog?: boolean;
    groupReadiness?: Map<string, number>;
    onOpenDay: (day: number) => void;
}

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function DayColumn({
    dayOfWeek,
    date,
    exercisesBySession,
    hasLog,
    groupReadiness,
    onOpenDay,
}: Props) {
    const t = useTranslations();
    const locale = useLocale() as 'ru' | 'en' | 'cn';

    const formattedDate = date ? (
        locale === 'en'
            ? date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            : date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    ) : null;

    const allExercises = Object.values(exercisesBySession).flat();
    const totalExercises = allExercises.length;

    // Calculate total CNS cost roughly for the dot/bar, if needed
    const cnsCost = allExercises.reduce((sum, ex) => sum + (ex.expand?.exercise_id?.cns_cost ?? 2), 0);

    return (
        <button className={styles.columnSummary} onClick={() => onOpenDay(dayOfWeek)}>
            <div className={styles.dayHeaderContent}>
                <span className={styles.dayName}>
                    {t(`training.day_${DAY_KEYS[dayOfWeek]}`)}
                </span>
                {formattedDate && (
                    <span className={styles.dayDate}>{formattedDate}</span>
                )}
            </div>

            {groupReadiness && groupReadiness.size > 0 && (
                <div className={styles.readinessBadgesRow}>
                    {Array.from(groupReadiness.values()).map((score, i) => {
                        const color = score >= 80 ? 'var(--color-success)'
                            : score >= 60 ? 'var(--color-warning)'
                                : 'var(--color-error)';
                        return (
                            <span key={i} className={styles.readinessBadge} style={{ background: color }} title={`${t('training.readinessScore')}: ${score}`}>
                                {score}
                            </span>
                        );
                    })}
                </div>
            )}

            <div className={styles.summaryBody}>
                {totalExercises > 0 ? (
                    <>
                        <div className={styles.exerciseCount}>
                            {totalExercises} {t('training.exercisesFound')}
                        </div>
                        <div className={styles.cnsTotal}>
                            <Zap size={12} /> {cnsCost}
                        </div>
                    </>
                ) : (
                    <div className={styles.emptySlot}>
                        <Plus size={16} /> <span>{t('training.addExercise')}</span>
                    </div>
                )}
            </div>

            {hasLog && (
                <div className={styles.logIndicator}>
                    <CheckCircle2 size={16} />
                </div>
            )}
        </button>
    );
}

