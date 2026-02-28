'use client';

/**
 * AthleteTrainingView — Overview Mode (Phase 2).
 * State machine: mode (overview/focus/post_quick/post_full) + selectedDay.
 * Shows DayTabNav + single-day exercise list + FAB buttons.
 */

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
    ListX,
    ChevronDown,
    ChevronUp,
    Sun,
    Moon,
    ChevronLeft,
    ChevronRight,
    Wind,
    MessageSquare,
    AlertTriangle,
    Play,
    CheckCheck,
    PenLine,
    Calendar,
} from 'lucide-react';
import {
    listTodayLogs,
    listWeekLogs,
    batchSaveLogExercises,
    getOrCreateLog,
} from '@/lib/pocketbase/services/logs';
import { getPublishedPlanForToday, applyAdjustments } from '@/lib/pocketbase/services/planResolution';
import type { TrainingLogWithRelations } from '@/lib/pocketbase/services/logs';
import type { PlanWithExercises, PlanExerciseWithExpand } from '@/lib/pocketbase/services/plans';
import type { Language } from '@/lib/pocketbase/types';
import { useAuth } from '@/lib/hooks/useAuth';
import { groupByDayAndSession } from '@/lib/pocketbase/services/plans';
import { toLocalISODate } from '@/lib/utils/dateHelpers';
import { AthleteContextBanner } from './AthleteContextBanner';
import { DayTabNav } from './DayTabNav';
import type { DayTabData } from './DayTabNav';
import { ExerciseListItem } from './cards/ExerciseListItem';
import type { SeasonWithRelations } from '@/lib/pocketbase/services/seasons';
import { getActiveSeasonForAthlete } from '@/lib/pocketbase/services/seasons';
import styles from './AthleteTrainingView.module.css';
import dynamic from 'next/dynamic';

// FocusCard loaded dynamically (fullscreen overlay)
const FocusCard = dynamic(
    () => import('./cards/FocusCard').then((m) => ({ default: m.FocusCard })),
    { ssr: false }
);

// PostWorkoutSheet loaded dynamically (portal-based BottomSheet)
const PostWorkoutSheet = dynamic(
    () => import('./cards/PostWorkoutSheet').then((m) => ({ default: m.PostWorkoutSheet })),
    { ssr: false }
);

// QuickEditView loaded dynamically (fullscreen overlay)
const QuickEditView = dynamic(
    () => import('./cards/QuickEditView').then((m) => ({ default: m.QuickEditView })),
    { ssr: false }
);

// Skeleton loading components
const DayTabNavSkeleton = dynamic(
    () => import('./DayTabNavSkeleton').then((m) => ({ default: m.DayTabNavSkeleton })),
    { ssr: false }
);
const ExerciseListSkeleton = dynamic(
    () => import('./cards/ExerciseListSkeleton').then((m) => ({ default: m.ExerciseListSkeleton })),
    { ssr: false }
);

// ─── Types ────────────────────────────────────────────────────

type ViewMode = 'overview' | 'focus' | 'post_quick' | 'post_quick_edit' | 'post_full';

// ─── Helpers ─────────────────────────────────────────────────

function getExerciseName(ex: PlanExerciseWithExpand, locale: Language): string {
    const base = ex.expand?.exercise_id;
    if (!base) {
        if (locale === 'ru') return ex.custom_text_ru ?? ex.exercise_id ?? '';
        if (locale === 'cn') return ex.custom_text_cn ?? ex.custom_text_en ?? ex.exercise_id ?? '';
        return ex.custom_text_en ?? ex.exercise_id ?? '';
    }
    switch (locale) {
        case 'ru': return base.name_ru || base.name_en;
        case 'cn': return base.name_cn || base.name_en;
        default: return base.name_en;
    }
}

function todayDayIndex(): number {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
}

function getWeekStart(offsetWeeks = 0): Date {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    monday.setDate(now.getDate() - daysSinceMonday + offsetWeeks * 7);
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function getDayDate(weekStart: Date, dayOfWeek: number): Date {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + dayOfWeek);
    return d;
}

