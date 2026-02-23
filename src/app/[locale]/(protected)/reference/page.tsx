'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Target, AlertTriangle, CalendarDays, Shield, FlaskConical, ChevronRight, Dumbbell, Wind, Brain, LayoutList } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageWrapper } from '@/components/shared/PageWrapper';
import styles from './reference.module.css';

const CATEGORIES = [
    { slug: 'technique', icon: Target, colorCls: 'var(--color-accent-primary)' },
    { slug: 'errors', icon: AlertTriangle, colorCls: 'var(--color-error)' },
    { slug: 'periodization', icon: CalendarDays, colorCls: 'var(--color-success)' },
    { slug: 'injuries', icon: Shield, colorCls: 'var(--color-warning)' },
] as const;

export default function ReferencePage() {
    const t = useTranslations('reference');
    const tEx = useTranslations('exercises');
    const tTemplates = useTranslations('templates');
    const locale = useLocale();

    return (
        <div className={styles.page}>
            <PageWrapper maxWidth="standard">
                {/* Header */}
                <PageHeader title={t('title')} />

                {/* Hero */}
                <div className={styles.hero}>
                    <p className={styles.heroSubtitle}>{t('subtitle')}</p>
                </div>

                <div className={styles.container}>
                    {/* Category cards */}
                    <div className={styles.categoryGrid}>
                        {CATEGORIES.map(({ slug, icon: Icon, colorCls }) => (
                            <Link
                                key={slug}
                                href={`/${locale}/reference/${slug}`}
                                className={styles.categoryCard}
                            >
                                <div
                                    className={styles.categoryIcon}
                                    style={{
                                        background: `color-mix(in srgb, ${colorCls} 12%, transparent)`,
                                        color: colorCls,
                                    }}
                                >
                                    <Icon size={20} aria-hidden="true" />
                                </div>
                                <p className={styles.categoryTitle}>
                                    {t(`categories.${slug}.title`)}
                                </p>
                                <p className={styles.categoryDesc}>
                                    {t(`categories.${slug}.desc`)}
                                </p>
                            </Link>
                        ))}
                    </div>

                    {/* Exercise Library card */}
                    <Link href={`/${locale}/reference/exercises`} className={styles.sciCard}>
                        <div
                            className={styles.categoryIcon}
                            style={{ background: 'color-mix(in srgb, var(--color-plyometric) 12%, transparent)', color: 'var(--color-plyometric)' }}
                        >
                            <Dumbbell size={20} aria-hidden="true" />
                        </div>
                        <div className={styles.sciCardText}>
                            <p className={styles.sciCardTitle}>{tEx('referenceCard.title')}</p>
                            <p className={styles.sciCardDesc}>{tEx('referenceCard.desc')}</p>
                        </div>
                        <ChevronRight size={20} color="var(--color-text-tertiary)" aria-hidden="true" />
                    </Link>

                    {/* Warmup card */}
                    <Link href={`/${locale}/reference/warmup`} className={styles.sciCard}>
                        <div
                            className={styles.categoryIcon}
                            style={{ background: 'color-mix(in srgb, var(--color-success) 12%, transparent)', color: 'var(--color-success)' }}
                        >
                            <Wind size={20} aria-hidden="true" />
                        </div>
                        <div className={styles.sciCardText}>
                            <p className={styles.sciCardTitle}>{t('categories.warmup.title')}</p>
                            <p className={styles.sciCardDesc}>{t('categories.warmup.desc')}</p>
                        </div>
                        <ChevronRight size={20} color="var(--color-text-tertiary)" aria-hidden="true" />
                    </Link>

                    {/* Training Templates card */}
                    <Link href={`/${locale}/reference/templates`} className={styles.sciCard}>
                        <div
                            className={styles.categoryIcon}
                            style={{ background: 'color-mix(in srgb, var(--color-accent-primary) 12%, transparent)', color: 'var(--color-accent-primary)' }}
                        >
                            <LayoutList size={20} aria-hidden="true" />
                        </div>
                        <div className={styles.sciCardText}>
                            <p className={styles.sciCardTitle}>{tTemplates('referenceCard.title')}</p>
                            <p className={styles.sciCardDesc}>{tTemplates('referenceCard.desc')}</p>
                        </div>
                        <ChevronRight size={20} color="var(--color-text-tertiary)" aria-hidden="true" />
                    </Link>

                    <Link href={`/${locale}/reference/mental`} className={styles.sciCard}>
                        <div
                            className={styles.categoryIcon}
                            style={{ background: 'color-mix(in srgb, var(--color-accent-primary) 12%, transparent)', color: 'var(--color-accent-primary)' }}
                        >
                            <Brain size={20} aria-hidden="true" />
                        </div>
                        <div className={styles.sciCardText}>
                            <p className={styles.sciCardTitle}>{t('categories.mental.title')}</p>
                            <p className={styles.sciCardDesc}>{t('categories.mental.desc')}</p>
                        </div>
                        <ChevronRight size={20} color="var(--color-text-tertiary)" aria-hidden="true" />
                    </Link>

                    {/* Scientific data card */}
                    <Link href={`/${locale}/reference/scientific`} className={styles.sciCard}>
                        <div
                            className={styles.categoryIcon}
                            style={{ background: 'color-mix(in srgb, var(--color-strength) 12%, transparent)', color: 'var(--color-strength)' }}
                        >
                            <FlaskConical size={20} aria-hidden="true" />
                        </div>
                        <div className={styles.sciCardText}>
                            <p className={styles.sciCardTitle}>{t('scientific.title')}</p>
                            <p className={styles.sciCardDesc}>{t('scientific.subtitle')}</p>
                        </div>
                        <ChevronRight size={20} color="var(--color-text-tertiary)" aria-hidden="true" />
                    </Link>
                </div>
            </PageWrapper>
        </div>
    );
}
