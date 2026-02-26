'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Check, Clock } from 'lucide-react';
import type { PlanExerciseWithExpand } from '@/lib/pocketbase/services/plans';
import type { SetData, UnitType } from '@/lib/pocketbase/types';
import type { UpdateExerciseData } from '../types';
import styles from './SetLogger.module.css';

export interface SetLoggerProps {
    planExercise: PlanExerciseWithExpand;
    mode: 'plan' | 'log';
    onUpdate?: (id: string, data: UpdateExerciseData) => void;
    onSaveLog?: (setsData: SetData[], rpe?: number) => Promise<void>;
    initialLogData?: {
        setsData: SetData[];
        rpe?: number;
    } | null;
}

const RPE_COLORS = [
    '', '#22c55e', '#4ade80', '#86efac', '#fde047',
    '#facc15', '#fb923c', '#f97316', '#ef4444', '#dc2626', '#991b1b',
];

export function SetLogger({
    planExercise,
    mode,
    onUpdate,
    onSaveLog,
    initialLogData,
}: SetLoggerProps) {
    const t = useTranslations('training');
    const unitType: UnitType = planExercise.expand?.exercise_id?.unit_type ?? 'reps';

    // ─── Plan Mode State ───
    const [planSets, setPlanSets] = useState(planExercise.sets?.toString() ?? '');
    const [planReps, setPlanReps] = useState(planExercise.reps ?? '');
    const [planIntensity, setPlanIntensity] = useState(planExercise.intensity ?? '');
    const [planWeight, setPlanWeight] = useState(planExercise.weight?.toString() ?? '');
    const [planDuration, setPlanDuration] = useState(planExercise.duration?.toString() ?? '');
    const [planDistance, setPlanDistance] = useState(planExercise.distance?.toString() ?? '');

    // ─── Log Mode State ───
    const initialSetsCount = planExercise.sets || 1;
    const defaultReps = parseInt(planExercise.reps || '8', 10) || 8;
    const defaultWeight = planExercise.weight || 0;
    const defaultDuration = planExercise.duration || 0;
    const defaultDistance = planExercise.distance || 0;

    const [setsData, setSetsData] = useState<SetData[]>(() => {
        if (initialLogData?.setsData?.length) return initialLogData.setsData;
        return Array.from({ length: initialSetsCount }).map((_, i) => ({
            set: i + 1,
            reps: defaultReps,
            weight: defaultWeight,
            time: defaultDuration,
            distance: defaultDistance
        }));
    });
    const [rpe, setRpe] = useState<number>(initialLogData?.rpe || 5);
    const [isSaving, setIsSaving] = useState(false);
    const [justSaved, setJustSaved] = useState(false);

    // ─── Rest Timer State ───
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [timerActive, setTimerActive] = useState(false);
    const timerMax = planExercise.rest_seconds || 60;

    useEffect(() => {
        // Hydrate from async initialLogData (autofill)
        if (initialLogData?.setsData?.length) {
            setSetsData(initialLogData.setsData);
            if (initialLogData.rpe !== undefined) setRpe(initialLogData.rpe);
        }
    }, [initialLogData]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (timerActive && timerSeconds > 0) {
            interval = setInterval(() => setTimerSeconds(s => s - 1), 1000);
        } else if (timerSeconds === 0 && timerActive) {
            setTimerActive(false);
        }
        return () => clearInterval(interval);
    }, [timerActive, timerSeconds]);

    // ─── Handlers ───
    const handlePlanSave = () => {
        if (!onUpdate) return;
        const data: UpdateExerciseData = {
            sets: planSets ? parseInt(planSets, 10) : undefined,
        };
        if (unitType === 'reps' || unitType === 'weight') {
            data.reps = planReps || undefined;
            data.intensity = planIntensity || undefined;
        }
        if (unitType === 'weight') data.weight = planWeight ? parseFloat(planWeight) : undefined;
        if (unitType === 'time') data.duration = planDuration ? parseFloat(planDuration) : undefined;
        if (unitType === 'distance') data.distance = planDistance ? parseFloat(planDistance) : undefined;

        onUpdate(planExercise.id, data);
    };

    const updateSetData = (idx: number, updates: Partial<SetData>) => {
        const newData = [...setsData];
        newData[idx] = { ...newData[idx], ...updates };
        setSetsData(newData);
    };

    const handleAddSet = () => {
        const last = setsData[setsData.length - 1];
        setSetsData([
            ...setsData,
            {
                set: setsData.length + 1,
                reps: last?.reps || defaultReps,
                weight: last?.weight || defaultWeight,
                time: last?.time || defaultDuration,
                distance: last?.distance || defaultDistance,
            }
        ]);
    };

    const handleLogSave = async () => {
        if (!onSaveLog) return;
        setIsSaving(true);
        try {
            await onSaveLog(setsData, rpe);
            setJustSaved(true);
            setTimeout(() => setJustSaved(false), 500);

            // Start rest timer
            setTimerSeconds(timerMax);
            setTimerActive(true);
        } catch (e) {
            console.error('Save failed', e);
        } finally {
            setIsSaving(false);
        }
    };

    // ─── Render Plan Mode ───
    if (mode === 'plan') {
        return (
            <div className={styles.planForm}>
                <input
                    type="number" value={planSets} onChange={(e) => setPlanSets(e.target.value)}
                    placeholder="Sets" className={styles.planInput} min="1" max="20"
                />
                <span className={styles.planSeparator}>×</span>

                {unitType === 'reps' && (
                    <input type="text" value={planReps} onChange={(e) => setPlanReps(e.target.value)} placeholder="Reps" className={styles.planInput} />
                )}
                {unitType === 'weight' && (
                    <>
                        <input type="text" value={planReps} onChange={(e) => setPlanReps(e.target.value)} placeholder="Reps" className={styles.planInput} />
                        <input type="number" inputMode="decimal" value={planWeight} onChange={(e) => setPlanWeight(e.target.value)} placeholder="kg" className={`${styles.planInput} ${styles.planInputSmall}`} />
                    </>
                )}
                {unitType === 'distance' && (
                    <input type="number" value={planDistance} onChange={(e) => setPlanDistance(e.target.value)} placeholder="m" className={styles.planInput} />
                )}
                {unitType === 'time' && (
                    <input type="number" value={planDuration} onChange={(e) => setPlanDuration(e.target.value)} placeholder="sec" className={styles.planInput} />
                )}
                {(unitType === 'reps' || unitType === 'weight') && (
                    <input type="text" value={planIntensity} onChange={(e) => setPlanIntensity(e.target.value)} placeholder="%" className={`${styles.planInput} ${styles.planInputSmall}`} />
                )}

                <button type="button" className={styles.planSaveBtn} onClick={handlePlanSave} aria-label="Save">
                    <Check size={18} />
                </button>
            </div>
        );
    }

    // ─── Render Log Mode ───
    const dashArray = 2 * Math.PI * 18; // r=18
    const dashOffset = timerMax > 0 ? dashArray - (timerSeconds / timerMax) * dashArray : 0;

    return (
        <div className={styles.container}>
            <div className={styles.logSetsList}>
                {setsData.map((s, idx) => (
                    <div key={idx} className={`${styles.setRow} ${justSaved ? styles.setRowCompleted : ''}`}>
                        <span className={styles.setNumber}>{s.set}</span>

                        {/* Reps stepper is common for weight and reps unit types */}
                        {(unitType === 'reps' || unitType === 'weight') && (
                            <div className={styles.stepper}>
                                <button type="button" className={styles.stepBtn} onClick={() => updateSetData(idx, { reps: Math.max(0, Number(s.reps || 0) - 1) })} aria-label="Decrease reps">−</button>
                                <span className={styles.stepValue}>{s.reps || 0}</span>
                                <button type="button" className={styles.stepBtn} onClick={() => updateSetData(idx, { reps: Number(s.reps || 0) + 1 })} aria-label="Increase reps">+</button>
                            </div>
                        )}

                        {/* Additional value input based on unitType */}
                        {unitType === 'weight' && (
                            <div className={styles.valueInputWrap}>
                                <input type="number" inputMode="decimal" className={styles.valueInput} value={s.weight || ''} onChange={(e) => updateSetData(idx, { weight: parseFloat(e.target.value) || 0 })} aria-label="Weight" />
                                <span className={styles.valueUnit}>kg</span>
                            </div>
                        )}
                        {unitType === 'distance' && (
                            <div className={styles.valueInputWrap}>
                                <input type="number" inputMode="decimal" className={styles.valueInput} value={s.distance || ''} onChange={(e) => updateSetData(idx, { distance: parseFloat(e.target.value) || 0 })} aria-label="Distance" />
                                <span className={styles.valueUnit}>m</span>
                            </div>
                        )}
                        {unitType === 'time' && (
                            <div className={styles.valueInputWrap}>
                                <input type="number" inputMode="numeric" className={styles.valueInput} value={s.time || ''} onChange={(e) => updateSetData(idx, { time: parseInt(e.target.value, 10) || 0 })} aria-label="Time" />
                                <span className={styles.valueUnit}>s</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <button type="button" className={styles.addSetBtn} onClick={handleAddSet}>
                <Plus size={16} /> {/* Plus icon is enough, clean UX */}
            </button>

            {/* RPE Slider */}
            <div className={styles.rpeContainer}>
                <div className={styles.rpeHeader}>
                    <span className={styles.rpeLabel}>{t('log.rpe')}</span>
                    <span className={styles.rpeValueWrap} style={{ color: RPE_COLORS[rpe] || '#888' }}>{rpe}</span>
                </div>
                <input
                    type="range" className={styles.rpeSlider}
                    min={1} max={10} step={1} value={rpe}
                    onChange={(e) => setRpe(Number(e.target.value))}
                    style={{ accentColor: RPE_COLORS[rpe] || '#888' }}
                    aria-label={t('log.rpe')}
                />
            </div>

            {/* Actions Row (Save + Timer) */}
            <div className={styles.actionsRow}>
                <button type="button" className={`${styles.saveBtn} ${justSaved ? styles.saveBtnActive : ''}`} onClick={handleLogSave} disabled={isSaving}>
                    {isSaving ? t('saving') : justSaved ? <><Check size={18} /> {t('log.save')} </> : t('log.save')}
                </button>

                {timerActive ? (
                    <div className={styles.timerWrap} onClick={() => setTimerActive(false)} title="Click to cancel timer">
                        <svg className={styles.timerSvg} viewBox="0 0 40 40">
                            <circle className={styles.timerBg} cx="20" cy="20" r="18" />
                            <circle className={styles.timerProgress} cx="20" cy="20" r="18" strokeDasharray={dashArray} strokeDashoffset={dashOffset} />
                        </svg>
                        <span className={styles.timerValue}>{timerSeconds}</span>
                    </div>
                ) : (
                    <div className={styles.timerWrap} style={{ opacity: 0.5 }} onClick={() => { setTimerSeconds(timerMax); setTimerActive(true); }} title="Start timer">
                        <Clock size={20} color="var(--color-text-secondary)" />
                    </div>
                )}
            </div>
        </div>
    );
}
