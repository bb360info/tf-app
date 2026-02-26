'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/shared/Skeleton';
import styles from './athleteDetail.module.css';

const CnsHeatmapLazy = dynamic(() => import('@/components/analytics/CnsHeatmap').then(m => ({ default: m.CnsHeatmap })), {
    loading: () => <Skeleton variant="card" height={300} />,
    ssr: false,
});

type TFn = ReturnType<typeof useTranslations<'athleteDetail'>>;

export function ReadinessTab({ athleteId, locale, t }: {
    athleteId: string;
    locale: string;
    t: TFn;
}) {
    const [historyData, setHistoryData] = useState<{ date: string; score: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        import('@/lib/pocketbase/services/readinessHistory').then(({ getReadinessHistory }) => {
            getReadinessHistory(athleteId, 4).then(data => {
                setHistoryData(data);
                setLoading(false);
            }).catch(() => setLoading(false));
        });
    }, [athleteId]);

    if (loading) return (
        <div className={styles.tabLoading}>
            <div className={styles.skeletonStack}>
                <Skeleton variant="rectangular" height={80} style={{ borderRadius: 'var(--radius-lg)' }} />
                <Skeleton variant="rectangular" height={80} style={{ borderRadius: 'var(--radius-lg)' }} />
                <Skeleton variant="rectangular" height={80} style={{ borderRadius: 'var(--radius-lg)' }} />
            </div>
        </div>
    );

    if (historyData.length === 0) return (
        <div className={styles.emptyState}>
            <Heart size={36} className={styles.emptyIcon} />
            <p>{t('noData')}</p>
        </div>
    );

    const avgScore = Math.round(historyData.reduce((s, d) => s + d.score, 0) / historyData.length);

    return (
        <div className={styles.readinessContent}>
            <div className={styles.avgScoreCard}>
                <span className={styles.avgScoreLabel}>{t('avgReadiness')}</span>
                <span className={styles.avgScoreValue}>{avgScore}%</span>
            </div>
            <div className={styles.heatmapWrapper}>
                <CnsHeatmapLazy
                    data={historyData}
                    title={t('readiness')}
                    locale={locale}
                    weeks={4}
                />
            </div>
        </div>
    );
}
