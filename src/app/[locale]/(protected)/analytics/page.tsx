'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { BarChart2, Plus } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { listMyAthletes } from '@/lib/pocketbase/services/athletes';
import {
    listTestResults,
    enrichWithDelta,
    ALL_TEST_TYPES,
    type TestResultWithDelta,
} from '@/lib/pocketbase/services/testResults';
import { getLoadByCategory, type CategoryLoad } from '@/lib/pocketbase/services/trainingLoad';
import { getReadinessHistory, type ReadinessDay } from '@/lib/pocketbase/services/readinessHistory';
import { listSeasons } from '@/lib/pocketbase/services/seasons';
import type { TestType } from '@/lib/pocketbase/types';
import type { AthleteRecord } from '@/lib/pocketbase/services/athletes';
import { ProgressChart } from '@/components/analytics/ProgressChart';
import { TestResultCard } from '@/components/analytics/TestResultCard';
import { AddTestResultModal } from '@/components/analytics/AddTestResultModal';
import { TrainingLoadPie } from '@/components/analytics/TrainingLoadPie';
import { CnsHeatmap } from '@/components/analytics/CnsHeatmap';
import { AchievementsGrid } from '@/components/analytics/AchievementsGrid';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { logError } from '@/lib/utils/errors';
import styles from './analytics.module.css';

interface SeasonOption {
    id: string;
    name: string;
}

