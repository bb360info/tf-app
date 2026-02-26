'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar, Dumbbell } from 'lucide-react';
import dynamic from 'next/dynamic';
import { listSeasons, type SeasonWithRelations } from '@/lib/pocketbase/services/seasons';
import { logError } from '@/lib/utils/errors';
import { toLocalISODate } from '@/lib/utils/dateHelpers';
import { Skeleton } from '@/components/shared/Skeleton';
import styles from './athleteDetail.module.css';

const CoachLogViewerLazy = dynamic(
    () => import('@/components/training/CoachLogViewer').then(m => ({ default: m.CoachLogViewer })),
    { loading: () => <Skeleton variant="card" height={200} />, ssr: false }
);

type TFn = ReturnType<typeof useTranslations<'athleteDetail'>>;

export function TrainingTab({ athleteId, locale, t }: {
    athleteId: string;
    locale: string;
    t: TFn;
}) {
    // Inline type for plan vs fact data passed to CoachLogViewerLazy
    type SetEntry = { set: number; reps?: number; weight?: number; time?: number; distance?: number };
    // reps is string in PlanExercisesRecord (e.g. "3x10")
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
                    const complianceM = await import('@/lib/pocketbase/services/compliance');
                    return {
                        getLogsForPlan: logsM.getLogsForPlan,
                        listLogExercises: logsM.listLogExercises,
                        calculateWeeklyCompliance: complianceM.calculateWeeklyCompliance,
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
                logError(err, { component: 'TrainingTab', action: 'loadPlanData' });
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
