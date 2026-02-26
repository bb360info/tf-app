import { Play } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import styles from './TodayWorkoutCard.module.css';
import type { PlanWithExercises } from '@/lib/pocketbase/services/plans';

export function TodayWorkoutCard({ plan }: { plan: PlanWithExercises | null }) {
    const t = useTranslations('athleteDashboard');

    if (!plan) {
        return (
            <div className={`${styles.card} ${styles.empty}`}>
                <h3 className={styles.title}>{t('restDay')}</h3>
                <p className={styles.desc}>{t('noWorkout')}</p>
            </div>
        );
    }

    const exerciseCount = plan.expand?.['plan_exercises(plan_id)']?.length ?? 0;

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h3 className={styles.title}>
                    {t('todaysWorkout')} {plan.week_number ? `· ${t('weekLabel')} ${plan.week_number}` : ''}
                </h3>
            </div>
            <p className={styles.desc}>
                {exerciseCount} {t('blocksPlanned')}
            </p>
            <div className={styles.actions}>
                <Link href="/training" className={styles.startBtn}>
                    <Play size={16} fill="currentColor" />
                    {t('startWorkout')}
                </Link>
            </div>
        </div>
    );
}
