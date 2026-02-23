'use client';

import { useState, useId } from 'react';
import { useTranslations } from 'next-intl';
import { Moon, Heart, Zap, Smile, CheckCircle2, Loader2 } from 'lucide-react';
import { saveCheckin } from '@/lib/pocketbase/services/readiness';
import type { CheckinData } from '@/lib/readiness/types';
import styles from './ReadinessCheckin.module.css';

// ─── Props ─────────────────────────────────────────────────────────

interface Props {
    athleteId: string;
    onSaved?: () => void;
}

// ─── Helper: compute readiness score 0-100 ─────────────────────────

function computeScore(data: CheckinData): number {
    // Normalize each metric to 0-100
    const sleepScore = Math.min(100, ((data.sleepDuration - 4) / 6) * 100); // 4-10hrs
    const qualityScore = ((data.sleepQuality - 1) / 4) * 100;               // 1-5
    const moodScore = ((data.mood - 1) / 4) * 100;                           // 1-5
    const sorenessScore = Math.max(0, 100 - (data.soreness / 10) * 100);    // 0-10 (inverted)

    return Math.round((sleepScore * 0.3 + qualityScore * 0.25 + moodScore * 0.25 + sorenessScore * 0.2));
}

// ─── Slider Question ───────────────────────────────────────────────

interface SliderProps {
    id: string;
    label: string;
    icon: React.ReactNode;
    min: number;
    max: number;
    step?: number;
    value: number;
    formatValue?: (v: number) => string;
    onChange: (v: number) => void;
}

function SliderQuestion({ id, label, icon, min, max, step = 1, value, formatValue, onChange }: SliderProps) {
    return (
        <div className={styles.question}>
            <div className={styles.questionHeader}>
                <label htmlFor={id} className={styles.questionLabel}>
                    {icon}
                    {label}
                </label>
                <span className={styles.questionValue}>
                    {formatValue ? formatValue(value) : value}
                </span>
            </div>
            <input
                id={id}
                type="range"
                className={styles.slider}
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
            />
            <div className={styles.sliderTicks}>
                <span>{min}</span>
                <span>{max}</span>
            </div>
        </div>
    );
}

// ─── Component ─────────────────────────────────────────────────────

export function ReadinessCheckin({ athleteId, onSaved }: Props) {
    const t = useTranslations('athleteDashboard');
    const uid = useId();

    const [sleepDuration, setSleepDuration] = useState(7);
    const [sleepQuality, setSleepQuality] = useState(3);
    const [mood, setMood] = useState(3);
    const [soreness, setSoreness] = useState(3);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError('');
        try {
            const data: CheckinData = { sleepDuration, sleepQuality, mood, soreness };
            const score = computeScore(data);
            await saveCheckin(athleteId, data, score);
            onSaved?.();
        } catch (err) {
            const { logError } = await import('@/lib/utils/errors');
            logError(err, { component: 'ReadinessCheckin', action: 'submit' });
            setError(t('submitError'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.form}>
            <SliderQuestion
                id={`${uid}-sleep`}
                label={t('sleep')}
                icon={<Moon size={16} aria-hidden="true" />}
                min={4}
                max={10}
                step={0.5}
                value={sleepDuration}
                formatValue={(v) => `${v}ч`}
                onChange={setSleepDuration}
            />
            <SliderQuestion
                id={`${uid}-quality`}
                label={t('sleepQuality')}
                icon={<Zap size={16} aria-hidden="true" />}
                min={1}
                max={5}
                value={sleepQuality}
                onChange={setSleepQuality}
            />
            <SliderQuestion
                id={`${uid}-mood`}
                label={t('mood')}
                icon={<Smile size={16} aria-hidden="true" />}
                min={1}
                max={5}
                value={mood}
                onChange={setMood}
            />
            <SliderQuestion
                id={`${uid}-soreness`}
                label={t('soreness')}
                icon={<Heart size={16} aria-hidden="true" />}
                min={0}
                max={10}
                value={soreness}
                onChange={setSoreness}
            />

            {error && <p className={styles.error}>{error}</p>}

            <button
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={isSubmitting}
                aria-label={t('submit')}
            >
                {isSubmitting ? (
                    <>
                        <Loader2 size={18} className={styles.spin} aria-hidden="true" />
                        {t('submitting')}
                    </>
                ) : (
                    <>
                        <CheckCircle2 size={18} aria-hidden="true" />
                        {t('submit')}
                    </>
                )}
            </button>
        </div>
    );
}
