'use client';

import { useState, useEffect, useCallback, useId, lazy, Suspense } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { CalendarDays, BarChart2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { getTodayCheckin } from '@/lib/pocketbase/services/readiness';
import { getSelfAthleteProfile } from '@/lib/pocketbase/services/athletes';
import { calculateReadiness } from '@/lib/readiness/calculator';
import { listTestResults, type TestResultRecord } from '@/lib/pocketbase/services/testResults';
import { listSeasonsForAthlete, type SeasonWithRelations, type CompetitionRecord } from '@/lib/pocketbase/services/seasons';
import { getPublishedPlanForToday } from '@/lib/pocketbase/services/planResolution';
import { getWeeklyVolumeDelta, listWeekLogs, mapLogsToWeekStatus, type DayStatus } from '@/lib/pocketbase/services/logs';
import { getPRProjection } from '@/lib/pocketbase/services/prProjection';
import { todayForUser, getWeekStart } from '@/lib/utils/dateHelpers';
import type { PlanWithExercises } from '@/lib/pocketbase/services/plans';
import { getNextCompetition } from '@/lib/pocketbase/services/peaking';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { EmailVerificationBanner } from '@/components/shared/EmailVerificationBanner';
import { PushPermissionPrompt } from '@/components/notifications/PushPermissionPrompt';
import { Skeleton } from '@/components/shared/Skeleton';
import { DashboardErrorBoundary } from '@/components/shared/DashboardErrorBoundary';
import { usePullToRefresh } from '@/lib/hooks/usePullToRefresh';

import { ScoreCard } from './athlete/ScoreCard';
import { TodayWorkoutCard } from './athlete/TodayWorkoutCard';
import { StatsStrip } from './athlete/StatsStrip';
import { WeeklyHeatmap } from './athlete/WeeklyHeatmap';
import { RecentNotifications } from './athlete/RecentNotifications';
import { HistoricalOnboardingWidget } from './HistoricalOnboardingWidget';

import { CompetitionCountdown } from './CompetitionCountdown';
import { ReadinessCheckin } from './ReadinessCheckin';
import styles from './AthleteDashboard.module.css';

// ─── Lazy-load heavy analytics components ──────────────────────────
const ProgressChart = lazy(() =>
    import('@/components/analytics/ProgressChart').then((m) => ({ default: m.ProgressChart }))
);
const AchievementsGrid = lazy(() =>
    import('@/components/analytics/AchievementsGrid').then((m) => ({ default: m.AchievementsGrid }))
);
const StreakHeroCard = lazy(() =>
    import('./StreakHeroCard').then((m) => ({ default: m.StreakHeroCard }))
);

// ─── Component ─────────────────────────────────────────────────────
export function AthleteDashboard() {
    const t = useTranslations('athleteDashboard');
    const ta = useTranslations('analytics');
    const tNotif = useTranslations('notifications');
    const locale = useLocale();
    const { user } = useAuth();
    const uid = useId();

    const [athleteId, setAthleteId] = useState<string | null>(null);
    const [lastScore, setLastScore] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [jumpResults, setJumpResults] = useState<TestResultRecord[]>([]);
    const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
    const [nextCompetition, setNextCompetition] = useState<CompetitionRecord | null>(null);
    const [todayPlan, setTodayPlan] = useState<PlanWithExercises | null>(null);
    const [volumeData, setVolumeData] = useState<{ current: number, previous: number, delta: number } | null>(null);
    const [weekStatus, setWeekStatus] = useState<DayStatus[]>([]);
    const [prValue, setPrValue] = useState<number | null>(null);
    const [primaryDiscipline, setPrimaryDiscipline] = useState<string | null>(null);
    const [showCheckinForm, setShowCheckinForm] = useState(false);
    const [profileMissing, setProfileMissing] = useState(false);

    const todayLabel = new Intl.DateTimeFormat(
        locale === 'cn' ? 'zh-CN' : locale === 'ru' ? 'ru-RU' : 'en-US',
        { weekday: 'long', day: 'numeric', month: 'long' }
    ).format(new Date());

    const loadCheckin = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        setProfileMissing(false);
        try {
            const profile = await getSelfAthleteProfile();
            if (!profile) {
                if (user.role === 'athlete') {
                    setProfileMissing(true);
                }
                setAthleteId(null);
                setLastScore(null);
                setTodayPlan(null);
                setVolumeData(null);
                setWeekStatus([]);
                setPrValue(null);
                setPrimaryDiscipline(null);
                return;
            }

            const aid = profile.id;
            setAthleteId(aid);
            if (profile.primary_discipline) {
                setPrimaryDiscipline(profile.primary_discipline.replace('_', ' '));
            }

            const [checkin, fetchedPlan, volume] = await Promise.all([
                getTodayCheckin(aid),
                getPublishedPlanForToday(aid),
                getWeeklyVolumeDelta(aid, getWeekStart()),
            ]);
            setTodayPlan(fetchedPlan);
            setVolumeData(volume);

            // WeekStatus — fire & forget, не блокирует render
            listWeekLogs(aid, getWeekStart()).then((logs) => {
                setWeekStatus(mapLogsToWeekStatus(logs, getWeekStart(), todayForUser()));
            }).catch(() => { /* non-critical */ });

            // PR — fire & forget
            getPRProjection(aid).then((prs) => {
                if (prs.length > 0) setPrValue(prs[0].result ?? null);
            }).catch(() => { /* non-critical */ });

            if (checkin) {
                const score = calculateReadiness({
                    sleepDuration: checkin.sleep_hours ?? 0,
                    sleepQuality: checkin.sleep_quality ?? 0,
                    soreness: checkin.pain_level ?? 0,
                    mood: checkin.mood ?? 0,
                });
                setLastScore(score);
            } else {
                setLastScore(null);
            }

            if (!analyticsLoaded) {
                try {
                    const results = await listTestResults(aid, 'standing_jump');
                    setJumpResults(results);

                    const seasons = await listSeasonsForAthlete(aid);
                    if (seasons.length > 0) {
                        const comp = getNextCompetition(seasons[0] as SeasonWithRelations);
                        setNextCompetition(comp);
                    }
                } catch {
                    /* non-critical */
                } finally {
                    setAnalyticsLoaded(true);
                }
            }
        } catch (e) {
            console.warn('[AthleteDashboard] loadCheckin error:', e);
        } finally {
            setIsLoading(false);
        }
    }, [user, analyticsLoaded]);

    useEffect(() => {
        loadCheckin();
    }, [loadCheckin]);

    const { pullState, pullStyle, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh(loadCheckin);

    const volPct = volumeData && volumeData.previous > 0
        ? `${volumeData.delta > 0 ? '+' : ''}${Math.round((volumeData.delta / volumeData.previous) * 100)}%`
        : '\u2014';
    const stats = [
        { label: t('setsThisWeek'), value: volumeData?.current ?? '\u2014' },
        { label: t('vsLastWeek'), value: volPct },
        { label: t('myPR'), value: prValue !== null ? `${prValue}m` : '\u2014' },
    ];

    const handleCheckinSaved = useCallback(() => {
        setShowCheckinForm(false);
        void loadCheckin();
    }, [loadCheckin]);

    if (isLoading && !athleteId) {
        return (
            <main className={styles.page}>
                <Skeleton variant="card" height={200} />
            </main>
        );
    }

    if (!isLoading && user?.role === 'athlete' && profileMissing) {
        return (
            <main className={styles.page}>
                <section className={styles.profileMissingCard} aria-live="polite">
                    <h2 className={styles.profileMissingTitle}>{t('profileMissingTitle')}</h2>
                    <p className={styles.profileMissingText}>{t('profileMissingText')}</p>
                    <div className={styles.profileMissingActions}>
                        <Link href="/join" className={styles.profileMissingBtnPrimary}>
                            {t('profileMissingJoinCta')}
                        </Link>
                        <Link href="/settings/groups" className={styles.profileMissingBtnSecondary}>
                            {t('profileMissingGroupsCta')}
                        </Link>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main
            className={styles.page}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <div style={pullStyle}>
                {pullState === 'pulling' && <div style={{ textAlign: 'center', padding: '16px', color: 'var(--color-text-tertiary)' }}>{t('pullToRefresh')}</div>}
                {pullState === 'refreshing' && <div style={{ textAlign: 'center', padding: '16px', color: 'var(--color-accent-primary)' }}>{t('refreshing')}</div>}

                {/* Hero */}
                <header className={styles.hero}>
                    <div>
                        <h1 className={styles.welcome}>
                            {t('welcome', { name: user?.name ?? '' })}
                        </h1>
                        {primaryDiscipline && (
                            <span className={styles.disciplineBadge}>{primaryDiscipline}</span>
                        )}
                        <p className={styles.dateLabel}>
                            <CalendarDays size={14} aria-hidden="true" />
                            {todayLabel}
                        </p>
                    </div>
                    <NotificationBell />
                </header>

                <EmailVerificationBanner />

                {user?.id && (
                    <PushPermissionPrompt
                        userId={user.id}
                        labels={{
                            notifTitle: tNotif('pushTitle'),
                            notifText: tNotif('pushText'),
                            allow: tNotif('allow'),
                            dismiss: tNotif('dismiss'),
                            iosTitle: tNotif('iosTitle'),
                            iosStep1: tNotif('iosStep1'),
                            iosStep2: tNotif('iosStep2'),
                            iosStep3: tNotif('iosStep3'),
                        }}
                    />
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                    <Link href="/competitions" className={styles.competitionsEntry}>
                        <div>
                            <p className={styles.competitionsTitle}>{t('competitionsCtaTitle')}</p>
                            <p className={styles.competitionsDesc}>{t('competitionsCtaDesc')}</p>
                        </div>
                        <span className={styles.competitionsAction}>{t('competitionsCtaAction')}</span>
                    </Link>

                    {athleteId && (
                        <DashboardErrorBoundary>
                            <section className={styles.card} aria-labelledby={`${uid}-checkin-title`}>
                                <div className={styles.cardHeader}>
                                    <div>
                                        <h2 id={`${uid}-checkin-title`} className={styles.cardTitle}>
                                            {t('checkinTitle')}
                                        </h2>
                                        <p className={styles.cardSubtitle}>
                                            {lastScore !== null ? t('checkinDoneSubtitle') : t('checkinSubtitle')}
                                        </p>
                                    </div>
                                </div>

                                {showCheckinForm ? (
                                    <ReadinessCheckin athleteId={athleteId} onSaved={handleCheckinSaved} />
                                ) : lastScore !== null ? (
                                    <div className={styles.checkinDone}>
                                        <span className={styles.checkinDoneText}>{t('checkinDone')}</span>
                                        <button
                                            type="button"
                                            className={styles.reCheckinBtn}
                                            onClick={() => setShowCheckinForm(true)}
                                        >
                                            {t('reCheckin')}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        className={styles.checkinBtn}
                                        onClick={() => setShowCheckinForm(true)}
                                    >
                                        {t('checkinBtn')}
                                    </button>
                                )}
                            </section>
                        </DashboardErrorBoundary>
                    )}

                    <DashboardErrorBoundary>
                        <ScoreCard score={lastScore} />
                    </DashboardErrorBoundary>

                    <DashboardErrorBoundary>
                        <StatsStrip stats={stats} />
                    </DashboardErrorBoundary>

                    {athleteId && prValue === null && !isLoading && (
                        <DashboardErrorBoundary>
                            <HistoricalOnboardingWidget />
                        </DashboardErrorBoundary>
                    )}

                    <DashboardErrorBoundary>
                        <TodayWorkoutCard plan={todayPlan} />
                    </DashboardErrorBoundary>

                    <DashboardErrorBoundary>
                        {weekStatus.length > 0 && (
                            <WeeklyHeatmap weekLogs={weekStatus} />
                        )}
                    </DashboardErrorBoundary>

                    <DashboardErrorBoundary>
                        <RecentNotifications />
                    </DashboardErrorBoundary>

                    {athleteId && lastScore !== null && (
                        <DashboardErrorBoundary>
                            <Suspense fallback={<Skeleton variant="card" />}>
                                <StreakHeroCard athleteId={athleteId} />
                            </Suspense>
                        </DashboardErrorBoundary>
                    )}

                    {nextCompetition && (
                        <DashboardErrorBoundary>
                            <CompetitionCountdown competition={nextCompetition} />
                        </DashboardErrorBoundary>
                    )}

                    {athleteId && analyticsLoaded && (
                        <DashboardErrorBoundary>
                            <section className={styles.card} aria-labelledby={`${uid}-chart-title`}>
                                <div className={styles.cardHeader}>
                                    <h2 id={`${uid}-chart-title`} className={styles.cardTitle}>
                                        <BarChart2 size={16} aria-hidden="true" className={styles.chartIcon} />
                                        {t('progressTitle')}
                                    </h2>
                                </div>
                                <Suspense fallback={<Skeleton variant="card" height={300} />}>
                                    <ProgressChart
                                        results={jumpResults}
                                        testType="standing_jump"
                                        title={t('jumpChartTitle')}
                                        locale={locale}
                                        noDataMessage={ta('minResults')}
                                    />
                                </Suspense>
                            </section>
                        </DashboardErrorBoundary>
                    )}

                    {athleteId && analyticsLoaded && (
                        <DashboardErrorBoundary>
                            <section className={styles.achievementsSection} aria-labelledby={`${uid}-achievements-title`}>
                                <Suspense fallback={<Skeleton variant="card" height={200} />}>
                                    <AchievementsGrid
                                        athleteId={athleteId}
                                        title={t('achievementsTitle')}
                                        locale={locale}
                                    />
                                </Suspense>
                            </section>
                        </DashboardErrorBoundary>
                    )}
                </div>
            </div>
        </main>
    );
}
