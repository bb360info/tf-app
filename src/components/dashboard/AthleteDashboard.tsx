'use client';

import { useState, useEffect, useCallback, useId, lazy, Suspense } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { CalendarDays, TrendingUp, Trophy, BarChart2, RotateCcw } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getTodayCheckin, getSelfAthleteId } from '@/lib/pocketbase/services/readiness';
import { calculateReadiness } from '@/lib/readiness/calculator';
import { listTestResults, type TestResultRecord } from '@/lib/pocketbase/services/testResults';
import { listSeasons, type SeasonWithRelations, type CompetitionRecord } from '@/lib/pocketbase/services/seasons';
import { getPublishedPlanForToday } from '@/lib/pocketbase/services/logs';
import type { PlanWithExercises } from '@/lib/pocketbase/services/plans';
import { getNextCompetition } from '@/lib/pocketbase/services/peaking';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { EmailVerificationBanner } from '@/components/shared/EmailVerificationBanner';
import { PushPermissionPrompt } from '@/components/notifications/PushPermissionPrompt';
import { Skeleton } from '@/components/shared/Skeleton';
import { ReadinessCheckin } from './ReadinessCheckin';
import { CompetitionCountdown } from './CompetitionCountdown';
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

// ─── Helper: today as YYYY-MM-DD ───────────────────────────────────
function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

