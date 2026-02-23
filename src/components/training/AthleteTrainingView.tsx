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
    CheckCircle,
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
    getPublishedPlanForToday,
    createTrainingLog,
    listTodayLogs,
    listWeekLogs,
} from '@/lib/pocketbase/services/logs';
import type { TrainingLogWithRelations } from '@/lib/pocketbase/services/logs';
import type { PlanWithExercises, PlanExerciseWithExpand } from '@/lib/pocketbase/services/plans';
import type { Language } from '@/lib/pocketbase/types';
import { useAuth } from '@/lib/hooks/useAuth';
import { groupByDayAndSession } from '@/lib/pocketbase/services/plans';
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

interface ExerciseLogState {
    rpe: number;
    sets: number;
    saved: boolean;
}


function ExerciseItem({
    planEx,
    locale,
    logId,
    t,
}: {
    planEx: PlanExerciseWithExpand;
    locale: Language;
    logId: string;
    t: ReturnType<typeof useTranslations>;
}) {
    const [open, setOpen] = useState(false);
    const [state, setState] = useState<ExerciseLogState>({ rpe: 5, sets: planEx.sets ?? 1, saved: false });
    const [saving, setSaving] = useState(false);
    const [skipReason, setSkipReason] = useState<SkipReason | null>(null);

    const name = getExerciseName(planEx, locale);
    const exercise = planEx.expand?.exercise_id;
    const catColor = exercise?.training_category
        ? `var(--color-${exercise.training_category})`
        : 'var(--color-accent-primary)';

    const handleSave = useCallback(async () => {
        if (!logId) return;
        // Skip saving warmup items without exercise_id
        if (!planEx.exercise_id) return;
        setSaving(true);
        try {
            const { saveLogExercise } = await import('@/lib/pocketbase/services/logs');
            await saveLogExercise(logId, planEx.exercise_id, [
                { set: 1, reps: state.sets },
            ], state.rpe, skipReason ?? undefined);
            setState((s) => ({ ...s, saved: true }));
        } catch (e) {
            console.error('[AthleteTrainingView] save exercise:', e);
        } finally {
            setSaving(false);
        }
    }, [logId, planEx.exercise_id, state.rpe, state.sets, skipReason]);


    const dosageLabel = (() => {
        const unitType = exercise?.unit_type ?? 'reps';
        const s = planEx.sets;
        if (!s) return t('log.reps');
        switch (unitType) {
            case 'weight':
                return `${s}×${planEx.reps || '?'}${planEx.weight ? ` @${planEx.weight}kg` : ''}`;
            case 'distance':
                return `${s}×${planEx.distance ? `${planEx.distance}m` : '?m'}`;
            case 'time':
                return `${s}×${planEx.duration ? `${planEx.duration}s` : '?s'}`;
            default:
                return planEx.reps ? `${s}×${planEx.reps}${planEx.intensity ? ` @${planEx.intensity}` : ''}` : `${s} sets`;
        }
    })();

    return (
        <li className={`${styles.exerciseItem} ${state.saved ? styles.exerciseDone : ''}`}>
            <button
                type="button"
                className={styles.exerciseHeader}
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
            >
                <span className={styles.exerciseDot} style={{ background: catColor }} aria-hidden="true" />
                <div className={styles.exerciseInfo}>
                    <span className={styles.exerciseName}>{name}</span>
                    <span className={styles.exerciseDosage}>{dosageLabel}</span>
                </div>
                {state.saved && <CheckCircle size={16} className={styles.doneIcon} />}
                {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
            </button>

            {open && (
                <div className={styles.exerciseLog}>
                    {/* Sets done */}
                    <div className={styles.setsRow}>
                        <span className={styles.logFieldLabel}>{t('log.reps')}</span>
                        <div className={styles.setsStepper}>
                            <button
                                type="button"
                                className={styles.stepBtn}
                                onClick={() => setState((s) => ({ ...s, sets: Math.max(0, s.sets - 1), saved: false }))}
                                aria-label="Decrease sets"
                            >−</button>
                            <span className={styles.setsValue}>{state.sets}</span>
                            <button
                                type="button"
                                className={styles.stepBtn}
                                onClick={() => setState((s) => ({ ...s, sets: s.sets + 1, saved: false }))}
                                aria-label="Increase sets"
                            >+</button>
                        </div>
                    </div>

                    {/* RPE */}
                    <div className={styles.rpeRow}>
                        <span className={styles.rpeLabel}>{t('log.rpe')}</span>
                        <div className={styles.rpeTrack}>
                            <input
                                type="range"
                                min={1} max={10} step={1}
                                value={state.rpe}
                                onChange={(e) => setState((s) => ({ ...s, rpe: Number(e.target.value), saved: false }))}
                                className={styles.rpeInput}
                                style={{ accentColor: RPE_COLORS[state.rpe] ?? '#888' }}
                            />
                            <span className={styles.rpeValue} style={{ color: RPE_COLORS[state.rpe] ?? '#888' }}>
                                {state.rpe}
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className={styles.saveBtn}
                        onClick={handleSave}
                        disabled={saving || !logId}
                    >
                        {saving ? t('saving') : state.saved ? `\u2713 ${t('log.save')}` : t('log.save')}
                    </button>

                    {/* Skip Reason chips */}
                    <div className={styles.skipReasonRow}>
                        <span className={styles.skipLabel}>{t('skipReason')}</span>
                        <div className={styles.skipChips}>
                            {SKIP_REASONS.map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    className={`${styles.skipChip} ${skipReason === r ? styles.skipChipActive : ''}`}
                                    onClick={() => setSkipReason((prev) => (prev === r ? null : r))}
                                >
                                    {t(`skipReasons.${r}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </li>
    );
}


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
    t: ReturnType<typeof useTranslations>;
    dayNote?: string;
    readinessScore?: number;
}) {
    const sessions = Object.keys(exercisesBySession).map(Number).filter((s) => (exercisesBySession[s]?.length ?? 0) > 0);
    if (sessions.length === 0) return null;

    const dateStr = date.toISOString().slice(0, 10);
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
        <div className={`${styles.dayCard} ${isToday ? styles.dayCardToday : ''}`}>
            <div className={styles.dayCardHeader}>
                <span className={styles.dayCardName}>{t(DAY_KEYS[dayOfWeek])}</span>
                <span className={styles.dayCardDate}>{formattedDate}</span>
                {isToday && <span className={styles.todayBadge}>{t('log.record')}</span>}
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
}: {
    exercises: PlanExerciseWithExpand[];
    log: TrainingLogWithRelations | null;
    ensureLog: () => Promise<TrainingLogWithRelations>;
    locale: Language;
    t: ReturnType<typeof useTranslations>;
    readinessScore?: number;
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

interface AthleteTrainingViewProps {
    /** Optional callback fired once the athlete's own ID is resolved. */
    onAthleteIdResolved?: (id: string) => void;
}

export function AthleteTrainingView({ onAthleteIdResolved }: AthleteTrainingViewProps = {}) {
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
                        onAthleteIdResolved?.(aid);
                    }
                } catch (err) {
                    const { logError } = await import('@/lib/utils/errors');
                    logError(err, { component: 'AthleteTrainingView', action: 'getSelfAthleteId' });
                    if (!cancelled) setIsLoading(false);
                    return;
                }

                const [fetchedPlan, fetchedTodayLogs] = await Promise.all([
                    getPublishedPlanForToday(aid),
                    listTodayLogs(aid),
                ]);

                if (cancelled) return;
                setPlan(fetchedPlan);
                setTodayLogs(fetchedTodayLogs);
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
        const weekStartISO = weekStart.toISOString().slice(0, 10);
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
                <p className={styles.emptyHint}>{t('searchExercises')}</p>
            </div>
        );
    }

    const allExercises = plan.expand?.['plan_exercises(plan_id)'] ?? [];
    const byDayAndSession = groupByDayAndSession(allExercises);

    // Check which days have exercises
    const activeDays = Array.from({ length: 7 }, (_, d) => d).filter((d) =>
        Object.values(byDayAndSession[d] ?? {}).some((s) => s.length > 0)
    );

    // Week-level log map: date+session → log
    const logKey = (date: Date, session: number) =>
        `${date.toISOString().slice(0, 10)}_${session}`;

    const weekLogMap = new Map<string, TrainingLogWithRelations>();
    for (const log of weekLogs) {
        const dateStr = typeof log.date === 'string'
            ? log.date.slice(0, 10)
            : new Date(log.date).toISOString().slice(0, 10);
        weekLogMap.set(`${dateStr}_${log.session ?? 0}`, log);
    }
    // Also include today's logs
    for (const log of todayLogs) {
        weekLogMap.set(logKey(new Date(), log.session ?? 0), log);
    }

    const weekLabel = `${weekStart.toLocaleDateString(locale === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short' })} – ${getDayDate(weekStart, 6).toLocaleDateString(locale === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    return (
        <div className={styles.root}>
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

            {/* 7-day scroll */}
            <div className={styles.weekScroll} ref={scrollRef}>
                {activeDays.length === 0 ? (
                    <div className={styles.emptyState}>
                        <ListX size={36} strokeWidth={1.5} className={styles.emptyIcon} />
                        <p className={styles.emptyTitle}>{t('noExercises')}</p>
                    </div>
                ) : (
                    activeDays.map((day) => {
                        const date = getDayDate(weekStart, day);
                        const isThisWeekToday = weekOffset === 0 && day === todayIdx;
                        const sessionsMap = byDayAndSession[day] ?? {};
                        const logsForDay: TrainingLogWithRelations[] = Object.keys(sessionsMap).map((s) =>
                            weekLogMap.get(logKey(date, Number(s)))
                        ).filter(Boolean) as TrainingLogWithRelations[];

                        return (
                            <div key={day} data-today={isThisWeekToday || undefined}>
                                {athleteId && plan && (
                                    <DayCard
                                        dayOfWeek={day}
                                        date={date}
                                        exercisesBySession={sessionsMap}
                                        logs={logsForDay}
                                        plan={plan}
                                        athleteId={athleteId}
                                        locale={locale}
                                        isToday={isThisWeekToday}
                                        t={t}
                                        dayNote={(plan.day_notes as Record<string, string> | undefined)?.[String(day)] || undefined}
                                        readinessScore={isThisWeekToday ? todayReadiness : undefined}
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
