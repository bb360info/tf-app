'use client';

/**
 * AthleteTrainingView — 7-day week view for athletes.
 * Shows 7 days (scroll + highlight today), AM/PM session grouping.
 * Athlete can log performance for each session.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'lucide-react';
import {
    createTrainingLog,
    listTodayLogs,
    listWeekLogs,
} from '@/lib/pocketbase/services/logs';
import { getPublishedPlanForToday, applyAdjustments } from '@/lib/pocketbase/services/planResolution';
import type { TrainingLogWithRelations } from '@/lib/pocketbase/services/logs';
import type { PlanWithExercises, PlanExerciseWithExpand } from '@/lib/pocketbase/services/plans';
import type { Language } from '@/lib/pocketbase/types';
import { useAuth } from '@/lib/hooks/useAuth';
import { groupByDayAndSession } from '@/lib/pocketbase/services/plans';
import { toLocalISODate } from '@/lib/utils/dateHelpers';
import { ExerciseItem } from './cards/ExerciseItem';
import { AthleteContextBanner } from './AthleteContextBanner';
import type { SeasonWithRelations } from '@/lib/pocketbase/services/seasons';
import { getActiveSeasonForAthlete } from '@/lib/pocketbase/services/seasons';
import styles from './AthleteTrainingView.module.css';


// ─── Helpers ─────────────────────────────────────────────────

function getExerciseName(ex: PlanExerciseWithExpand, locale: Language): string {
    const base = ex.expand?.exercise_id;
    if (!base) {
        // Fallback for warmup custom text items
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
    const day = new Date().getDay(); // 0=Sun, 1=Mon...
    return day === 0 ? 6 : day - 1; // convert to 0=Mon
}

function getWeekStart(offsetWeeks = 0): Date {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    // Adjust to Monday (getDay: 0=Sun, 1=Mon,...,6=Sat)
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

const RPE_COLORS = [
    '', '#22c55e', '#4ade80', '#86efac', '#fde047',
    '#facc15', '#fb923c', '#f97316', '#ef4444', '#dc2626', '#991b1b',
];

const DAY_KEYS = ['day_mon', 'day_tue', 'day_wed', 'day_thu', 'day_fri', 'day_sat', 'day_sun'] as const;

// ─── Skip Reasons ─────────────────────────────────────────────────

const SKIP_REASONS = ['Equipment', 'Pain', 'Time', 'CoachDecision', 'Other'] as const;
type SkipReason = typeof SKIP_REASONS[number];

// ─── Adaptation Banner ────────────────────────────────────────────

function AdaptationBanner({ t }: { t: ReturnType<typeof useTranslations> }) {
    return (
        <div className={styles.adaptationBanner} role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <p>{t('adaptationBanner')}</p>
        </div>
    );
}

// ─── Exercise Item ────────────────────────────────────────────────


// ─── Warmup Item (no RPE/Sets UI) ────────────────────────────────

function WarmupItem({
    planEx,
    locale,
}: {
    planEx: PlanExerciseWithExpand;
    locale: Language;
}) {
    const name = getExerciseName(planEx, locale);
    const durationSec = planEx.duration_seconds ?? (planEx.duration ? Math.round(planEx.duration) : null);

    return (
        <li className={styles.warmupItem}>
            <Wind size={10} className={styles.warmupItemIcon} aria-hidden="true" />
            <span className={styles.warmupItemName}>{name}</span>
            {durationSec ? (
                <span className={styles.warmupItemDur}>{durationSec}s</span>
            ) : null}
        </li>
    );
}

// ─── Warmup Badge (collapsible) ───────────────────────────────────

function WarmupBadge({
    items,
    locale,
    t,
}: {
    items: PlanExerciseWithExpand[];
    locale: Language;
    t: ReturnType<typeof useTranslations>;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={styles.warmupBadge}>
            <button
                type="button"
                className={styles.warmupBadgeHeader}
                onClick={() => setExpanded((e) => !e)}
                aria-expanded={expanded}
            >
                <Wind size={13} className={styles.warmupBadgeIcon} aria-hidden="true" />
                <span className={styles.warmupBadgeTitle}>{t('warmupBlock')}</span>
                <span className={styles.warmupBadgeCount}>({items.length})</span>
                <span className={styles.warmupBadgeChevron}>
                    {expanded
                        ? <ChevronUp size={14} aria-hidden="true" />
                        : <ChevronDown size={14} aria-hidden="true" />}
                </span>
            </button>

            {expanded && (
                <ul className={styles.warmupList} aria-label={t('warmupBlock')}>
                    {items.map((item) => (
                        <WarmupItem key={item.id} planEx={item} locale={locale} />
                    ))}
                </ul>
            )}
        </div>
    );
}


// ─── Rest Day Card ───────────────────────────────────────────────

function RestDayCard({
    dayOfWeek,
    date,
    isToday,
    isPast,
    locale,
    t,
}: {
    dayOfWeek: number;
    date: Date;
    isToday: boolean;
    isPast: boolean;
    locale: Language;
    t: ReturnType<typeof useTranslations>;
}) {
    const formattedDate = date.toLocaleDateString(locale === 'en' ? 'en-US' : 'ru-RU', {
        day: 'numeric', month: 'short',
    });
    return (
        <div className={`${styles.dayCard} ${styles.dayCardRest} ${isToday ? styles.dayCardToday : ''} ${isPast ? styles.dayCardPast : ''}`}>
            <div className={styles.dayCardHeader}>
                <span className={styles.dayCardName}>{t(DAY_KEYS[dayOfWeek])}</span>
                <span className={styles.dayCardDate}>{formattedDate}</span>
                {isToday && <span className={styles.todayBadge}>{t('today' as Parameters<typeof t>[0])}</span>}
            </div>
            <div className={styles.restDayBody}>
                <Moon size={20} className={styles.restDayIcon} aria-hidden="true" />
                <span className={styles.restDayLabel}>{t('restDay' as Parameters<typeof t>[0])}</span>
            </div>
        </div>
    );
}

// ─── Day Card ─────────────────────────────────────────────────────

function DayCard({
    dayOfWeek,
    date,
    exercisesBySession,
    logs,
    plan,
    athleteId,
    locale,
    isToday,
    isPast,
    loggedCount,
    t,
    dayNote,
    readinessScore,
}: {
    dayOfWeek: number;
    date: Date;
    exercisesBySession: Record<number, PlanExerciseWithExpand[]>;
    logs: TrainingLogWithRelations[];
    plan: PlanWithExercises;
    athleteId: string;
    locale: Language;
    isToday: boolean;
    isPast: boolean;
    loggedCount: number;
    t: ReturnType<typeof useTranslations>;
    dayNote?: string;
    readinessScore?: number;
}) {
    const sessions = Object.keys(exercisesBySession).map(Number).filter((s) => (exercisesBySession[s]?.length ?? 0) > 0);
    if (sessions.length === 0) return null;

    const dateStr = toLocalISODate(date);
    const formattedDate = date.toLocaleDateString(locale === 'en' ? 'en-US' : 'ru-RU', {
        day: 'numeric', month: 'short',
    });

    const getLogForSession = (session: number) =>
        logs.find((l) => (l.session ?? 0) === session) ?? null;

    const ensureLog = async (session: number) => {
        const existing = getLogForSession(session);
        if (existing) return existing;
        return createTrainingLog({ athlete_id: athleteId, plan_id: plan.id, date: dateStr, session });
    };

    return (
        <div className={`${styles.dayCard} ${isToday ? styles.dayCardToday : ''} ${isPast ? styles.dayCardPast : ''}`}>
            <div className={styles.dayCardHeader}>
                <span className={styles.dayCardName}>{t(DAY_KEYS[dayOfWeek])}</span>
                <span className={styles.dayCardDate}>{formattedDate}</span>
                {loggedCount > 0 && (
                    <span className={styles.progressChip}>
                        {Math.min(loggedCount, sessions.length)}/{sessions.length}
                    </span>
                )}
                {isToday && <span className={styles.todayBadge}>{t('today' as Parameters<typeof t>[0])}</span>}
            </div>

            {/* Coach day note banner */}
            {dayNote && (
                <div className={styles.coachNote}>
                    <MessageSquare size={11} className={styles.coachNoteIcon} aria-hidden="true" />
                    <p className={styles.coachNoteText}>{dayNote}</p>
                </div>
            )}

            {sessions.map((session) => {
                const sessionExercises = exercisesBySession[session] ?? [];
                const log = getLogForSession(session);
                const SessionIcon = session === 0 ? Sun : Moon;
                const sessionLabel = session === 0 ? t('sessionAM') : t('sessionPM');

                return (
                    <div key={session} className={styles.sessionBlock}>
                        {sessions.length > 1 && (
                            <div className={`${styles.sessionHeader} ${session === 1 ? styles.sessionHeaderPM : ''}`}>
                                <SessionIcon size={12} />
                                <span>{sessionLabel}</span>
                            </div>
                        )}
                        <LoggableSession
                            exercises={sessionExercises}
                            log={log}
                            ensureLog={() => ensureLog(session)}
                            locale={locale}
                            t={t}
                            readinessScore={isToday ? readinessScore : undefined}
                            athleteId={athleteId}
                        />
                    </div>
                );
            })}
        </div>
    );
}


