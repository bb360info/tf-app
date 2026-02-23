'use client';

import { Flame, Zap, Trophy, Star, Award, Target, Dumbbell, Medal, Flag } from 'lucide-react';
import type { AchievementsRecord, AchievementType } from '@/lib/pocketbase/types';
import { ACHIEVEMENT_META, type AchievementProgress } from '@/lib/pocketbase/services/achievements';
import styles from './AchievementBadge.module.css';

const ICONS = {
    Flame,
    Zap,
    Trophy,
    Star,
    Award,
    Target,
    Dumbbell,
    Medal,
    Flag,
} as const;

interface AchievementBadgeProps {
    type: AchievementType;
    earned?: AchievementsRecord;
    progress?: AchievementProgress;
    locale?: string;
    isNew?: boolean;
}

export function AchievementBadge({ type, earned, progress, locale = 'ru', isNew }: AchievementBadgeProps) {
    const meta = ACHIEVEMENT_META[type];
    const lang = (locale === 'en' ? 'en' : locale === 'cn' ? 'cn' : 'ru') as 'ru' | 'en' | 'cn';
    const Icon = ICONS[meta.icon];
    const isUnlocked = !!earned;

    const earnedDate = earned
        ? new Intl.DateTimeFormat(lang === 'cn' ? 'zh-CN' : lang === 'en' ? 'en-GB' : 'ru-RU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }).format(new Date(earned.earned_at))
        : null;

    return (
        <div
            className={[
                styles.badge,
                isUnlocked ? styles.unlocked : styles.locked,
                isNew ? styles.newBadge : '',
            ]
                .filter(Boolean)
                .join(' ')}
            aria-label={`${meta.labels[lang]} — ${isUnlocked ? earnedDate ?? '' : '?'}`}
        >
            <div className={styles.iconWrap} aria-hidden="true">
                <Icon size={24} />
            </div>
            <p className={styles.label}>{meta.labels[lang]}</p>
            <p className={styles.desc}>{meta.descriptions[lang]}</p>

            {/* Progress bar for locked achievements */}
            {!isUnlocked && progress && (
                <div className={styles.progressSection}>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{ width: `${progress.percent}%` }}
                            role="progressbar"
                            aria-valuenow={progress.current}
                            aria-valuemin={0}
                            aria-valuemax={progress.target}
                        />
                    </div>
                    <p className={styles.progressText}>
                        {progress.current}/{progress.target}
                    </p>
                </div>
            )}

            {/* Earned date */}
            {earnedDate && <p className={styles.earnedAt}>{earnedDate}</p>}
        </div>
    );
}