// 2-char RU labels for DayTabNav
const DAY_LABELS_2 = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
// 1-char RU labels for DayTabNav (<375px)
const DAY_LABELS_1 = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'];

// ─── Adaptation Banner ────────────────────────────────────────

function AdaptationBanner({ t }: { t: ReturnType<typeof useTranslations> }) {
    return (
        <div className={styles.adaptationBanner} role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <p>{t('adaptationBanner')}</p>
        </div>
    );
}

// ─── Warmup Item ──────────────────────────────────────────────

function WarmupItem({ planEx, locale }: { planEx: PlanExerciseWithExpand; locale: Language; }) {
    const name = getExerciseName(planEx, locale);
    const durationSec = planEx.duration_seconds ?? (planEx.duration ? Math.round(planEx.duration) : null);
    return (
        <li className={styles.warmupItem}>
            <Wind size={16} className={styles.warmupItemIcon} aria-hidden="true" />
            <span className={styles.warmupItemName}>{name}</span>
            {durationSec ? <span className={styles.warmupItemDur}>{durationSec}s</span> : null}
        </li>
    );
}

// ─── Warmup Badge (collapsible) ───────────────────────────────

function WarmupBadge({
    items, locale, t,
}: { items: PlanExerciseWithExpand[]; locale: Language; t: ReturnType<typeof useTranslations>; }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className={styles.warmupBadge}>
            <button
                type="button"
                className={styles.warmupBadgeHeader}
                onClick={() => setExpanded((e) => !e)}
                aria-expanded={expanded}
            >
                <Wind size={16} className={styles.warmupBadgeIcon} aria-hidden="true" />
                <span className={styles.warmupBadgeTitle}>{t('warmupBlock')}</span>
                <span className={styles.warmupBadgeCount}>({items.length})</span>
                <span className={styles.warmupBadgeChevron}>
                    {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                </span>
            </button>
            {expanded && (
                <ul className={styles.warmupList} aria-label={t('warmupBlock')}>
                    {items.map((item) => <WarmupItem key={item.id} planEx={item} locale={locale} />)}
                </ul>
            )}
        </div>
    );
}

// ─── Day Overview Panel ───────────────────────────────────────

