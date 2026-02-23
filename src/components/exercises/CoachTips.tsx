'use client';

/**
 * CoachTips — shows coach_cues_* for the current locale with TTS playback.
 * No external resources — uses Web Speech API (browser built-in).
 */

import { useState, useCallback, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import type { ExercisesRecord } from '@/lib/pocketbase/types';
import type { Language } from '@/lib/pocketbase/types';
import styles from './CoachTips.module.css';

interface CoachTipsProps {
    exercise: ExercisesRecord;
    locale: Language;
    /** i18n labels passed from parent to avoid hook nesting */
    labels: {
        title: string;
        speak: string;
        stop: string;
        noTips: string;
    };
}

const TTS_LANG: Record<Language, string> = {
    ru: 'ru-RU',
    en: 'en-US',
    cn: 'zh-CN',
};

function getCues(exercise: ExercisesRecord, locale: Language): string {
    switch (locale) {
        case 'ru': return exercise.coach_cues_ru || exercise.coach_cues_en || '';
        case 'cn': return exercise.coach_cues_cn || exercise.coach_cues_en || '';
        default: return exercise.coach_cues_en || '';
    }
}

export function CoachTips({ exercise, locale, labels }: CoachTipsProps) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const cues = getCues(exercise, locale);
    const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

    // Stop TTS when component unmounts or cues change
    useEffect(() => {
        return () => {
            if (ttsSupported) window.speechSynthesis.cancel();
        };
    }, [cues, ttsSupported]);

    const handleSpeak = useCallback(() => {
        if (!ttsSupported || !cues) return;
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }
        const utterance = new SpeechSynthesisUtterance(cues);
        utterance.lang = TTS_LANG[locale];
        utterance.rate = 0.9;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
    }, [cues, isSpeaking, locale, ttsSupported]);

    if (!cues) {
        return (
            <div className={styles.empty}>
                <p className={styles.emptyText}>{labels.noTips}</p>
            </div>
        );
    }

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <h3 className={styles.title}>{labels.title}</h3>
                {ttsSupported && (
                    <button
                        type="button"
                        className={styles.ttsBtn}
                        onClick={handleSpeak}
                        aria-label={isSpeaking ? labels.stop : labels.speak}
                        aria-pressed={isSpeaking}
                    >
                        {isSpeaking
                            ? <VolumeX size={18} aria-hidden="true" />
                            : <Volume2 size={18} aria-hidden="true" />
                        }
                    </button>
                )}
            </div>
            <p className={styles.cues}>{cues}</p>
        </div>
    );
}
