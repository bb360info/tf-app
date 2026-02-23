'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Flame, AlertCircle, TrendingUp } from 'lucide-react';
import {
    computeStreak,
    ACHIEVEMENT_META,
    ACHIEVEMENTS_BY_CATEGORY,
    type AchievementProgress,
} from '@/lib/pocketbase/services/achievements';
import pb from '@/lib/pocketbase/client';
import styles from './StreakHeroCard.module.css';

interface StreakHeroCardProps {
    athleteId: string;
}

/** Find the next streak milestone target for the current streak */
function getNextMilestone(streak: number): { type: string; target: number } | null {
    const milestones = ACHIEVEMENTS_BY_CATEGORY.streak
        .map((t) => ({ type: t, target: ACHIEVEMENT_META[t].target }))
        .sort((a, b) => a.target - b.target);

    for (const m of milestones) {
        if (streak < m.target) return m;
    }
    return null; // All milestones achieved
}

/** Compute the best ever streak from all checkin dates */
function computeBestStreak(dateStrings: string[]): number {
    if (dateStrings.length === 0) return 0;

    // Deduplicate and sort ascending
    const dates = [...new Set(dateStrings.map((s) => s.slice(0, 10)))].sort();

    let best = 1;
    let current = 1;

    for (let i = 1; i < dates.length; i++) {
        const prevParts = dates[i - 1].split('-').map(Number);
        const currParts = dates[i].split('-').map(Number);
        const prev = new Date(prevParts[0], prevParts[1] - 1, prevParts[2]);
        const curr = new Date(currParts[0], currParts[1] - 1, currParts[2]);
        const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);

        if (diff === 1) {
            current++;
            if (current > best) best = current;
        } else {
            current = 1;
        }
    }

    return best;
}

export function StreakHeroCard({ athleteId }: StreakHeroCardProps) {
    const t = useTranslations('streakHero');

    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [nextMilestone, setNextMilestone] = useState<{ type: string; target: number } | null>(null);
    const [showWarning, setShowWarning] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const checkins = await pb.collection('daily_checkins').getFullList<{ date: string }>({
                filter: `athlete_id = "${athleteId}"`,
                fields: 'date',
                sort: '-date',
            });

            const dates = checkins.map((c) => c.date);
            const currentStreak = computeStreak(dates);
            const best = computeBestStreak(dates);

            setStreak(currentStreak);
            setBestStreak(best);
            setNextMilestone(getNextMilestone(currentStreak));

            // Evening warning: >= 18:00 and no check-in today
            const now = new Date();
            if (now.getHours() >= 18) {
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const hasToday = dates.some((d) => d.slice(0, 10) === todayStr);
                setShowWarning(!hasToday);
            }
        } catch {
            /* non-critical: streak is decorative */
        } finally {
            setIsLoading(false);
        }
    }, [athleteId]);

    useEffect(() => {
        void load();
    }, [load]);

    if (isLoading) {
        return <div className={styles.skeleton} />;
    }

    const progress: AchievementProgress | null = nextMilestone
        ? {
            type: nextMilestone.type as AchievementProgress['type'],
            current: streak,
            target: nextMilestone.target,
            percent: Math.round((streak / nextMilestone.target) * 100),
            isComplete: false,
        }
        : null;

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <Flame size={20} className={styles.icon} aria-hidden="true" />
                <h3 className={styles.title}>{t('title')}</h3>
            </div>

            <div className={styles.content}>
                {/* Hero streak number */}
                <div className={styles.heroNumber}>
                    <span className={streak > 0 ? styles.streakActive : styles.streakZero}>
                        {streak}
                    </span>
                    <span className={styles.streakUnit}>{t('days')}</span>
                </div>

                {/* Best streak */}
                <div className={styles.bestStreak}>
                    <TrendingUp size={14} aria-hidden="true" />
                    <span>{t('best')}: {bestStreak}</span>
                </div>

                {/* Progress to next milestone */}
                {progress && (
                    <div className={styles.milestoneSection}>
                        <div className={styles.milestoneLabel}>
                            {t('nextMilestone', { target: progress.target })}
                        </div>
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
                        <div className={styles.progressText}>
                            {progress.current}/{progress.target}
                        </div>
                    </div>
                )}

                {/* Evening warning */}
                {showWarning && (
                    <div className={styles.warning} role="alert">
                        <AlertCircle size={16} aria-hidden="true" />
                        <span>{t('eveningWarning')}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