function DayOverviewPanel({
    date,
    exercisesBySession,
    logs,
    locale,
    isToday,
    isPast,
    t,
    dayNote,
    readinessScore,
    weekLogMap,
    onStartWorkout,
    onPostFactum,
    onEdit,
}: {
    dayOfWeek?: number;
    date: Date;
    exercisesBySession: Record<number, PlanExerciseWithExpand[]>;
    logs: TrainingLogWithRelations[];
    locale: Language;
    isToday: boolean;
    isPast: boolean;
    t: ReturnType<typeof useTranslations>;
    dayNote?: string;
    readinessScore?: number;
    weekLogMap: Map<string, TrainingLogWithRelations>;
    onStartWorkout: () => void;
    onPostFactum: () => void;
    onEdit: () => void;
}) {
    const sessions = Object.keys(exercisesBySession).map(Number).filter((s) => (exercisesBySession[s]?.length ?? 0) > 0);
    const hasLogs = logs.length > 0;

    const formattedDate = date.toLocaleDateString(locale === 'en' ? 'en-US' : 'ru-RU', {
        weekday: 'short', day: 'numeric', month: 'short',
    });

    const logKey = (d: Date, session: number) => `${toLocalISODate(d)}_${session}`;
    const loggedSessions = sessions.filter((s) => weekLogMap.has(logKey(date, s)));

    return (
        <div className={styles.dayPanel}>
            {/* Day header */}
            <div className={`${styles.dayPanelHeader} ${isToday ? styles.dayPanelHeaderToday : ''}`}>
                <div className={styles.dayPanelHeaderLeft}>
                    <span className={styles.dayPanelName}>{formattedDate}</span>
                    {isToday && <span className={styles.todayBadge}>{t('today' as Parameters<typeof t>[0])}</span>}
                </div>
                <span className={styles.progressChip}>
                    {loggedSessions.length}/{sessions.length}
                </span>
            </div>

            {/* Readiness / adaptation */}
            {isToday && readinessScore !== undefined && readinessScore < 60 && readinessScore > 0 && (
                <AdaptationBanner t={t} />
            )}

            {/* Coach day note */}
            {dayNote && (
                <div className={styles.coachNote}>
                    <MessageSquare size={16} className={styles.coachNoteIcon} aria-hidden="true" />
                    <p className={styles.coachNoteText}>{dayNote}</p>
                </div>
            )}

            {/* Sessions */}
            {sessions.map((session) => {
                const sessionExercises = exercisesBySession[session] ?? [];
                const warmupItems = sessionExercises.filter((e) => e.block === 'warmup');
                const mainItems = sessionExercises.filter((e) => e.block !== 'warmup');
                const SessionIcon = session === 0 ? Sun : Moon;
                const sessionLabel = session === 0 ? t('sessionAM') : t('sessionPM');
                const sessionLogged = weekLogMap.has(logKey(date, session));

                return (
                    <div key={session} className={styles.sessionBlock}>
                        {sessions.length > 1 && (
                            <div className={`${styles.sessionHeader} ${session === 1 ? styles.sessionHeaderPM : ''}`}>
                                <SessionIcon size={12} />
                                <span>{sessionLabel}</span>
                            </div>
                        )}

                        {/* Warmup */}
                        {warmupItems.length > 0 && (
                            <div className={styles.warmupWrap}>
                                <WarmupBadge items={warmupItems} locale={locale} t={t} />
                            </div>
                        )}

                        {/* Main exercises: compact ExerciseListItem rows */}
                        {mainItems.length > 0 && (
                            <ul className={styles.overviewList} aria-label="Упражнения">
                                {mainItems.map((ex) => (
                                    <ExerciseListItem
                                        key={ex.id}
                                        planEx={ex}
                                        locale={locale}
                                        isLogged={sessionLogged}
                                    />
                                ))}
                            </ul>
                        )}
                    </div>
                );
            })}

            {/* Action buttons */}
            <div className={styles.dayActions}>
                {/* FAB: Start workout — visible for today/future days */}
                {!isPast && (
                    <button
                        type="button"
                        className={styles.fab}
                        onClick={onStartWorkout}
                    >
                        <Play size={18} aria-hidden="true" />
                        {t('startWorkout' as Parameters<typeof t>[0])}
                    </button>
                )}

                {/* Post-factum — visible only for today without live log */}
                {isToday && !hasLogs && (
                    <button
                        type="button"
                        className={styles.fabSecondary}
                        onClick={onPostFactum}
                    >
                        <CheckCheck size={16} aria-hidden="true" />
                        {t('logPostFactum' as Parameters<typeof t>[0])}
                    </button>
                )}

                {/* Edit — for logged past days */}
                {isPast && hasLogs && (
                    <button
                        type="button"
                        className={styles.fabSecondary}
                        onClick={onEdit}
                    >
                        <PenLine size={16} aria-hidden="true" />
                        {t('editLog' as Parameters<typeof t>[0])}
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Rest Day Panel ───────────────────────────────────────────

function RestDayPanel({ t }: { t: ReturnType<typeof useTranslations> }) {
    return (
        <div className={styles.restDayPanel}>
            <Moon size={32} className={styles.restDayIcon} aria-hidden="true" />
            <span className={styles.restDayLabel}>{t('restDay' as Parameters<typeof t>[0])}</span>
        </div>
    );
}

// ─── Standalone Plan Banner [GAP-1] ──────────────────────────

function StandaloneBanner({ plan, locale }: { plan: PlanWithExercises; locale: Language; }) {
    const t = useTranslations('training');
    const startDate = (plan as Record<string, unknown>).start_date as string | undefined;
    const endDate = (plan as Record<string, unknown>).end_date as string | undefined;
    const formatOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const localeStr = locale === 'en' ? 'en-US' : 'ru-RU';
    const range = startDate && endDate
        ? `${new Date(startDate).toLocaleDateString(localeStr, formatOpts)} – ${new Date(endDate).toLocaleDateString(localeStr, formatOpts)}`
        : '';

    return (
        <div className={styles.standaloneBanner}>
            <Calendar size={14} aria-hidden="true" />
            <span>{t('standalonePlan' as Parameters<typeof t>[0])}{range ? ` · ${range}` : ''}</span>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────

type AthleteTrainingViewProps = Record<string, never>;

export function AthleteTrainingView(_props: AthleteTrainingViewProps = {}) {
    const t = useTranslations('training');
    const locale = useLocale() as Language;
    const { user } = useAuth();

    // ── State ──────────────────────────────────────────────────
    const [plan, setPlan] = useState<PlanWithExercises | null>(null);
    const [todayLogs, setTodayLogs] = useState<TrainingLogWithRelations[]>([]);
    const [weekLogs, setWeekLogs] = useState<TrainingLogWithRelations[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [weekOffset, setWeekOffset] = useState(0);
    const [athleteId, setAthleteId] = useState<string | null>(null);
    const [todayReadiness, setTodayReadiness] = useState<number | undefined>(undefined);
    const [activeSeason, setActiveSeason] = useState<SeasonWithRelations | null>(null);

    // ── Phase 2: State machine ─────────────────────────────────
    const todayIdx = todayDayIndex();
    const [_mode, setMode] = useState<ViewMode>('overview');
    const [selectedDay, setSelectedDay] = useState<number>(todayIdx);

    // ── Phase 3: Focus Mode ────────────────────────────────────
    // Persist focusIndex in sessionStorage so page reload resumes at same exercise
    const FOCUS_INDEX_KEY = `focus_index_${athleteId ?? 'me'}`;
    const [focusIndex, setFocusIndex] = useState<number>(() => {
        if (typeof window === 'undefined') return 0;
        const stored = sessionStorage.getItem(FOCUS_INDEX_KEY);
        return stored ? parseInt(stored, 10) : 0;
    });
    const [focusLogId, setFocusLogId] = useState<string>('');

    // ── Phase 4: Post-Workout Mode ─────────────────────────────
    const [postLogId, setPostLogId] = useState<string>('');

    // Update sessionStorage when focusIndex changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem(FOCUS_INDEX_KEY, String(focusIndex));
        }
    }, [focusIndex, FOCUS_INDEX_KEY]);

    const weekStart = getWeekStart(weekOffset);

    // ── Data loading ───────────────────────────────────────────
    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        setIsLoading(true);
        setError('');

        (async () => {
            try {
                const { getSelfAthleteId } = await import('@/lib/pocketbase/services/readiness');
                let aid: string;
                try {
                    aid = await getSelfAthleteId();
                    if (!cancelled) setAthleteId(aid);
                } catch (err) {
                    const { logError } = await import('@/lib/utils/errors');
                    logError(err, { component: 'AthleteTrainingView', action: 'getSelfAthleteId' });
                    if (!cancelled) setIsLoading(false);
                    return;
                }

                const [fetchedPlan, fetchedTodayLogs, season] = await Promise.all([
                    getPublishedPlanForToday(aid),
                    listTodayLogs(aid),
                    getActiveSeasonForAthlete(aid),
                ]);

                if (cancelled) return;

                if (fetchedPlan) {
                    const rawExercises = (fetchedPlan.expand?.['plan_exercises(plan_id)'] ?? []) as PlanExerciseWithExpand[];
                    const adjusted = await applyAdjustments(rawExercises, aid);
                    const planWithAdjusted: PlanWithExercises = {
                        ...fetchedPlan,
                        expand: { ...fetchedPlan.expand, 'plan_exercises(plan_id)': adjusted },
                    };
                    setPlan(planWithAdjusted);
                } else {
                    setPlan(null);
                }
                setTodayLogs(fetchedTodayLogs);
                setActiveSeason(season);
            } catch (e: unknown) {
                if (cancelled) return;
                const status = (e as { status?: number })?.status;
                if (status !== 400 && status !== 404) {
                    console.error('[AthleteTrainingView]', e);
                    setError(String(e));
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [user?.id]);

    // Week logs
    const weekStartISO = toLocalISODate(weekStart);
    useEffect(() => {
        if (!athleteId || !plan) return;
        let cancelled = false;
        listWeekLogs(athleteId, weekStartISO).then((logs) => {
            if (!cancelled) setWeekLogs(logs);
        }).catch(() => { /* ignore */ });
        return () => { cancelled = true; };
    }, [athleteId, plan, weekStartISO]);


    // Readiness
    useEffect(() => {
        if (!athleteId) return;
        let cancelled = false;
        import('@/lib/pocketbase/services/readinessHistory').then(({ getLatestReadinessForGroup }) =>
            getLatestReadinessForGroup([athleteId])
        ).then(([res]) => {
            if (!cancelled && res) setTodayReadiness(res.score);
        }).catch(() => { });
        return () => { cancelled = true; };
    }, [athleteId]);

    // ── Loading / error / empty states ─────────────────────────
    if (isLoading) {
        return (
            <div className={styles.loadingState}>
                <DayTabNavSkeleton />
                <ExerciseListSkeleton count={4} />
            </div>
        );
    }

    if (error) {
        return <div className={styles.errorState}><p>{error}</p></div>;
    }

    if (!plan) {
        return (
            <div className={styles.emptyState}>
                <ListX size={48} strokeWidth={1.5} className={styles.emptyIcon} aria-hidden="true" />
                <p className={styles.emptyTitle}>{t('noPublishedPlan' as Parameters<typeof t>[0])}</p>
                <p className={styles.emptyHint}>{t('coachIsPreparingPlan' as Parameters<typeof t>[0])}</p>
            </div>
        );
    }

    // ── Data preparation ───────────────────────────────────────
    const allExercises = plan.expand?.['plan_exercises(plan_id)'] ?? [];
    const byDayAndSession = groupByDayAndSession(allExercises);
    const isStandalone = (plan as Record<string, unknown>).plan_type === 'standalone';

    // Build weekLogMap
    const logKey = (date: Date, session: number) => `${toLocalISODate(date)}_${session}`;
    const weekLogMap = new Map<string, TrainingLogWithRelations>();
    for (const log of weekLogs) {
        const dateStr = typeof log.date === 'string'
            ? log.date.slice(0, 10)
            : toLocalISODate(new Date(log.date));
        weekLogMap.set(`${dateStr}_${log.session ?? 0}`, log);
    }
    for (const log of todayLogs) {
        weekLogMap.set(logKey(new Date(), log.session ?? 0), log);
    }

    // Build tab data for DayTabNav
    const tabDays: DayTabData[] = Array.from({ length: 7 }, (_, d) => {
        const date = getDayDate(weekStart, d);
        const sessionsMap = byDayAndSession[d] ?? {};
        const hasSessions = Object.values(sessionsMap).some((s) => s.length > 0);
        const sessions = Object.keys(sessionsMap).map(Number);
        const loggedCount = sessions.filter((s) => weekLogMap.has(logKey(date, s))).length;
        const isThisWeekToday = weekOffset === 0 && d === todayIdx;
        const isPastDay = weekOffset < 0 || (weekOffset === 0 && d < todayIdx);

        return {
            dayIdx: d,
            label2: DAY_LABELS_2[d],
            label1: DAY_LABELS_1[d],
            isToday: isThisWeekToday,
            isPast: isPastDay,
            isRest: !hasSessions,
            hasLog: loggedCount >= sessions.length && sessions.length > 0,
            loggedCount,
            totalSessions: sessions.length,
        };
    });

    // Selected day data
    const selectedDate = getDayDate(weekStart, selectedDay);
    const isSelectedToday = weekOffset === 0 && selectedDay === todayIdx;
    const isSelectedPast = weekOffset < 0 || (weekOffset === 0 && selectedDay < todayIdx);
    const selectedSessionsMap = byDayAndSession[selectedDay] ?? {};
    const selectedHasSessions = Object.values(selectedSessionsMap).some((s) => (s as PlanExerciseWithExpand[]).length > 0);
    const selectedLogs: TrainingLogWithRelations[] = Object.keys(selectedSessionsMap).map((s) =>
        weekLogMap.get(logKey(selectedDate, Number(s)))
    ).filter(Boolean) as TrainingLogWithRelations[];

    const weekLabel = `${weekStart.toLocaleDateString(locale === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short' })} – ${getDayDate(weekStart, 6).toLocaleDateString(locale === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    // ── Focus Mode helpers ─────────────────────────────────
    // Flat list of non-warmup exercises for the selected day
    const selectedFocusExercises: PlanExerciseWithExpand[] = Object.values(
        selectedSessionsMap as Record<number, PlanExerciseWithExpand[]>
    ).flat().filter((pe) => pe.block !== 'warmup');

    const handleStartFocus = async () => {
        if (!athleteId || !plan) return;
        try {
            const log = await getOrCreateLog(athleteId, plan.id, toLocalISODate(selectedDate), 0, 'live');
            setFocusLogId(log.id);
            setFocusIndex(0);
            setMode('focus');
        } catch (e) {
            console.error('[AthleteTrainingView] handleStartFocus failed', e);
        }
    };

    const handleFocusSkip = (reason: string, exerciseId?: string) => {
        console.log('[Focus] Skip:', reason, exerciseId);
        // Advance to next exercise after skip
        setFocusIndex((i) => Math.min(i + 1, selectedFocusExercises.length - 1));
    };

    const handleFocusClose = () => {
        // Clear sessionStorage on manual close
        if (typeof window !== 'undefined') sessionStorage.removeItem(FOCUS_INDEX_KEY);
        setFocusIndex(0);
        setMode('overview');
    };

    // ── Phase 4 handlers ───────────────────────────────────────

    /** Open post-factum sheet: get or create a log for this day, then show PostWorkoutSheet */
    const handleOpenPostFactum = async () => {
        if (!athleteId || !plan) return;
        try {
            const log = await getOrCreateLog(athleteId, plan.id, toLocalISODate(selectedDate), 0, 'post_express');
            setPostLogId(log.id);
            setFocusIndex(0);
            setMode('post_quick');
        } catch (e) {
            console.error('[AthleteTrainingView] handleOpenPostFactum failed', e);
        }
    };

    /** Express: batch-write plan values as actual log for all non-custom exercises */
    const handleExpressLog = async () => {
        if (!postLogId || selectedFocusExercises.length === 0) return;
        try {
            const entries = selectedFocusExercises
                .filter((ex) => ex.exercise_id)
                .map((ex) => {
                    const setsCount = ex.sets ?? 1;
                    const reps = parseInt(ex.reps || '8', 10) || 8;
                    const weight = ex.weight ?? 0;
                    const setsData = Array.from({ length: setsCount }, (_, i) => ({
                        set: i + 1,
                        reps,
                        weight,
                        time: ex.duration ?? 0,
                        distance: ex.distance ?? 0,
                    }));
                    return { exerciseId: ex.exercise_id!, setsData };
                });
            if (entries.length > 0) {
                await batchSaveLogExercises(postLogId, entries);
            }
            setMode('overview');
        } catch (e) {
            console.error('[AthleteTrainingView] handleExpressLog failed', e);
        }
    };

    /** Open Full Review (FocusCard without media) for editing an existing log */
    const handleOpenEdit = () => {
        const existingLog = weekLogMap.get(logKey(selectedDate, 0));
        if (existingLog) {
            setPostLogId(existingLog.id);
        }
        setFocusIndex(0);
        setMode('post_full');
    };

    // ── Render ─────────────────────────────────────────────────
    return (
        <div className={styles.root}>
            {/* Focus Mode: fullscreen overlay */}
            {_mode === 'focus' && selectedFocusExercises.length > 0 && athleteId && (
                <FocusCard
                    planEx={selectedFocusExercises[Math.min(focusIndex, selectedFocusExercises.length - 1)]}
                    locale={locale}
                    logId={focusLogId}
                    athleteId={athleteId}
                    index={focusIndex}
                    total={selectedFocusExercises.length}
                    onNext={() => setFocusIndex((i) => {
                        const next = Math.min(i + 1, selectedFocusExercises.length - 1);
                        if (next === i) handleFocusClose(); // Last exercise done
                        return next;
                    })}
                    onPrev={() => setFocusIndex((i) => Math.max(i - 1, 0))}
                    onClose={handleFocusClose}
                    onSkip={handleFocusSkip}
                />
            )}

            {/* Post-Workout Sheet: mode selector */}
            {_mode === 'post_quick' && (
                <PostWorkoutSheet
                    isOpen
                    onClose={() => setMode('overview')}
                    onExpress={handleExpressLog}
                    onQuickEdit={() => setMode('post_quick_edit')}
                    onFullReview={() => setMode('post_full')}
                />
            )}

            {/* Quick Edit: toggle-based logging */}
            {_mode === 'post_quick_edit' && selectedFocusExercises.length > 0 && athleteId && (
                <QuickEditView
                    exercises={selectedFocusExercises}
                    logId={postLogId}
                    athleteId={athleteId}
                    locale={locale}
                    onDone={() => setMode('overview')}
                    onClose={() => setMode('post_quick')}
                />
            )}

            {/* Full Review: FocusCard without media/notes */}
            {_mode === 'post_full' && selectedFocusExercises.length > 0 && athleteId && (
                <FocusCard
                    planEx={selectedFocusExercises[Math.min(focusIndex, selectedFocusExercises.length - 1)]}
                    locale={locale}
                    logId={postLogId}
                    athleteId={athleteId}
                    index={focusIndex}
                    total={selectedFocusExercises.length}
                    reviewMode
                    onNext={() => setFocusIndex((i) => {
                        const next = Math.min(i + 1, selectedFocusExercises.length - 1);
                        if (next === i) setMode('overview'); // all done
                        return next;
                    })}
                    onPrev={() => setFocusIndex((i) => Math.max(i - 1, 0))}
                    onClose={() => setMode('overview')}
                    onSkip={handleFocusSkip}
                />
            )}

            {/* Context banner: season OR standalone */}
            {activeSeason && !isLoading && (
                <AthleteContextBanner season={activeSeason} today={new Date()} />
            )}
            {!activeSeason && !isLoading && plan && (
                <StandaloneBanner plan={plan} locale={locale} />
            )}

            {/* Week navigation — hidden for standalone plans [GAP-4] */}
            {!isStandalone && (
                <div className={styles.weekNav}>
                    <button
                        className={styles.weekNavBtn}
                        onClick={() => setWeekOffset((o) => o - 1)}
                        aria-label="Previous week"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className={styles.weekLabel}>{weekLabel}</span>
                    <button
                        className={styles.weekNavBtn}
                        onClick={() => setWeekOffset((o) => o + 1)}
                        disabled={weekOffset >= 0}
                        aria-label="Next week"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}

            {/* DayTabNav */}
            <DayTabNav
                days={tabDays}
                selectedDay={selectedDay}
                onSelect={setSelectedDay}
            />

            {/* Selected day content */}
            <div className={styles.dayViewContainer}>
                {selectedHasSessions && athleteId ? (
                    <DayOverviewPanel
                        date={selectedDate}
                        exercisesBySession={selectedSessionsMap as Record<number, PlanExerciseWithExpand[]>}
                        logs={selectedLogs}
                        locale={locale}
                        isToday={isSelectedToday}
                        isPast={isSelectedPast}
                        t={t}
                        dayNote={(plan.day_notes as Record<string, string> | undefined)?.[String(selectedDay)] || undefined}
                        readinessScore={isSelectedToday ? todayReadiness : undefined}
                        weekLogMap={weekLogMap}
                        onStartWorkout={handleStartFocus}
                        onPostFactum={handleOpenPostFactum}
                        onEdit={handleOpenEdit}
                    />
                ) : (
                    <RestDayPanel t={t} />
                )}
            </div>
        </div>
    );
}
