'use client';

import { Calendar, Flag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CompetitionRecord } from '@/lib/pocketbase/services/seasons';
import styles from './CompetitionCountdown.module.css';

interface Props {
    competition: CompetitionRecord;
}

function getDaysUntil(dateStr: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compDate = new Date(dateStr);
    compDate.setHours(0, 0, 0, 0);
    return Math.ceil((compDate.getTime() - today.getTime()) / 86400000);
}

export function CompetitionCountdown({ competition }: Props) {
    const t = useTranslations('athleteDashboard');
    const daysLeft = getDaysUntil(competition.date);

    if (daysLeft < 0) return null;

    const isAugust = competition.priority === 'A';

    return (
        <div className={`${styles.card} ${isAugust ? styles.cardUrgent : ''}`} role="region" aria-label={t('competition')}>
            <div className={styles.header}>
                {isAugust ? (
                    <Flag size={18} className={styles.iconUrgent} aria-hidden="true" />
                ) : (
                    <Calendar size={18} className={styles.icon} aria-hidden="true" />
                )}
                <span className={styles.label}>{t('competition')}</span>
                <span className={`${styles.priority} ${isAugust ? styles.priorityA : styles.priorityBC}`}>
                    {competition.priority}
                </span>
            </div>

            <p className={styles.name}>{competition.name}</p>

            <div className={styles.countdown}>
                <span className={`${styles.days} ${isAugust ? styles.daysUrgent : ''}`}>
                    {daysLeft}
                </span>
                <span className={styles.unit}>{t('daysUntil')}</span>
            </div>

            {competition.location && (
                <p className={styles.location}>{competition.location}</p>
            )}
        </div>
    );
}
