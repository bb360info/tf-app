'use client';

import { useTranslations } from 'next-intl';
import { Trophy } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import styles from './HistoricalOnboardingWidget.module.css';

export function HistoricalOnboardingWidget() {
    const t = useTranslations('athleteDashboard');

    return (
        <section
            className={styles.widget}
            aria-labelledby="pr-onboarding-title"
        >
            <div className={styles.icon} aria-hidden="true">
                <Trophy size={22} />
            </div>
            <div className={styles.content}>
                <h2 id="pr-onboarding-title" className={styles.title}>
                    {t('prOnboardingTitle')}
                </h2>
                <p className={styles.desc}>{t('prOnboardingDesc')}</p>
            </div>
            <Link
                href="/competitions?tab=history&action=create"
                className={styles.cta}
            >
                {t('prOnboardingCta')}
            </Link>
        </section>
    );
}
