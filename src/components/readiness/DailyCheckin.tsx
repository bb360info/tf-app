
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Moon, Activity, Smile, Frown, CheckCircle } from 'lucide-react';
import styles from './DailyCheckin.module.css';
import { CheckinData } from '@/lib/readiness/types';
import { calculateReadiness, getReadinessColor, getReadinessStatus } from '@/lib/readiness/calculator';

interface Props {
    onSave?: (data: CheckinData, score: number) => void;
    initialData?: CheckinData;
}

export function DailyCheckin({ onSave, initialData }: Props) {
    const t = useTranslations('readiness');
    const [submitted, setSubmitted] = useState(!!initialData);
    const [score, setScore] = useState(initialData ? calculateReadiness(initialData) : 0);

    // Default values if new checkin
    const [data, setData] = useState<CheckinData>(initialData || {
        sleepDuration: 7.5,
        sleepQuality: 3,
        soreness: 3,
        mood: 3
    });

    const handleSubmit = () => {
        const result = calculateReadiness(data);
        setScore(result);
        setSubmitted(true);
        if (onSave) onSave(data, result);
    };

    if (submitted) {
        const status = getReadinessStatus(score);
        const color = getReadinessColor(score);

        return (
            <div className={styles.container}>
                <div className={styles.result} style={{ color }}>
                    <div className={styles.scoreCircle}>
                        {score}
                    </div>
                    <div className={styles.statusText}>
                        {t(`status_${status}`)}
                    </div>
                    {/* Could add specific advice based on status here */}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <span className={styles.title}>{t('title')}</span>
            </div>

            <div className={styles.form}>
                {/* Sleep Duration */}
                <div className={styles.field}>
                    <div className={styles.labelRow}>
                        <span className={styles.label}>
                            <Moon size={18} /> {t('sleepDuration')}
                        </span>
                        <span className={styles.value}>{data.sleepDuration}h</span>
                    </div>
                    <div className={styles.sliderContainer}>
                        <input
                            type="range"
                            min="3" max="12" step="0.5"
                            className={styles.slider}
                            value={data.sleepDuration}
                            onChange={(e) => setData({ ...data, sleepDuration: parseFloat(e.target.value) })}
                        />
                    </div>
                </div>

                {/* Sleep Quality */}
                <div className={styles.field}>
                    <div className={styles.labelRow}>
                        <span className={styles.label}>
                            <Moon size={18} /> {t('sleepQuality')}
                        </span>
                        <span className={styles.value}>{data.sleepQuality}/5</span>
                    </div>
                    <div className={styles.sliderContainer}>
                        <input
                            type="range"
                            min="1" max="5" step="1"
                            className={styles.slider}
                            value={data.sleepQuality}
                            onChange={(e) => setData({ ...data, sleepQuality: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className={styles.rangeLabels}>
                        <span>1</span><span>3</span><span>5</span>
                    </div>
                </div>

                {/* Soreness (Inverse logic handled in calculator, UI shows Pain Level) */}
                <div className={styles.field}>
                    <div className={styles.labelRow}>
                        <span className={styles.label}>
                            <Activity size={18} /> {t('soreness')}
                        </span>
                        <span className={styles.value}>{data.soreness}/10</span>
                    </div>
                    <div className={styles.sliderContainer}>
                        <input
                            type="range"
                            min="0" max="10" step="1"
                            className={styles.slider}
                            value={data.soreness}
                            onChange={(e) => setData({ ...data, soreness: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className={styles.rangeLabels}>
                        <span>0 (None)</span><span>10 (Max)</span>
                    </div>
                </div>

                {/* Mood */}
                <div className={styles.field}>
                    <div className={styles.labelRow}>
                        <span className={styles.label}>
                            {data.mood > 3 ? <Smile size={18} /> : <Frown size={18} />} {t('mood')}
                        </span>
                        <span className={styles.value}>{data.mood}/5</span>
                    </div>
                    <div className={styles.sliderContainer}>
                        <input
                            type="range"
                            min="1" max="5" step="1"
                            className={styles.slider}
                            value={data.mood}
                            onChange={(e) => setData({ ...data, mood: parseInt(e.target.value) })}
                        />
                    </div>
                </div>

                <button className={styles.submitBtn} onClick={handleSubmit}>
                    <CheckCircle size={20} />
                    {t('submit')}
                </button>
            </div>
        </div>
    );
}