// ─── Component ─────────────────────────────────────────────────────
export function AthleteDashboard() {
    const t = useTranslations('athleteDashboard');
    const ta = useTranslations('analytics');
    const tNotif = useTranslations('notifications');
    const locale = useLocale();
    const { user } = useAuth();
    const uid = useId();

    const [athleteId, setAthleteId] = useState<string | null>(null);
    const [checkinDone, setCheckinDone] = useState(false);
    const [lastScore, setLastScore] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showCheckin, setShowCheckin] = useState(false);
    const [jumpResults, setJumpResults] = useState<TestResultRecord[]>([]);
    const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
    const [nextCompetition, setNextCompetition] = useState<CompetitionRecord | null>(null);
    const [todayPlan, setTodayPlan] = useState<PlanWithExercises | null>(null);
    const [planLoading, setPlanLoading] = useState(false);

    // Format today's date for display
    const todayLabel = new Intl.DateTimeFormat(
        locale === 'cn' ? 'zh-CN' : locale === 'ru' ? 'ru-RU' : 'en-US',
        { weekday: 'long', day: 'numeric', month: 'long' }
    ).format(new Date());

    const loadCheckin = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const aid = await getSelfAthleteId();
            setAthleteId(aid);

            // Load today's plan and checkin in parallel
            setPlanLoading(true);
            const [checkin, fetchedPlan] = await Promise.all([
                getTodayCheckin(aid),
                getPublishedPlanForToday(aid),
            ]);
            setTodayPlan(fetchedPlan);
            setPlanLoading(false);

            if (checkin) {
                setCheckinDone(true);
                const score = calculateReadiness({
                    sleepDuration: checkin.sleep_hours ?? 0,
                    sleepQuality: checkin.sleep_quality ?? 0,
                    soreness: checkin.pain_level ?? 0,
                    mood: checkin.mood ?? 0,
                });
                setLastScore(score);
            }

            // Lazy-load analytics after primary data
            if (!analyticsLoaded) {
                try {
                    const results = await listTestResults(aid, 'standing_jump');
                    setJumpResults(results);

                    // Load next competition from the most recent season
                    const seasons = await listSeasons();
                    if (seasons.length > 0) {
                        const comp = getNextCompetition(seasons[0] as SeasonWithRelations);
                        setNextCompetition(comp);
                    }
                } catch {
                    /* non-critical: analytics enrichment */
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

    const handleCheckinSaved = useCallback(() => {
        setShowCheckin(false);
        setCheckinDone(true);
        loadCheckin();
    }, [loadCheckin]);

    const scoreColor =
        lastScore == null ? 'neutral'
            : lastScore >= 70 ? 'green'
                : lastScore >= 45 ? 'yellow'
                    : 'red';

    return (
        <main className={styles.page}>
            {/* ── Hero greeting ── */}
            <header className={styles.hero}>
                <div>
                    <h1 className={styles.welcome}>
                        {t('welcome', { name: user?.name ?? '' })}
                    </h1>
                    <p className={styles.dateLabel}>
                        <CalendarDays size={14} aria-hidden="true" />
                        {todayLabel}
                    </p>
                </div>
                <NotificationBell />
            </header>

            {/* Email verification reminder */}
            <EmailVerificationBanner />

            {/* Push permission prompt */}
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

            {/* ── Readiness Check-in card ── */}
            <section
                className={styles.card}
                aria-labelledby={`${uid}-checkin-title`}
            >
                <div className={styles.cardHeader}>
                    <div>
                        <h2 id={`${uid}-checkin-title`} className={styles.cardTitle}>
                            {t('checkinTitle')}
                        </h2>
                        <p className={styles.cardSubtitle}>
                            {checkinDone ? t('checkinDoneSubtitle') : t('checkinSubtitle')}
                        </p>
                    </div>

                    {checkinDone && lastScore != null && (
                        <div className={styles.scoreBadge} data-color={scoreColor}>
                            <TrendingUp size={14} aria-hidden="true" />
                            {lastScore}%
                        </div>
                    )}
                </div>

                {isLoading ? (
                    <Skeleton variant="card" />
                ) : checkinDone ? (
                    <div className={styles.checkinDone}>
                        <span className={styles.checkinDoneText}>{t('checkinDone')}</span>
                        <button
                            className={styles.reCheckinBtn}
                            onClick={() => { setCheckinDone(false); setShowCheckin(true); }}
                        >
                            <RotateCcw size={14} /> {t('reCheckin')}
                        </button>
                    </div>
                ) : showCheckin && athleteId ? (
                    <ReadinessCheckin
                        athleteId={athleteId}
                        onSaved={handleCheckinSaved}
                    />
                ) : (
                    <button
                        className={styles.checkinBtn}
                        onClick={() => setShowCheckin(true)}
                    >
                        {t('checkinBtn')}
                    </button>
                )}
            </section>

            {/* ── Stats mini-cards ── */}

            {/* ── Streak Hero Card (lazy) ── */}
            {athleteId && checkinDone && (
                <Suspense fallback={<Skeleton variant="card" />}>
                    <StreakHeroCard athleteId={athleteId} />
                </Suspense>
            )}

            {/* ── Competition Countdown ── */}
            {nextCompetition && (
                <CompetitionCountdown competition={nextCompetition} />
            )}

            {/* ── Stats mini-cards ── */}
            {lastScore != null && (
                <section
                    className={styles.statsBar}
                    aria-labelledby={`${uid}-stats-title`}
                >
                    <h2 id={`${uid}-stats-title`} className={styles.statsTitle}>
                        <Trophy size={16} aria-hidden="true" />
                        {t('statsTitle')}
                    </h2>
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div
                                className={styles.statValue}
                                data-color={scoreColor}
                            >
                                {lastScore}%
                            </div>
                            <div className={styles.statLabel}>{t('lastScore')}</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue} data-color="neutral">
                                {todayISO()}
                            </div>
                            <div className={styles.statLabel}>{t('todayDate', { date: '' }).trim()}</div>
                        </div>
                    </div>
                </section>
            )}

            {/* ── Today's plan card ── */}
            <section
                className={styles.card}
                aria-labelledby={`${uid}-plan-title`}
            >
                <div className={styles.cardHeader}>
                    <h2 id={`${uid}-plan-title`} className={styles.cardTitle}>
                        {t('todayPlan')}
                    </h2>
                </div>
                {planLoading ? (
                    <p className={styles.emptyPlan}>...</p>
                ) : todayPlan ? (
                    <div className={styles.todayPlanContent}>
                        <p className={styles.todayPlanName}>{todayPlan.name || t('todayPlan')}</p>
                        <p className={styles.todayPlanMeta}>
                            {(todayPlan.expand?.['plan_exercises(plan_id)'] ?? []).length} {t('todayExercises')}
                        </p>
                    </div>
                ) : (
                    <p className={styles.emptyPlan}>{t('noPublishedPlan')}</p>
                )}
            </section>

            {/* ── Progress Chart (lazy) ── */}
            {athleteId && analyticsLoaded && (
                <section
                    className={styles.card}
                    aria-labelledby={`${uid}-chart-title`}
                >
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
            )}

            {/* ── Achievements (lazy) ── */}
            {athleteId && analyticsLoaded && (
                <section
                    className={styles.achievementsSection}
                    aria-labelledby={`${uid}-achievements-title`}
                >
                    <Suspense fallback={<Skeleton variant="card" height={200} />}>
                        <AchievementsGrid
                            athleteId={athleteId}
                            title={t('achievementsTitle')}
                            locale={locale}
                        />
                    </Suspense>
                </section>
            )}
        </main>
    );
}
