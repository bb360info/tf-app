'use client';

import { useTranslations } from 'next-intl';
import type { DayStatus } from '@/lib/pocketbase/services/logs';
import styles from './WeeklyHeatmap.module.css';

interface Props {
    weekLogs: DayStatus[];
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function WeeklyHeatmap({ weekLogs }: Props) {
    const t = useTranslations('athleteDashboard');
    return (
        <div className={styles.card}>
            <span className={styles.title}>{t('weeklyVolume')}</span>
            <div className={styles.grid} aria-label="Weekly activity">
                {weekLogs.map((status, i) => (
                    <div
                        key={i}
                        className={`${styles.cell} ${styles[status]}`}
                        aria-label={`${DAY_LABELS[i]}: ${status}`}
                    />
                ))}
            </div>
            <div className={styles.labels}>
                {DAY_LABELS.map((d, i) => (
                    <span key={i} className={styles.dayLabel}>{d}</span>
                ))}
            </div>
        </div>
    );
}
