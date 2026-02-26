'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trophy } from 'lucide-react';
import dynamic from 'next/dynamic';
import {
    listLatestResults,
    testUnit,
    ALL_TEST_TYPES,
    type TestResultRecord,
} from '@/lib/pocketbase/services/testResults';
import { getPRProjection, getPRTimeline, type PRProjection, type PRTimelinePoint } from '@/lib/pocketbase/services/prProjection';
import type { TestType } from '@/lib/pocketbase/types';
import { Skeleton } from '@/components/shared/Skeleton';
import styles from './athleteDetail.module.css';

const StreakHeroCardLazy = dynamic(
    () => import('@/components/dashboard/StreakHeroCard').then(m => ({ default: m.StreakHeroCard })),
    { loading: () => <Skeleton variant="card" height={160} />, ssr: false }
);
const PRTimelineChartLazy = dynamic(
    () => import('@/components/analytics/PRTimelineChart').then(m => ({ default: m.PRTimelineChart })),
    { loading: () => <Skeleton variant="card" height={300} />, ssr: false }
);

type TFn = ReturnType<typeof useTranslations<'athleteDetail'>>;

export function OverviewTab({ athleteId, locale, t }: {
    athleteId: string;
    readiness: number | null;
    locale: string;
    t: TFn;
    isCoach: boolean;
}) {
    const [latestResults, setLatestResults] = useState<Partial<Record<TestType, TestResultRecord>>>({});
    const [loadingResults, setLoadingResults] = useState(true);
    const [currentPRs, setCurrentPRs] = useState<PRProjection[]>([]);
    const [prTimeline, setPrTimeline] = useState<PRTimelinePoint[]>([]);
    const [loadingTimeline, setLoadingTimeline] = useState(true);

    useEffect(() => {
        listLatestResults(athleteId).then(r => {
            setLatestResults(r);
            setLoadingResults(false);
        }).catch(() => setLoadingResults(false));

        getPRProjection(athleteId).then(prs => {
            setCurrentPRs(prs);
            if (prs.length > 0) {
                const mainDiscipline = prs[0].discipline;
                getPRTimeline(athleteId, mainDiscipline).then(timeline => {
                    setPrTimeline(timeline);
                    setLoadingTimeline(false);
                }).catch(() => setLoadingTimeline(false));
            } else {
                setLoadingTimeline(false);
            }
        }).catch(() => {
            setLoadingTimeline(false);
        });
    }, [athleteId]);

    const DISPLAY_TYPES: TestType[] = ['standing_jump', 'approach_jump', 'sprint_30m', 'squat_max'];

    return (
        <div className={styles.overviewGrid}>
            {/* Metric Cards 2×2 */}
            <div className={styles.metricsGrid}>
                {loadingResults ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={styles.metricCardSkeleton} />
                    ))
                ) : (
                    DISPLAY_TYPES.map(type => {
                        const result = latestResults[type];
                        return (
                            <div key={type} className={styles.metricCard}>
                                <span className={styles.metricLabel}>{t(`testType.${type}`)}</span>
                                <span className={styles.metricValue}>
                                    {result ? `${result.value} ${testUnit(type)}` : '—'}
                                </span>
                                {result && (
                                    <span className={styles.metricDate}>
                                        {new Date(result.date).toLocaleDateString(
                                            locale === 'cn' ? 'zh-CN' : locale === 'ru' ? 'ru-RU' : 'en-US',
                                            { month: 'short', day: 'numeric' }
                                        )}
                                    </span>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Streak card */}
            <div className={styles.fullWidth}>
                <StreakHeroCardLazy athleteId={athleteId} />
            </div>

            {/* PR Section */}
            <div className={styles.prSection}>
                <div className={styles.prSectionHeader}>
                    <span className={styles.prSectionTitle}>
                        <Trophy size={14} aria-hidden="true" /> {t('personalRecords') ?? 'Personal Records'}
                    </span>
                </div>

                {currentPRs.length === 0 ? (
                    <div className={styles.prEmpty}>
                        <Trophy size={24} />
                        <span>No PRs recorded yet</span>
                    </div>
                ) : (
                    <div className={styles.prList}>
                        {currentPRs.map(pr => (
                            <div key={`${pr.discipline}_${pr.season_type}`} className={styles.prRow}>
                                <div className={styles.prRowInfo}>
                                    <span className={styles.prDiscipline}>{t(`disciplines.${pr.discipline}`) ?? pr.discipline.replace('_', ' ')}</span>
                                    <span className={styles.prMeta}>
                                        {pr.season_type}
                                        {pr.competition_name && ` · ${pr.competition_name}`}
                                        {pr.date && ` (${new Date(pr.date).toLocaleDateString(locale === 'cn' ? 'zh-CN' : locale === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', year: 'numeric' })})`}
                                    </span>
                                </div>
                                <span className={styles.prResult}>{pr.result.toFixed(2)}m</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* PR Timeline Section */}
            {currentPRs.length > 0 && (
                <div className={styles.prTimelineSection}>
                    <PRTimelineChartLazy
                        points={prTimeline}
                        discipline={currentPRs[0].discipline}
                        title={t(`disciplines.${currentPRs[0].discipline}`) ?? currentPRs[0].discipline.replace('_', ' ')}
                        isLoading={loadingTimeline}
                        locale={locale}
                        t={t}
                    />
                </div>
            )}
        </div>
    );
}