// ─── Loggable Session ─────────────────────────────────────────────

function LoggableSession({
    exercises,
    log,
    ensureLog,
    locale,
    t,
    readinessScore,
    athleteId,
}: {
    exercises: PlanExerciseWithExpand[];
    log: TrainingLogWithRelations | null;
    ensureLog: () => Promise<TrainingLogWithRelations>;
    locale: Language;
    t: ReturnType<typeof useTranslations>;
    readinessScore?: number;
    athleteId: string;
}) {
    const [currentLog, setCurrentLog] = useState<TrainingLogWithRelations | null>(log);
    const [initializing, setInitializing] = useState(false);
    const [notes, setNotes] = useState(log?.notes ?? '');
    const [savingNotes, setSavingNotes] = useState(false);
    const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleFirstSave = useCallback(async () => {
        if (currentLog) return currentLog;
        setInitializing(true);
        try {
            const newLog = await ensureLog();
            setCurrentLog(newLog);
            return newLog;
        } finally {
            setInitializing(false);
        }
    }, [currentLog, ensureLog]);

    const handleNotesChange = useCallback((value: string) => {
        setNotes(value);
        if (!currentLog) return;
        if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
        setSavingNotes(true);
        notesTimerRef.current = setTimeout(async () => {
            try {
                const { updateTrainingLog } = await import('@/lib/pocketbase/services/logs');
                await updateTrainingLog(currentLog.id, { notes: value });
            } catch (e) {
                console.error('[AthleteTrainingView] save notes:', e);
            } finally {
                setSavingNotes(false);
            }
        }, 500);
    }, [currentLog]);

    // Cleanup debounce timer on unmount
    useEffect(() => () => {
        if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    }, []);

    // Split exercises into warmup and main
    const warmupItems = exercises.filter((e) => e.block === 'warmup');
    const mainItems = exercises.filter((e) => e.block !== 'warmup');

    return (
        <>
            {/* Adaptation Banner: low readiness alert */}
            {readinessScore !== undefined && readinessScore < 60 && readinessScore > 0 && (
                <AdaptationBanner t={t} />
            )}

            {/* Warmup badge (collapsible, no template name shown to athlete) */}
            {warmupItems.length > 0 && (
                <WarmupBadge items={warmupItems} locale={locale} t={t} />
            )}

            {/* Main exercises */}
            <ul className={styles.exerciseList} aria-label="Exercises">
                {mainItems.map((ex) => (
                    <ExerciseItem
                        key={ex.id}
                        planEx={ex}
                        locale={locale}
                        logId={currentLog?.id ?? ''}
                        athleteId={athleteId}
                        t={t}
                    />
                ))}
                {!currentLog && !initializing && mainItems.length > 0 && (
                    <button className={styles.startLogBtn} onClick={handleFirstSave}>
                        {t('log.record')}
                    </button>
                )}
            </ul>

            {/* Athlete Notes with debounced autosave */}
            <div className={styles.notesWrap}>
                <label className={styles.notesLabel}>
                    <MessageSquare size={13} aria-hidden="true" />
                    {savingNotes ? t('saving') : t('athleteNotePlaceholder').replace('...', '')}
                </label>
                <textarea
                    className={styles.notesTextarea}
                    placeholder={t('athleteNotePlaceholder')}
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    disabled={!currentLog}
                    rows={2}
                    maxLength={1000}
                />
            </div>
        </>
    );
}


