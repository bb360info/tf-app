'use client';

import { useEffect, useState, useCallback } from 'react';
import { Trophy } from 'lucide-react';
import type { AchievementsRecord, AchievementType } from '@/lib/pocketbase/types';
import {
    checkAndGrant,
    ACHIEVEMENTS_BY_CATEGORY,
    type AchievementCategory,
    type AchievementProgress,
} from '@/lib/pocketbase/services/achievements';
import { useCelebration } from '@/lib/hooks/useCelebration';
import { CelebrationOverlay } from '@/components/gamification/CelebrationOverlay';
import { CelebrationToast } from '@/components/gamification/CelebrationToast';
import { AchievementBadge } from './AchievementBadge';
import { Skeleton } from '@/components/shared/Skeleton';
import { useTranslations } from 'next-intl';
import styles from './AchievementsGrid.module.css';


const CATEGORY_ORDER: AchievementCategory[] = ['streak', 'training', 'testing', 'compete'];

interface AchievementsGridProps {
    athleteId: string;
    title?: string;
    locale?: string;
}

export function AchievementsGrid({ athleteId, title, locale = 'ru' }: AchievementsGridProps) {
    const [earned, setEarned] = useState<AchievementsRecord[]>([]);
    const [newTypes, setNewTypes] = useState<Set<AchievementType>>(new Set());
    const [progress, setProgress] = useState<Map<AchievementType, AchievementProgress>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    const { active, celebrate, dismiss } = useCelebration();
    const t = useTranslations('analytics');

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            // Single call — fixes race condition (no separate listAchievements)
            const result = await checkAndGrant(athleteId);
            setEarned(result.allEarned);
            setProgress(result.progress);
            if (result.newlyEarned.length > 0) {
                setNewTypes(new Set(result.newlyEarned.map((a) => a.type)));
                // Trigger celebrations for each newly earned achievement
                for (const record of result.newlyEarned) {
                    celebrate(record.type);
                }
            }
        } catch {
            /* non-critical: achievements are decorative */
        } finally {
            setIsLoading(false);
        }
    }, [athleteId, celebrate]);

    useEffect(() => {
        void load();
    }, [load]);

    const earnedMap = new Map(earned.map((a) => [a.type, a]));

    return (
        <>
            <div className={styles.wrap}>
                {title && (
                    <p className={styles.title}>
                        <Trophy size={14} aria-hidden="true" style={{ display: 'inline', marginRight: 'var(--space-2)', verticalAlign: '-2px' }} />
                        {title}
                    </p>
                )}

                {isLoading ? (
                    <div className={styles.grid}>
                        {Array.from({ length: 12 }, (_, i) => (
                            <Skeleton key={i} variant="circular" width="100%" height="auto" style={{ aspectRatio: '1 / 1' }} />
                        ))}
                    </div>
                ) : (
                    CATEGORY_ORDER.map((category) => {
                        const types = ACHIEVEMENTS_BY_CATEGORY[category];
                        const earnedCount = types.filter((t) => earnedMap.has(t)).length;

                        return (
                            <section key={category} className={styles.categorySection}>
                                <div className={styles.categoryHeader}>
                                    <h3 className={styles.categoryTitle}>
                                        {t(`category_${category}`)}
                                    </h3>
                                    <span className={styles.categoryCount}>
                                        {earnedCount}/{types.length}
                                    </span>
                                </div>

                                <div className={styles.grid}>
                                    {types.map((type) => (
                                        <AchievementBadge
                                            key={type}
                                            type={type}
                                            earned={earnedMap.get(type)}
                                            progress={progress.get(type)}
                                            locale={locale}
                                            isNew={newTypes.has(type)}
                                        />
                                    ))}
                                </div>
                            </section>
                        );
                    })
                )}
            </div>

            {/* Celebration rendering */}
            {active && active.celebrationType === 'fullscreen' && (
                <CelebrationOverlay celebration={active} locale={locale} onDismiss={dismiss} />
            )}
            {active && active.celebrationType === 'toast' && (
                <CelebrationToast celebration={active} locale={locale} onDismiss={dismiss} />
            )}
        </>
    );
}
