'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/pocketbase/AuthProvider';
import {
    ArrowLeft,
    Calendar,
    Activity,
    Dumbbell,
    BarChart2,
    Heart,
    TrendingUp,
    TrendingDown,
    Minus,
    Trophy,
    Plus,
    Trash2,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { getAthlete, getLatestCheckin, readinessLevel, type AthleteRecord } from '@/lib/pocketbase/services/athletes';
import { calculateReadiness } from '@/lib/readiness/calculator';
import {
    listLatestResults,
    listTestResults,
    testUnit,
    enrichWithDelta,
    ALL_TEST_TYPES,
    type TestResultRecord,
    type TestResultWithDelta,
} from '@/lib/pocketbase/services/testResults';
import { getCurrentPRs, addPersonalRecord, type PersonalRecord } from '@/lib/pocketbase/services/personalRecords';
import { listSeasons, type SeasonWithRelations } from '@/lib/pocketbase/services/seasons';
import { logError } from '@/lib/utils/errors';
import { getInitials, getDisplayName } from '@/lib/utils/nameHelpers';
import { toLocalISODate } from '@/lib/utils/dateHelpers';
import type { TestType, Discipline } from '@/lib/pocketbase/types';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { Skeleton } from '@/components/shared/Skeleton';
import styles from './athleteDetail.module.css';

// ─── Lazy heavy components ─────────────────────────────────────────
const ProgressChartLazy = dynamic(() => import('@/components/analytics/ProgressChart').then(m => ({ default: m.ProgressChart })), {
    loading: () => <Skeleton variant="card" height={300} />,
    ssr: false,
});
const CnsHeatmapLazy = dynamic(() => import('@/components/analytics/CnsHeatmap').then(m => ({ default: m.CnsHeatmap })), {
    loading: () => <Skeleton variant="card" height={300} />,
    ssr: false,
});
const StreakHeroCardLazy = dynamic(
    () => import('@/components/dashboard/StreakHeroCard').then(m => ({ default: m.StreakHeroCard })),
    { loading: () => <Skeleton variant="card" height={160} />, ssr: false }
);
const CoachLogViewerLazy = dynamic(
    () => import('@/components/training/CoachLogViewer').then(m => ({ default: m.CoachLogViewer })),
    { loading: () => <Skeleton variant="card" height={200} />, ssr: false }
);

// ─── Types ─────────────────────────────────────────────────────────
type Tab = 'overview' | 'training' | 'tests' | 'readiness';

const TABS: Tab[] = ['overview', 'training', 'tests', 'readiness'];

/**
 * Extract athlete ID from the URL pathname.
 * useParams() returns 'placeholder' when served via nginx fallback (static export).
 * window.location.pathname always has the real URL: /en/dashboard/athlete/<real-id>
 */
function getAthleteIdFromUrl(): string {
    if (typeof window === 'undefined') return '';
    const segments = window.location.pathname.split('/');
    // URL: /<locale>/dashboard/athlete/<id>
    return segments[segments.length - 1] || '';
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function AthleteDetailPage() {
    const t = useTranslations('athleteDetail');
    const locale = useLocale() as 'ru' | 'en' | 'cn';
    const router = useRouter();
    const { user } = useAuth();
    const isCoach = user?.role === 'coach';
    const athleteId = useMemo(() => getAthleteIdFromUrl(), []);

    const [athlete, setAthlete] = useState<AthleteRecord | null>(null);
    const [readiness, setReadiness] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load base athlete data + readiness
    useEffect(() => {
        if (!athleteId) return;
        const load = async () => {
            setLoading(true);
            try {
                const [a, checkin] = await Promise.all([
                    getAthlete(athleteId),
                    getLatestCheckin(athleteId),
                ]);
                setAthlete(a);
                if (checkin) {
                    const score = calculateReadiness({
                        sleepDuration: checkin.sleep_hours ?? 0,
                        sleepQuality: checkin.sleep_quality ?? 0,
                        soreness: checkin.pain_level ?? 0,
                        mood: checkin.mood ?? 0,
                    });
                    setReadiness(score);
                } else {
                    setReadiness(null);
                }
            } catch (err) {
                logError(err, { component: 'AthleteDetailClient', action: 'loadProfile' });
                setError(t('loadError'));
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [athleteId, t]);

    const age = athlete?.birth_date
        ? new Date().getFullYear() - new Date(athlete.birth_date).getFullYear()
        : null;

    const level = readiness != null ? readinessLevel(readiness) : null;

    if (loading) return (
        <div className={styles.page}>
            <PageWrapper maxWidth="standard">
                {/* Skeleton Hero */}
                <div className={styles.skeletonHero}>
                    <Skeleton variant="circular" width={64} height={64} />
                    <Skeleton variant="text" width={200} height={32} />
                </div>
                {/* Skeleton Tabs */}
                <Skeleton variant="text" width="100%" height={48} style={{ marginBottom: 'var(--space-6)' }} />
                {/* Skeleton Content */}
                <div className={styles.skeletonGrid}>
                    <Skeleton variant="card" height={160} />
                    <Skeleton variant="card" height={160} />
                </div>
            </PageWrapper>
        </div>
    );

    if (error || !athlete) return (
        <div className={styles.page}>
            <PageWrapper maxWidth="standard">
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ArrowLeft size={16} /> {t('back')}
                </button>
                <p className={styles.errorText}>{error ?? t('noData')}</p>
            </PageWrapper>
        </div>
    );

    return (
        <div className={styles.page}>
            <PageWrapper maxWidth="standard">
                {/* Back button */}
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ArrowLeft size={16} /> {t('back')}
                </button>

                {/* ── Hero ─────────────────────────────────────────── */}
                <div className={styles.hero}>
                    <div className={styles.heroAvatar} aria-hidden="true">
                        {getInitials(athlete)}
                    </div>
                    <div className={styles.heroInfo}>
                        <h1 className={styles.heroName}>{getDisplayName(athlete)}</h1>
                        {athlete.primary_discipline && (
                            <span className={styles.disciplineChip}>
                                {t(`disciplines.${athlete.primary_discipline}` as 'disciplines.high_jump' | 'disciplines.long_jump' | 'disciplines.triple_jump') ?? athlete.primary_discipline.replace('_', ' ')}
                            </span>
                        )}
                        <div className={styles.heroMeta}>
                            {age != null && (
                                <span>{age} {t('yearsOld')}</span>
                            )}
                            {athlete.gender && (
                                <span>{athlete.gender === 'male' ? t('male') : t('female')}</span>
                            )}
                            {athlete.height_cm && (
                                <span>{athlete.height_cm} {t('cm')}</span>
                            )}
                        </div>
                        {readiness != null && (
                            <div className={styles.readinessBadge} data-level={level}>
                                <Activity size={14} />
                                <span>{readiness}%</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Tabs ─────────────────────────────────────────── */}
                <div className={styles.tabBar} role="tablist">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            role="tab"
                            aria-selected={activeTab === tab}
                            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            <TabIcon tab={tab} size={15} />
                            <span className={styles.tabLabel}>{t(tab)}</span>
                        </button>
                    ))}
                </div>

                {/* ── Tab Content ──────────────────────────────────── */}
                <div className={styles.tabContent}>
                    {activeTab === 'overview' && (
                        <OverviewTab athleteId={athleteId} readiness={readiness} locale={locale} t={t} isCoach={isCoach} />
                    )}
                    {activeTab === 'training' && (
                        <TrainingTab athleteId={athleteId} locale={locale} t={t} />
                    )}
                    {activeTab === 'tests' && (
                        <TestsTab athleteId={athleteId} locale={locale} t={t} />
                    )}
                    {activeTab === 'readiness' && (
                        <ReadinessTab athleteId={athleteId} locale={locale} t={t} />
                    )}
                </div>
            </PageWrapper>
        </div>
    );
}

// ─── Icon helper ──────────────────────────────────────────────────
function TabIcon({ tab, size }: { tab: Tab; size: number }) {
    switch (tab) {
        case 'overview': return <BarChart2 size={size} />;
        case 'training': return <Dumbbell size={size} />;
        case 'tests': return <TrendingUp size={size} />;
        case 'readiness': return <Heart size={size} />;
    }
}

// ─── Avatar helper — REMOVED (use getInitials from nameHelpers) ──

// ═══════════════════════════════════════════════════════════════════
// ── Overview Tab ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OverviewTab({ athleteId, readiness: _readiness, locale, t, isCoach }: { athleteId: string; readiness: number | null; locale: string; t: any; isCoach: boolean }) {
    const [latestResults, setLatestResults] = useState<Partial<Record<TestType, TestResultRecord>>>({});
    const [loadingResults, setLoadingResults] = useState(true);
    const [currentPRs, setCurrentPRs] = useState<PersonalRecord[]>([]);
    const [showPRForm, setShowPRForm] = useState(false);
    const [prForm, setPrForm] = useState({ discipline: '' as Discipline | '', season_type: 'outdoor' as 'outdoor' | 'indoor', result: '', source: 'competition' as 'competition' | 'training', date: '' });
    const [savingPR, setSavingPR] = useState(false);

    useEffect(() => {
        listLatestResults(athleteId).then(r => {
            setLatestResults(r);
            setLoadingResults(false);
        }).catch(() => setLoadingResults(false));

        getCurrentPRs(athleteId).then(prs => {
            setCurrentPRs(prs);
        }).catch(() => { /* non-critical */ });
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
                    {isCoach && (
                        <button
                            className={styles.prAddBtn}
                            onClick={() => setShowPRForm(v => !v)}
                            aria-label="Add personal record"
                        >
                            <Plus size={14} />
                        </button>
                    )}
                </div>

                {showPRForm && (
                    <div className={styles.prForm}>
                        <div className={styles.prFormRow}>
                            <select
                                className={styles.prSelect}
                                value={prForm.discipline}
                                onChange={e => setPrForm(f => ({ ...f, discipline: e.target.value as Discipline }))}
                            >
                                <option value="">Discipline…</option>
                                <option value="high_jump">High Jump</option>
                                <option value="long_jump">Long Jump</option>
                                <option value="triple_jump">Triple Jump</option>
                            </select>
                            <select
                                className={styles.prSelect}
                                value={prForm.season_type}
                                onChange={e => setPrForm(f => ({ ...f, season_type: e.target.value as 'outdoor' | 'indoor' }))}
                            >
                                <option value="outdoor">Outdoor</option>
                                <option value="indoor">Indoor</option>
                            </select>
                        </div>
                        <div className={styles.prFormRow}>
                            <input
                                className={styles.prInput}
                                type="number"
                                step="0.01"
                                placeholder="Result (m)"
                                value={prForm.result}
                                onChange={e => setPrForm(f => ({ ...f, result: e.target.value }))}
                            />
                            <input
                                className={styles.prInput}
                                type="date"
                                value={prForm.date}
                                onChange={e => setPrForm(f => ({ ...f, date: e.target.value }))}
                            />
                        </div>
                        <button
                            className={styles.prSaveBtn}
                            disabled={!prForm.discipline || !prForm.result || savingPR}
                            onClick={async () => {
                                const result = parseFloat(prForm.result);
                                if (isNaN(result) || result <= 0 || !prForm.discipline) return;
                                setSavingPR(true);
                                try {
                                    const newPR = await addPersonalRecord({
                                        athleteId,
                                        discipline: prForm.discipline as Discipline,
                                        season_type: prForm.season_type,
                                        result,
                                        source: prForm.source,
                                        date: prForm.date || undefined,
                                    });
                                    setCurrentPRs(prev => [newPR, ...prev.filter(p => !(p.discipline === newPR.discipline && p.season_type === newPR.season_type))]);
                                    setShowPRForm(false);
                                    setPrForm({ discipline: '', season_type: 'outdoor', result: '', source: 'competition', date: '' });
                                } catch { /* non-critical */ } finally { setSavingPR(false); }
                            }}
                        >
                            {savingPR ? '…' : 'Save PR'}
                        </button>
                    </div>
                )}

                {currentPRs.length === 0 && !showPRForm ? (
                    <div className={styles.prEmpty}>
                        <Trophy size={24} />
                        <span>No PRs recorded yet</span>
                    </div>
                ) : (
                    <div className={styles.prList}>
                        {currentPRs.map(pr => (
                            <div key={pr.id} className={styles.prRow}>
                                <div className={styles.prRowInfo}>
                                    <span className={styles.prDiscipline}>{pr.discipline.replace('_', ' ')}</span>
                                    <span className={styles.prMeta}>{pr.season_type} · {pr.source}</span>
                                </div>
                                <span className={styles.prResult}>{pr.result.toFixed(2)}m</span>
                                {isCoach && (
                                    <button
                                        className={styles.prDeleteBtn}
                                        onClick={async () => {
                                            if (!window.confirm('Delete this PR?')) return;
                                            try {
                                                const { deletePersonalRecord } = await import('@/lib/pocketbase/services/personalRecords');
                                                await deletePersonalRecord(pr.id);
                                                setCurrentPRs(prev => prev.filter(p => p.id !== pr.id));
                                            } catch { /* non-critical */ }
                                        }}
                                        aria-label="Delete PR"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// ── Training Tab ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TrainingTab({ athleteId, locale, t }: { athleteId: string; locale: string; t: any }) {
    // Inline type for plan vs fact data passed to CoachLogViewerLazy
    type SetEntry = { set: number; reps?: number; weight?: number; time?: number; distance?: number };
    // reps is string in PlanExercisesRecord (e.g. "3x10"), keep as string to match PB type
    type PlanEx = { id: string; exercise_id?: string; day_of_week?: number; session?: number; sets?: number; reps?: string; expand?: { exercise_id?: { id: string; name_en: string } } };
    type LogEx = { id: string; exercise_id: string; sets_data: SetEntry[]; expand?: { exercise_id?: { id: string; name_en: string } } };
    type PlanDataState = { planExercises: PlanEx[]; logExercises: LogEx[]; compliance?: number } | null;

    const [seasons, setSeasons] = useState<SeasonWithRelations[]>([]);
    const [loading, setLoading] = useState(true);
    const [planData, setPlanData] = useState<PlanDataState>(null);
    const [loadingPlan, setLoadingPlan] = useState(true);

    useEffect(() => {
        listSeasons(athleteId).then(s => {
            setSeasons(s);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [athleteId]);

    // Load current plan + latest log for Plan vs Fact
    useEffect(() => {
        let cancelled = false;
        setLoadingPlan(true);
        (async () => {
            try {
                const { getPublishedPlanForToday } = await import('@/lib/pocketbase/services/planResolution');
                const { getLogsForPlan, listLogExercises, calculateWeeklyCompliance } = await import('@/lib/pocketbase/services/logs').then(async (logsM) => {
                    const plansM = await import('@/lib/pocketbase/services/plans');
                    const complianceM = await import('@/lib/pocketbase/services/compliance');
                    return {
                        getLogsForPlan: logsM.getLogsForPlan,
                        listLogExercises: logsM.listLogExercises,
                        calculateWeeklyCompliance: complianceM.calculateWeeklyCompliance,
                        groupByDay: plansM.groupByDay,
                    };
                });

                const plan = await getPublishedPlanForToday(athleteId);
                if (!plan || cancelled) { setLoadingPlan(false); return; }

                const planExercises = (plan.expand?.['plan_exercises(plan_id)'] ?? []).map((ex) => ({
                    id: ex.id,
                    exercise_id: ex.exercise_id,
                    day_of_week: ex.day_of_week,
                    session: ex.session,
                    sets: ex.sets,
                    reps: ex.reps,
                    expand: ex.expand ? { exercise_id: ex.expand.exercise_id ? { id: ex.expand.exercise_id.id, name_en: ex.expand.exercise_id.name_en } : undefined } : undefined,
                }));

                // Load today's log exercises for comparison
                const today = toLocalISODate();
                const logs = await getLogsForPlan(plan.id);
                const todayLog = logs.find((l) => {
                    const d = typeof l.date === 'string' ? l.date.slice(0, 10) : toLocalISODate(new Date(l.date));
                    return d === today;
                });

                const logExercises = todayLog
                    ? (await listLogExercises(todayLog.id)).map((le) => ({
                        id: le.id,
                        exercise_id: le.exercise_id,
                        sets_data: (le.sets_data ?? []).map((s, i) => ({
                            set: typeof s.set === 'number' ? s.set : i,
                            reps: s.reps,
                            weight: s.weight,
                            time: s.time,
                            distance: s.distance,
                        })) as Array<{ set: number; reps?: number; weight?: number; time?: number; distance?: number }>,
                        expand: le.expand?.exercise_id ? { exercise_id: { id: le.expand.exercise_id.id, name_en: le.expand.exercise_id.name_en } } : undefined,
                    }))
                    : [];

                // Weekly compliance — get Monday of current week as weekStart
                const now = new Date();
                const dayOfWeekJS = now.getDay(); // 0=Sun, 1=Mon ... 6=Sat
                const daysFromMon = dayOfWeekJS === 0 ? 6 : dayOfWeekJS - 1;
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - daysFromMon);
                const weekStartISO = toLocalISODate(weekStart);

                const complianceResult = calculateWeeklyCompliance({
                    planExercises: planExercises.map((e) => ({
                        id: e.id,
                        day_of_week: e.day_of_week,
                        session: e.session,
                    })),
                    logs: logs.map((l) => ({
                        id: l.id,
                        date: typeof l.date === 'string' ? l.date : new Date(l.date).toISOString(),
                        session: l.session,
                        plan_id: l.plan_id,
                    })),
                    weekStart: weekStartISO,
                });

                if (!cancelled) {
                    setPlanData({ planExercises, logExercises, compliance: complianceResult.percentage });
                    setLoadingPlan(false);
                }
            } catch (err) {
                logError(err, { component: 'AthleteDetailClient', action: 'loadPlanData' });
                if (!cancelled) setLoadingPlan(false);
            }
        })();
        return () => { cancelled = true; };
    }, [athleteId]);

    const now = new Date();
    const currentSeason = seasons.find(s =>
        new Date(s.start_date) <= now && new Date(s.end_date) >= now
    );
    const pastSeasons = seasons.filter(s => new Date(s.end_date) < now);

    if (loading) return (
        <div className={styles.tabLoading}>
            <div className={styles.skeletonGrid}>
                <Skeleton variant="card" height={120} />
                <Skeleton variant="card" height={120} />
                <Skeleton variant="card" height={120} />
            </div>
        </div>
    );

    if (seasons.length === 0) return (
        <div className={styles.emptyState}>
            <Dumbbell size={40} className={styles.emptyIcon} />
            <p>{t('noSeason')}</p>
        </div>
    );

    return (
        <div className={styles.trainingContent}>
            {/* Plan vs Fact — CoachLogViewer */}
            {!loadingPlan && planData && planData.planExercises.length > 0 && (
                <div className={styles.section}>
                    <CoachLogViewerLazy
                        planExercises={planData.planExercises}
                        logExercises={planData.logExercises}
                        compliance={planData.compliance}
                    />
                </div>
            )}
            {currentSeason && (
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>{t('currentSeason')}</h2>
                    <SeasonSummaryCard season={currentSeason} locale={locale} />
                </div>
            )}
            {pastSeasons.length > 0 && (
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>{t('pastSeasons')}</h2>
                    <div className={styles.seasonsList}>
                        {pastSeasons.map(s => (
                            <SeasonSummaryCard key={s.id} season={s} locale={locale} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function SeasonSummaryCard({ season, locale }: { season: SeasonWithRelations; locale: string }) {
    const phases = season.expand?.['training_phases(season_id)'] ?? [];
    const fmt = (d: string) => new Date(d).toLocaleDateString(
        locale === 'cn' ? 'zh-CN' : locale === 'ru' ? 'ru-RU' : 'en-US',
        { month: 'short', year: 'numeric' }
    );
    return (
        <div className={styles.seasonCard}>
            <div className={styles.seasonCardName}>{season.name}</div>
            <div className={styles.seasonCardDates}>
                <Calendar size={12} />
                {fmt(season.start_date)} — {fmt(season.end_date)}
            </div>
            {phases.length > 0 && (
                <div className={styles.phaseStrip}>
                    {phases.map((p, i) => (
                        <div key={i} className={styles.phaseChip}>{p.phase_type}</div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// ── Tests Tab ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TestsTab({ athleteId, locale, t }: { athleteId: string; locale: string; t: any }) {
    const [selectedType, setSelectedType] = useState<TestType>('standing_jump');
    const [results, setResults] = useState<TestResultWithDelta[]>([]);
    const [loading, setLoading] = useState(false);

    const loadResults = useCallback(async (type: TestType) => {
        setLoading(true);
        try {
            const raw = await listTestResults(athleteId, type);
            setResults(enrichWithDelta(type, raw));
        } catch (err) {
            logError(err, { component: 'AthleteDetailClient', action: 'loadTestResults' });
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

// ═══════════════════════════════════════════════════════════════════
// ── Readiness Tab ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ReadinessTab({ athleteId, locale, t }: { athleteId: string; locale: string; t: any }) {
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