export default function AnalyticsPage() {
    const t = useTranslations('analytics');
    const locale = useLocale();

    // ── State ────────────────────────────────────────────────────
    const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
    const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
    const [activeTestType, setActiveTestType] = useState<TestType>('standing_jump');
    const [results, setResults] = useState<TestResultWithDelta[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [athletesLoading, setAthletesLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    // New: Pie + Heatmap state
    const [seasons, setSeasons] = useState<SeasonOption[]>([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
    const [loadData, setLoadData] = useState<CategoryLoad[]>([]);
    const [loadLoading, setLoadLoading] = useState(false);
    const [readinessData, setReadinessData] = useState<ReadinessDay[]>([]);
    const [readinessLoading, setReadinessLoading] = useState(false);

    const { isAthlete } = useAuth();

    // ── Load athletes + seasons ──────────────────────────────────
    useEffect(() => {
        setAthletesLoading(true);

        if (isAthlete) {
            // Athletes: load own data via getSelfAthleteId
            void (async () => {
                try {
                    const { getSelfAthleteId } = await import('@/lib/pocketbase/services/readiness');
                    const aid = await getSelfAthleteId();
                    setSelectedAthleteId(aid);
                    // Load seasons for this athlete (non-critical)
                    try {
                        const seasonList = await listSeasons(aid);
                        const seasonOpts = seasonList.map((s) => ({ id: s.id, name: s.name }));
                        setSeasons(seasonOpts);
                        if (seasonOpts.length > 0) setSelectedSeasonId(seasonOpts[0].id);
                    } catch { /* non-critical */ }
                } catch (err) {
                    const { logError } = await import('@/lib/utils/errors');
                    logError(err, { component: 'AnalyticsPage', action: 'loadAthleteData' });
                    setError(t('loadError'));
                } finally {
                    setAthletesLoading(false);
                }
            })();
        } else {
            // Coaches: load athlete list + seasons
            Promise.all([listMyAthletes(), listSeasons()])
                .then(([athleteList, seasonList]) => {
                    setAthletes(athleteList);
                    if (athleteList.length > 0) setSelectedAthleteId(athleteList[0].id);

                    const seasonOpts = seasonList.map((s) => ({ id: s.id, name: s.name }));
                    setSeasons(seasonOpts);
                    if (seasonOpts.length > 0) setSelectedSeasonId(seasonOpts[0].id);
                })
                .catch(() => setError(t('loadError')))
                .finally(() => setAthletesLoading(false));
        }
    }, [isAthlete]);

    // ── Load results when athlete or test type changes ────────────
    const loadResults = useCallback(async () => {
        if (!selectedAthleteId) return;
        setIsLoading(true);
        setError('');
        try {
            const raw = await listTestResults(selectedAthleteId, activeTestType);
            setResults(enrichWithDelta(activeTestType, raw));
        } catch (err) {
            logError(err, { component: 'AnalyticsPage', action: 'loadResults' });
            setError(t('loadResultsError'));
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [selectedAthleteId, activeTestType]);

    useEffect(() => {
        void loadResults();
    }, [loadResults]);

    // ── Load training load when season changes ────────────────────
    useEffect(() => {
        if (!selectedSeasonId) return;
        setLoadLoading(true);
        getLoadByCategory(selectedSeasonId)
            .then(setLoadData)
            .catch(() => setLoadData([]))
            .finally(() => setLoadLoading(false));
    }, [selectedSeasonId]);

    // ── Load readiness heatmap when athlete changes ───────────────
    useEffect(() => {
        if (!selectedAthleteId) return;
        setReadinessLoading(true);
        getReadinessHistory(selectedAthleteId, 12)
            .then(setReadinessData)
            .catch(() => setReadinessData([]))
            .finally(() => setReadinessLoading(false));
    }, [selectedAthleteId]);

    // ── Handlers ──────────────────────────────────────────────────
    const handleTestCreated = useCallback(() => {
        setShowAddModal(false);
        void loadResults();
    }, [loadResults]);

    // ── No athletes state (coach only) ────────────────────────────
    if (!isAthlete && !athletesLoading && athletes.length === 0) {
        return (
            <main className={styles.page}>
                <PageWrapper maxWidth="standard">
                    <PageHeader
                        title={t('title')}
                        backHref="/dashboard"
                        className={styles.stickyHeader}
                    />
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>
                            <BarChart2 size={48} aria-hidden="true" />
                        </div>
                        <p className={styles.emptyTitle}>{t('noAthletes')}</p>
                        <Link href="/dashboard">
                            <button type="button" className={styles.addBtn}>
                                <Plus size={16} aria-hidden="true" />
                                {t('goToDashboard')}
                            </button>
                        </Link>
                    </div>
                </PageWrapper>
            </main>
        );
    }

    const lastResult = results.length > 0 ? results[results.length - 1] : null;

    return (
        <main className={styles.page}>
            <PageWrapper maxWidth="standard">
                {/* Header */}
                <PageHeader
                    title={t('title')}
                    className={styles.stickyHeader}
                    actions={(
                        <div className={styles.headerActions}>
                            <NotificationBell
                                labels={{
                                    title: t('notifications.title'),
                                    markAll: t('notifications.markAll'),
                                    empty: t('notifications.empty'),
                                }}
                            />
                            <button
                                type="button"
                                className={styles.addTestBtn}
                                onClick={() => setShowAddModal(true)}
                            >
                                <Plus size={16} aria-hidden="true" />
                                {t('addTest')}
                            </button>
                        </div>
                    )}
                />

                {/* Athlete Selector (coach only) */}
                {!isAthlete && (
                    <div className={styles.selectorWrap}>
                        <label htmlFor="athlete-select" className="sr-only">{t('selectAthlete')}</label>
                        <select
                            id="athlete-select"
                            className={styles.athleteSelect}
                            value={selectedAthleteId}
                            onChange={(e) => setSelectedAthleteId(e.target.value)}
                            disabled={athletesLoading}
                        >
                            {athletes.map((a) => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Test Type Tabs */}
                <div className={styles.tabsWrap}>
                    <div className={styles.tabs} role="tablist" aria-label={t('testResults')}>
                        {ALL_TEST_TYPES.map((type) => (
                            <button
                                key={type}
                                type="button"
                                role="tab"
                                aria-selected={activeTestType === type}
                                className={`${styles.tab} ${activeTestType === type ? styles.tabActive : ''}`}
                                onClick={() => setActiveTestType(type)}
                            >
                                {t(`tests.${type}`)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {error && <div className={styles.errorState}>{error}</div>}

                    {/* Progress Chart */}
                    <ProgressChart
                        results={results}
                        testType={activeTestType}
                        title={t('progress')}
                        isLoading={isLoading}
                        locale={locale}
                        noDataMessage={t('minResults')}
                    />

                    {/* Latest result cards */}
                    {lastResult && (
                        <>
                            <p className={styles.sectionTitle}>{t('testResults')}</p>
                            <div className={styles.resultsGrid}>
                                {results.slice(-6).reverse().map((r) => (
                                    <TestResultCard
                                        key={r.id}
                                        result={r}
                                        testType={activeTestType}
                                        testName={t(`tests.${activeTestType}`)}
                                        pbLabel={t('personalBest')}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {/* Training Load Pie */}
                    <div className={styles.chartSection}>
                        {seasons.length > 0 && (
                            <div className={styles.selectorWrap}>
                                <label htmlFor="season-select" className="sr-only">{t('selectSeason')}</label>
                                <select
                                    id="season-select"
                                    className={styles.athleteSelect}
                                    value={selectedSeasonId}
                                    onChange={(e) => setSelectedSeasonId(e.target.value)}
                                >
                                    {seasons.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <TrainingLoadPie
                            data={loadData}
                            title={t('trainingLoad')}
                            locale={locale}
                            isLoading={loadLoading}
                        />
                    </div>

                    {/* CNS Heatmap */}
                    <CnsHeatmap
                        data={readinessData}
                        title={t('cnsHeatmap')}
                        locale={locale}
                        isLoading={readinessLoading}
                    />

                    {/* Achievements */}
                    {selectedAthleteId && (
                        <AchievementsGrid
                            athleteId={selectedAthleteId}
                            title={t('achievements')}
                            locale={locale}
                        />
                    )}

                    {/* Empty state — no results for this test type */}
                    {!isLoading && results.length === 0 && !error && (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <BarChart2 size={40} aria-hidden="true" />
                            </div>
                            <p className={styles.emptyTitle}>{t('noTestsYet')}</p>
                            <button
                                type="button"
                                className={styles.addBtn}
                                onClick={() => setShowAddModal(true)}
                            >
                                <Plus size={16} aria-hidden="true" />
                                {t('addTest')}
                            </button>
                        </div>
                    )}

                    {/* Add test button (when results exist) */}
                    {results.length > 0 && (
                        <button
                            type="button"
                            className={styles.addBtn}
                            onClick={() => setShowAddModal(true)}
                        >
                            <Plus size={16} aria-hidden="true" />
                            {t('addTest')}
                        </button>
                    )}
                </div>

                {/* Add Test Modal */}
                {showAddModal && selectedAthleteId && (
                    <AddTestResultModal
                        athleteId={selectedAthleteId}
                        defaultTestType={activeTestType}
                        onClose={() => setShowAddModal(false)}
                        onCreated={handleTestCreated}
                    />
                )}
            </PageWrapper>
        </main>
    );
}
