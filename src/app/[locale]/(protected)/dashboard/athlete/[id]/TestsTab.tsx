'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import dynamic from 'next/dynamic';
import {
    listTestResults,
    testUnit,
    enrichWithDelta,
    ALL_TEST_TYPES,
    type TestResultRecord,
    type TestResultWithDelta,
} from '@/lib/pocketbase/services/testResults';
import { logError } from '@/lib/utils/errors';
import type { TestType } from '@/lib/pocketbase/types';
import { Skeleton } from '@/components/shared/Skeleton';
import styles from './athleteDetail.module.css';

const ProgressChartLazy = dynamic(
    () => import('@/components/analytics/ProgressChart').then(m => ({ default: m.ProgressChart })),
    { loading: () => <Skeleton variant="card" height={300} />, ssr: false }
);

type TFn = ReturnType<typeof useTranslations<'athleteDetail'>>;

export function TestsTab({ athleteId, locale, t }: {
    athleteId: string;
    locale: string;
    t: TFn;
}) {
    const [selectedType, setSelectedType] = useState<TestType>('standing_jump');
    const [results, setResults] = useState<TestResultWithDelta[]>([]);
    const [loading, setLoading] = useState(false);

    const loadResults = useCallback(async (type: TestType) => {
        setLoading(true);
        try {
            const raw = await listTestResults(athleteId, type);
            setResults(enrichWithDelta(type, raw));
        } catch (err) {
            logError(err, { component: 'TestsTab', action: 'loadTestResults' });
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [athleteId]);

    useEffect(() => {
        loadResults(selectedType);
    }, [selectedType, loadResults]);

    return (
        <div className={styles.testsContent}>
            {/* Type selector */}
            <div className={styles.typeSelector}>
                {ALL_TEST_TYPES.map(type => (
                    <button
                        key={type}
                        className={`${styles.typeBtn} ${selectedType === type ? styles.typeBtnActive : ''}`}
                        onClick={() => setSelectedType(type)}
                    >
                        {t(`testType.${type}`)}
                        <span className={styles.typeUnit}>{testUnit(type)}</span>
                    </button>
                ))}
            </div>

            {/* Chart */}
            {loading ? (
                <div className={styles.chartPlaceholder} />
            ) : results.length === 0 ? (
                <div className={styles.emptyState}>
                    <TrendingUp size={36} className={styles.emptyIcon} />
                    <p>{t('noData')}</p>
                </div>
            ) : (
                <>
                    <div className={styles.chartWrapper}>
                        <ProgressChartLazy
                            results={results as TestResultRecord[]}
                            testType={selectedType}
                            locale={locale as 'ru' | 'en' | 'cn'}
                            title={t(`testType.${selectedType}`)}
                        />
                    </div>

                    {/* Delta chips — last 5 */}
                    <div className={styles.deltaList}>
                        {[...results].reverse().slice(0, 5).map((r, i) => (
                            <div key={i} className={styles.deltaRow}>
                                <span className={styles.deltaDate}>
                                    {new Date(r.date).toLocaleDateString(
                                        locale === 'cn' ? 'zh-CN' : locale === 'ru' ? 'ru-RU' : 'en-US',
                                        { month: 'short', day: 'numeric' }
                                    )}
                                </span>
                                <span className={styles.deltaValue}>
                                    {r.value} {testUnit(selectedType)}
                                    {r.isPB && <span className={styles.pbBadge}>PB</span>}
                                </span>
                                {r.delta != null && r.delta !== 0 && (
                                    <span
                                        className={styles.deltaChip}
                                        data-positive={r.delta > 0 ? 'true' : 'false'}
                                    >
                                        {r.delta > 0
                                            ? <TrendingUp size={12} />
                                            : <TrendingDown size={12} />}
                                        {r.delta > 0 ? '+' : ''}{r.delta.toFixed(1)}
                                    </span>
                                )}
                                {r.delta === 0 && <span className={styles.deltaChipFlat}><Minus size={12} /></span>}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
