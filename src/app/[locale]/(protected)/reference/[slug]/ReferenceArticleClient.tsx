'use client';

import { useTranslations, useLocale } from 'next-intl';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageWrapper } from '@/components/shared/PageWrapper';
import styles from '../reference.module.css';

type Slug = 'technique' | 'errors' | 'periodization' | 'injuries';

// ── Technique Article ─────────────────────────────────
function TechniqueArticle({ t }: { t: ReturnType<typeof useTranslations> }) {
    const phases: Array<{ name: string; desc: string }> =
        t.raw('reference.technique.phases') as Array<{ name: string; desc: string }>;

    return (
        <div className={styles.articleSection}>
            <p className={styles.sectionTitle}>{t('reference.technique.title')}</p>
            <div className={styles.phaseList}>
                {phases.map((phase, i) => (
                    <div key={i} className={styles.phaseItem}>
                        <div className={styles.phaseNum}>{i + 1}</div>
                        <div>
                            <p className={styles.phaseName}>{phase.name}</p>
                            <p className={styles.phaseDesc}>{phase.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Errors Article ────────────────────────────────────
function ErrorsArticle({ t }: { t: ReturnType<typeof useTranslations> }) {
    const items: Array<{ error: string; fix: string }> =
        t.raw('reference.errors.items') as Array<{ error: string; fix: string }>;

    return (
        <div className={styles.articleSection}>
            <p className={styles.sectionTitle}>{t('reference.errors.title')}</p>
            <div className={styles.errorList}>
                {items.map((item, i) => (
                    <div key={i} className={styles.errorItem}>
                        <p className={styles.errorLabel}>{item.error}</p>
                        <p className={styles.phaseDesc}>
                            <span className={styles.errorFixLabel}>→ </span>
                            {item.fix}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Periodization Article ─────────────────────────────
function PeriodizationArticle({ t }: { t: ReturnType<typeof useTranslations> }) {
    const phases: Array<{ name: string; duration: string; focus: string }> =
        t.raw('reference.periodization.phases') as Array<{ name: string; duration: string; focus: string }>;

    return (
        <div className={styles.articleSection}>
            <p className={styles.sectionTitle}>{t('reference.periodization.title')}</p>
            <div className={styles.periodTable}>
                {phases.map((phase, i) => (
                    <div key={i} className={styles.periodRow}>
                        <div>
                            <p className={styles.periodName}>{phase.name}</p>
                            <p className={styles.periodDuration}>{phase.duration}</p>
                        </div>
                        <p className={styles.periodFocus}>{phase.focus}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Injuries Article ──────────────────────────────────
function InjuriesArticle({ t }: { t: ReturnType<typeof useTranslations> }) {
    const items: Array<{ injury: string; cause: string; prevention: string }> =
        t.raw('reference.injuries.items') as Array<{ injury: string; cause: string; prevention: string }>;

    return (
        <div className={styles.articleSection}>
            <p className={styles.sectionTitle}>{t('reference.injuries.title')}</p>
            <div className={styles.injuryList}>
                {items.map((item, i) => (
                    <div key={i} className={styles.injuryItem}>
                        <p className={styles.injuryName}>{item.injury}</p>
                        <p className={styles.injuryCause}>{item.cause}</p>
                        <p className={styles.injuryPrevention}>
                            <span className={styles.injuryPrevLabel}>▲ </span>
                            {item.prevention}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Main Client Component ─────────────────────────────
export default function ReferenceArticleClient({ slug }: { slug: Slug }) {
    const t = useTranslations();
    const locale = useLocale();

    const articleTitle =
        slug === 'technique' ? t('reference.technique.title') :
            slug === 'errors' ? t('reference.errors.title') :
                slug === 'periodization' ? t('reference.periodization.title') :
                    t('reference.injuries.title');

    return (
        <div className={styles.page}>
            <PageWrapper maxWidth="standard">
                <PageHeader
                    title={articleTitle}
                    backHref={`/${locale}/reference`}
                />

                <div className={styles.container} style={{ paddingTop: 'var(--space-6)' }}>
                    {slug === 'technique' && <TechniqueArticle t={t} />}
                    {slug === 'errors' && <ErrorsArticle t={t} />}
                    {slug === 'periodization' && <PeriodizationArticle t={t} />}
                    {slug === 'injuries' && <InjuriesArticle t={t} />}
                </div>
            </PageWrapper>
        </div>
    );
}
