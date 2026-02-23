'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Award } from 'lucide-react';
import type { CelebrationItem } from '@/lib/hooks/useCelebration';
import styles from './CelebrationToast.module.css';

interface CelebrationToastProps {
    celebration: CelebrationItem;
    locale?: string;
    onDismiss: () => void;
}

export function CelebrationToast({ celebration, locale = 'ru', onDismiss }: CelebrationToastProps) {
    const t = useTranslations('celebration');
    const lang = (locale === 'en' ? 'en' : locale === 'cn' ? 'cn' : 'ru') as 'ru' | 'en' | 'cn';

    // Light haptic feedback
    useEffect(() => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([50]);
        }
    }, []);

    return (
        <div
            className={styles.toast}
            onClick={onDismiss}
            role="status"
            aria-live="polite"
            aria-label={`${t('newAchievement')}: ${celebration.meta.labels[lang]}`}
        >
            <div className={styles.iconWrap} aria-hidden="true">
                <Award size={18} />
            </div>
            <div className={styles.textWrap}>
                <p className={styles.title}>{t('newAchievement')}</p>
                <p className={styles.name}>{celebration.meta.labels[lang]}</p>
            </div>
        </div>
    );
}
