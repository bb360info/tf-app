'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import type { CelebrationItem } from '@/lib/hooks/useCelebration';
import styles from './CelebrationOverlay.module.css';

interface CelebrationOverlayProps {
    celebration: CelebrationItem;
    locale?: string;
    onDismiss: () => void;
}

const CONFETTI_COLORS = [
    'var(--color-accent-primary)',
    'var(--color-warning)',
    'var(--color-success)',
    'var(--color-favorite)',
    'var(--color-accent-secondary)',
];

/** Pre-computed confetti particles (deterministic, module-level) */
const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${(i * 3.33 + (i % 7) * 5) % 100}%`,
    delay: `${(i * 0.07) % 2}s`,
    duration: `${2 + (i % 5) * 0.5}s`,
    color: CONFETTI_COLORS[i % 5],
    size: `${6 + (i % 4) * 2}px`,
}));

/** 30 confetti elements with deterministic positions */
function ConfettiParticles() {
    return (
        <div className={styles.confettiContainer} aria-hidden="true">
            {PARTICLES.map((p) => (
                <span
                    key={p.id}
                    className={styles.confetti}
                    style={{
                        left: p.left,
                        animationDelay: p.delay,
                        animationDuration: p.duration,
                        backgroundColor: p.color,
                        width: p.size,
                        height: p.size,
                    }}
                />
            ))}
        </div>
    );
}

export function CelebrationOverlay({ celebration, locale = 'ru', onDismiss }: CelebrationOverlayProps) {
    const t = useTranslations('celebration');
    const lang = (locale === 'en' ? 'en' : locale === 'cn' ? 'cn' : 'ru') as 'ru' | 'en' | 'cn';


    // Haptic feedback
    useEffect(() => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([100, 50, 200]);
        }
    }, []);

    // Sound effect (graceful failure)
    useEffect(() => {
        try {
            const audio = new Audio('/sounds/celebration.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => { /* No autoplay permission — ignore */ });
        } catch {
            /* non-critical: audio playback not supported */
        }
    }, []);

    // Dismiss on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onDismiss();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onDismiss]);

    return (
        <div
            className={styles.overlay}
            onClick={onDismiss}
            role="dialog"
            aria-modal="true"
            aria-label={t('newAchievement')}
        >
            <ConfettiParticles />

            <div className={styles.card} onClick={(e) => e.stopPropagation()}>
                <button
                    className={styles.closeBtn}
                    onClick={onDismiss}
                    aria-label={t('dismiss')}
                >
                    <X size={20} />
                </button>

                <p className={styles.awesome}>{t('awesome')}</p>
                <p className={styles.achievementName}>{celebration.meta.labels[lang]}</p>
                <p className={styles.achievementDesc}>{celebration.meta.descriptions[lang]}</p>
            </div>
        </div>
    );
}