// ─── Main Component ───────────────────────────────────────────────

 
type AthleteTrainingViewProps = Record<string, never>;

export function AthleteTrainingView(_props: AthleteTrainingViewProps = {}) {
    const t = useTranslations('training');
    const locale = useLocale() as Language;
    const { user } = useAuth();

    const [plan, setPlan] = useState<PlanWithExercises | null>(null);
    const [todayLogs, setTodayLogs] = useState<TrainingLogWithRelations[]>([]);
    const [weekLogs, setWeekLogs] = useState<TrainingLogWithRelations[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [weekOffset, setWeekOffset] = useState(0);
    const [athleteId, setAthleteId] = useState<string | null>(null);
    const [todayReadiness, setTodayReadiness] = useState<number | undefined>(undefined);
    const [activeSeason, setActiveSeason] = useState<SeasonWithRelations | null>(null);


    const todayIdx = todayDayIndex();
    const weekStart = getWeekStart(weekOffset);
    const scrollRef = useRef<HTMLDivElement>(null);

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
                    if (!cancelled) {
                        setAthleteId(aid);
                    }
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

                // [Track 4.263] Apply exercise_adjustments: skip filtered + fields overridden
                if (fetchedPlan) {
                    const rawExercises = (fetchedPlan.expand?.['plan_exercises(plan_id)'] ?? []) as PlanExerciseWithExpand[];
                    const adjusted = await applyAdjustments(rawExercises, aid);
                    const planWithAdjusted: PlanWithExercises = {
                        ...fetchedPlan,
                        expand: {
                            ...fetchedPlan.expand,
                            'plan_exercises(plan_id)': adjusted,
                        },
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

    // Load week logs when weekOffset or athleteId changes
    useEffect(() => {
        if (!athleteId || !plan) return;
        let cancelled = false;
        const weekStartISO = toLocalISODate(weekStart);
        listWeekLogs(athleteId, weekStartISO).then((logs) => {
            if (!cancelled) setWeekLogs(logs);
        }).catch(() => {/* ignore */ });
        return () => { cancelled = true; };
    }, [athleteId, plan, weekStart.toISOString()]);

    // Load today's readiness score for adaptation banner
    useEffect(() => {
        if (!athleteId) return;
        let cancelled = false;
        import('@/lib/pocketbase/services/readinessHistory').then(({ getLatestReadinessForGroup }) =>
            getLatestReadinessForGroup([athleteId])
        ).then(([res]) => {
            if (!cancelled && res) setTodayReadiness(res.score);
        }).catch(() => {/* no checkin today — banner stays hidden */ });
        return () => { cancelled = true; };
    }, [athleteId]);


    // Scroll to today on mount
    useEffect(() => {
        if (scrollRef.current) {
            const todayCard = scrollRef.current.querySelector('[data-today="true"]');
            if (todayCard) {
                todayCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }
    }, [plan]);

    if (isLoading) {
        return (
            <div className={styles.loadingState}>
                <div className={styles.spinner} aria-label={t('readiness')} />
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

    const allExercises = plan.expand?.['plan_exercises(plan_id)'] ?? [];
    const byDayAndSession = groupByDayAndSession(allExercises);

    // All 7 days — always render, rest days show RestDayCard
    const allDays = Array.from({ length: 7 }, (_, d) => d);
    const hasAnyExercises = allExercises.length > 0;

    // Week-level log map: date+session → log
    const logKey = (date: Date, session: number) =>
        `${toLocalISODate(date)}_${session}`;

    const weekLogMap = new Map<string, TrainingLogWithRelations>();
    for (const log of weekLogs) {
        const dateStr = typeof log.date === 'string'
            ? log.date.slice(0, 10)
            : toLocalISODate(new Date(log.date));
        weekLogMap.set(`${dateStr}_${log.session ?? 0}`, log);
    }
    // Also include today's logs
    for (const log of todayLogs) {
        weekLogMap.set(logKey(new Date(), log.session ?? 0), log);
    }

    const weekLabel = `${weekStart.toLocaleDateString(locale === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short' })} – ${getDayDate(weekStart, 6).toLocaleDateString(locale === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    return (
        <div className={styles.root}>
            {/* Athlete Context Banner — season timeline, phase, nearest competition */}
            {activeSeason && !isLoading && (
                <AthleteContextBanner
                    season={activeSeason}
                    today={new Date()}
                />
            )}

            {/* Week navigation */}
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

            {/* 7-day scroll — always render all 7 days */}
            <div className={styles.weekScroll} ref={scrollRef}>
                {!hasAnyExercises ? (
                    <div className={styles.emptyState}>
                        <ListX size={36} strokeWidth={1.5} className={styles.emptyIcon} />
                        <p className={styles.emptyTitle}>{t('noExercises')}</p>
                    </div>
                ) : (
                    allDays.map((day) => {
                        const date = getDayDate(weekStart, day);
                        const isThisWeekToday = weekOffset === 0 && day === todayIdx;
                        const isPastDay = weekOffset < 0 || (weekOffset === 0 && day < todayIdx);
                        const sessionsMap = byDayAndSession[day] ?? {};
                        const hasSessions = Object.values(sessionsMap).some((s) => s.length > 0);
                        const logsForDay: TrainingLogWithRelations[] = Object.keys(sessionsMap).map((s) =>
                            weekLogMap.get(logKey(date, Number(s)))
                        ).filter(Boolean) as TrainingLogWithRelations[];

                        return (
                            <div key={day} data-today={isThisWeekToday || undefined}>
                                {hasSessions ? (
                                    athleteId && plan && (
                                        <DayCard
                                            dayOfWeek={day}
                                            date={date}
                                            exercisesBySession={sessionsMap}
                                            logs={logsForDay}
                                            plan={plan}
                                            athleteId={athleteId}
                                            locale={locale}
                                            isToday={isThisWeekToday}
                                            isPast={isPastDay}
                                            loggedCount={logsForDay.length}
                                            t={t}
                                            dayNote={(plan.day_notes as Record<string, string> | undefined)?.[String(day)] || undefined}
                                            readinessScore={isThisWeekToday ? todayReadiness : undefined}
                                        />
                                    )
                                ) : (
                                    <RestDayCard
                                        dayOfWeek={day}
                                        date={date}
                                        isToday={isThisWeekToday}
                                        isPast={isPastDay}
                                        locale={locale}
                                        t={t}
                                    />
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
