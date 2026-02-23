'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { ChevronLeft, Brain, Target, Wind, MessageCircle, Unlock, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import styles from './mental.module.css';

// ─── Static Mental Prep Card Data ────────────────────────────────

const CARDS: Array<{ id: string; Icon: LucideIcon; color: string }> = [
    { id: 'success_visualization', Icon: Brain, color: 'var(--color-accent-primary)' },
    { id: 'pre_comp_routine', Icon: Target, color: 'var(--color-success)' },
    { id: 'breathing_focus', Icon: Wind, color: 'var(--color-speed)' },
    { id: 'positive_self_talk', Icon: MessageCircle, color: 'var(--color-warning)' },
    { id: 'pressure_release', Icon: Unlock, color: 'var(--color-plyometric)' },
    { id: 'performance_mindset', Icon: Zap, color: 'var(--color-strength)' },
];

export default function MentalPage() {
    const t = useTranslations('mentalPage');
    const locale = useLocale();

    return (
        <div className={styles.page}>
            {/* Back */}
            <Link href={`/${locale}/reference`} className={styles.backLink}>
                <ChevronLeft size={18} aria-hidden="true" />
                {t('back')}
            </Link>

            <header className={styles.header}>
                <h1 className={styles.title}>{t('title')}</h1>
                <p className={styles.subtitle}>{t('subtitle')}</p>
            </header>

            {/* Cards */}
            <section aria-labelledby="mental-cards-title">
                <h2 id="mental-cards-title" className={styles.sectionTitle}>{t('cardsTitle')}</h2>
                <div className={styles.cardGrid}>
                    {CARDS.map(({ id, Icon, color }) => (
                        <article key={id} className={styles.mentalCard} aria-label={t(`card.${id}.title`)}>
                            <div className={styles.cardTop}>
                                <span
                                    className={styles.cardIcon}
                                    style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
                                >
                                    <Icon size={22} aria-hidden="true" />
                                </span>
                                <h3 className={styles.cardTitle}>{t(`card.${id}.title`)}</h3>
                            </div>
                            <p className={styles.cardBody}>{t(`card.${id}.body`)}</p>
                            <div className={styles.cardTip}>
                                <span className={styles.tipLabel}>{t('tipLabel')}</span>
                                <span className={styles.tipText}>{t(`card.${id}.tip`)}</span>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            {/* Pre-comp routine steps */}
            <section aria-labelledby="routine-title">
                <h2 id="routine-title" className={styles.sectionTitle}>{t('routineTitle')}</h2>
                <ol className={styles.routineList}>
                    {([1, 2, 3, 4, 5] as const).map((n) => (
                        <li key={n} className={styles.routineItem}>
                            <span className={styles.routineNum}>{n}</span>
                            <div>
                                <p className={styles.routineStep}>{t(`routine.step${n}.title`)}</p>
                                <p className={styles.routineDesc}>{t(`routine.step${n}.desc`)}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </section>
        </div>
    );
}
