'use client';

import { useState, useCallback, useEffect } from 'react';
import type { useTranslations } from 'next-intl';
import { CheckCircle2, ChevronUp, ChevronDown } from 'lucide-react';
import { cnsCostColor, getExerciseName } from '@/lib/pocketbase/services/exercises';
import { saveLogExercise, getLastExerciseLog } from '@/lib/pocketbase/services/logs';
import type { PlanExerciseWithExpand } from '@/lib/pocketbase/services/plans';
import type { SetData, Language } from '@/lib/pocketbase/types';
import { SetLogger } from './SetLogger';
import styles from './ExerciseItem.module.css';

const SKIP_REASONS = ['Equipment', 'Pain', 'Time', 'CoachDecision', 'Other'] as const;
type SkipReason = typeof SKIP_REASONS[number];

interface ExerciseItemProps {
    planEx: PlanExerciseWithExpand;
    locale: Language;
    logId: string;
    athleteId: string;
    t: ReturnType<typeof useTranslations>;
}

export function ExerciseItem({ planEx, locale, logId, athleteId, t }: ExerciseItemProps) {
    const [open, setOpen] = useState(false);
    const [saved, setSaved] = useState(false);
    const [skipReason, setSkipReason] = useState<SkipReason | null>(null);

    const [initialLogData, setInitialLogData] = useState<{ setsData: SetData[], rpe?: number } | null>(null);
    const [isLoadingAutofill, setIsLoadingAutofill] = useState(false);

    const exercise = planEx.expand?.exercise_id;
    let name = '—';
    let cnsCost = 2;
    if (exercise) {
        name = getExerciseName(exercise, locale);
        cnsCost = exercise.cns_cost ?? 2;
    } else {
        const textMap: Record<string, string | null | undefined> = {
            ru: planEx.custom_text_ru,
            en: planEx.custom_text_en,
            cn: planEx.custom_text_cn,
        };
        name = textMap[locale] ?? planEx.custom_text_ru ?? planEx.custom_text_en ?? '—';
    }

    const unitType = exercise?.unit_type ?? 'reps';

    const dosageLabel = (() => {
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
                return planEx.reps
                    ? `${s}×${planEx.reps}${planEx.intensity ? ` @${planEx.intensity}` : ''}`
                    : `${s} sets`;
        }
    })();

    // Fetch autofill data when expanded
    useEffect(() => {
        if (!open || !exercise || initialLogData || isLoadingAutofill) return;

        let isMounted = true;
        const fetchAutofill = async () => {
            setIsLoadingAutofill(true);
            try {
                const lastLog = await getLastExerciseLog(athleteId, exercise.id);
                if (isMounted && lastLog && lastLog.sets_data) {
                    setInitialLogData({
                        setsData: lastLog.sets_data as SetData[],
                        rpe: lastLog.rpe
                    });
                }
            } catch (err) {
                console.error("Failed to fetch autofill", err);
            } finally {
                if (isMounted) setIsLoadingAutofill(false);
            }
        };
        fetchAutofill();

        return () => { isMounted = false; };
    }, [open, exercise, athleteId, initialLogData, isLoadingAutofill]);

    const handleSaveLog = useCallback(async (setsData: SetData[], rpe?: number) => {
        if (!logId || !exercise) return;
        await saveLogExercise(logId, exercise.id, setsData, rpe, skipReason ?? undefined);
        setSaved(true);
        setTimeout(() => setOpen(false), 1000); // UI convenience
    }, [logId, exercise, skipReason]);

    return (
        <li className={`${styles.exerciseItem} ${saved ? styles.exerciseItemDone : ''}`}>
            <button
                type="button"
                className={styles.exerciseHeader}
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
            >
                <div
                    className={styles.exerciseDot}
                    style={{ backgroundColor: cnsCostColor(cnsCost) }}
                />
                <div className={styles.exerciseInfo}>
                    <span className={styles.exerciseName}>{name}</span>
                    <span className={styles.exerciseDosage}>
                        {planEx.block === 'warmup' ? t('warmup') + ' • ' : ''}
                        {dosageLabel}
                    </span>
                </div>
                {saved && <CheckCircle2 size={16} className={styles.doneIcon} />}
                {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
            </button>

            {open && (
                <div className={styles.exerciseLog}>
                    {exercise ? (
                        <SetLogger
                            planExercise={planEx}
                            mode="log"
                            onSaveLog={handleSaveLog}
                            initialLogData={initialLogData}
                        />
                    ) : (
                        <div style={{ padding: 'var(--space-2) 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                            No detailed logging available for custom text items.
                        </div>
                    )}

                    {/* Skip Reason chips (only if exercise exists) */}
                    {exercise && (
                        <div style={{ paddingTop: 'var(--space-2)' }}>
                            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 'var(--space-2)' }}>
                                {t('skipReason')}
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                                {SKIP_REASONS.map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setSkipReason((prev) => (prev === r ? null : r))}
                                        style={{
                                            minHeight: '36px',
                                            padding: '4px 12px',
                                            background: skipReason === r ? 'color-mix(in srgb, var(--color-warning) 12%, transparent)' : 'transparent',
                                            border: `1px solid ${skipReason === r ? 'var(--color-warning)' : 'var(--color-border)'}`,
                                            borderRadius: 'var(--radius-full)',
                                            fontFamily: 'var(--font-body)',
                                            fontSize: 'var(--text-xs)',
                                            fontWeight: 'var(--weight-medium)',
                                            color: skipReason === r ? 'var(--color-warning)' : 'var(--color-text-secondary)',
                                            cursor: 'pointer',
                                            transition: 'all var(--duration-fast)',
                                        }}
                                    >
                                        {t(`skipReasons.${r}`)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </li>
    );
}
