'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { listPlansForPhase, groupByDay, type PlanWithExercises } from '@/lib/pocketbase/services/plans';
import DaySummaryCard from './DaySummaryCard';
import styles from './MultiWeekView.module.css';

interface Props {
    phaseId: string;
    phaseName: string;
    maxWeeks: number;
    startDate?: string;
    onBack: () => void;
    onSelectWeek: (weekNum: number) => void;
}

export default function MultiWeekView({
    phaseId,
    phaseName,
    maxWeeks,
    startDate,
    onBack,
    onSelectWeek,
}: Props) {
    const t = useTranslations();
    const [plans, setPlans] = useState<PlanWithExercises[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAll() {
            setLoading(true);
            try {
                // Ensure we fetch fresh data
                const data = await listPlansForPhase(phaseId);
                console.log('[MultiWeekView] Loaded plans:', data.length, data);
                setPlans(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchAll();
    }, [phaseId]);

    // Map plans by week number for easy access
    const plansByWeek = useMemo(() => {
        const map = new Map<number, PlanWithExercises>();
        plans.forEach(p => {
            const week = Number(p.week_number);
            const existing = map.get(week);
            const newCount = p.expand?.['plan_exercises(plan_id)']?.length || 0;

            // If no existing plan, set it. Otherwise, prefer published plans.
            // If both are published (or neither), prefer the one with more exercises.
            if (!existing) {
                map.set(week, p);
            } else {
                const existingIsPublished = existing.status === 'published';
                const newIsPublished = p.status === 'published';

                if (newIsPublished && !existingIsPublished) {
                    map.set(week, p);
                } else if (newIsPublished === existingIsPublished) {
                    const existingCount = existing.expand?.['plan_exercises(plan_id)']?.length || 0;
                    if (newCount > existingCount) {
                        map.set(week, p);
                    }
                }
            }
        });
        return map;
    }, [plans]);

    // Helper to get date for Week W, Day D
    const getDate = (weekNum: number, dayIndex: number) => {
        if (!startDate) return null;
        const d = new Date(startDate);
        // Add weeks
        d.setDate(d.getDate() + (weekNum - 1) * 7);
        // Adjust to Monday
        const currentDay = d.getDay(); // 0=Sun
        const distToMon = currentDay === 0 ? -6 : 1 - currentDay;
        d.setDate(d.getDate() + distToMon + dayIndex);
        return d;
    };

    if (loading) {
        return <div className={styles.loading}>{t('loading')}</div>;
    }

    const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    return (
        <div className={styles.container}>
            <div className={styles.toolbar}>
                <button className={styles.backBtn} onClick={onBack}>
                    <ArrowLeft size={20} />
                    {t('back')}
                </button>
                <div className={styles.title}>
                    {phaseName} — {t('training.multiWeekView')}
                </div>
            </div>



            <div className={styles.gridContainer}>
                {/* Header Row: Day Names */}
                <div className={styles.headerRow}>
                    <div className={styles.weekLabelCorner}>#</div>
                    {DAY_KEYS.map(k => (
                        <div key={k} className={styles.dayHeader}>
                            {t(`training.day_${k}`)}
                        </div>
                    ))}
                </div>

                {/* Weeks Rows */}
                {Array.from({ length: maxWeeks }, (_, i) => {
                    const weekNum = i + 1;
                    const plan = plansByWeek.get(weekNum);
                    // Extract exercises if plan exists
                    const weekExercises = plan?.expand?.['plan_exercises(plan_id)'] || [];
                    const byDay = groupByDay(weekExercises);



                    return (
                        <div key={weekNum} className={styles.weekRow}>
                            <div
                                className={styles.weekLabel}
                                onClick={() => onSelectWeek(weekNum)}
                                title={t('training.openWeek')}
                            >
                                <span className={styles.weekNum}>{weekNum}</span>
                            </div>
                            {Array.from({ length: 7 }, (_, d) => (
                                <div key={d} className={styles.dayCell}>
                                    <DaySummaryCard
                                        date={getDate(weekNum, d)}
                                        exercises={byDay[d] || []}
                                        onClick={() => onSelectWeek(weekNum)}
                                    />
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
