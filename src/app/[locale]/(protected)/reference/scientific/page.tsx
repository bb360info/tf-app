'use client';

import { useTranslations, useLocale } from 'next-intl';
import { FlaskConical } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageWrapper } from '@/components/shared/PageWrapper';
import styles from '../reference.module.css';

interface TableRow {
    aspect: string;
    tra: string;
    dup: string;
}

export default function ScientificPage() {
    const t = useTranslations('reference.scientific');
    const locale = useLocale();

    const rows = t.raw('tra_dup.rows') as TableRow[];
    const rules = t.raw('peaking.rules') as string[];

    return (
        <div className={styles.page}>
            <PageWrapper maxWidth="standard">
                <PageHeader
                    title={t('title')}
                    backHref={`/${locale}/reference`}
                />

                <div className={styles.container} style={{ paddingTop: 'var(--space-6)' }}>
                    {/* TRA vs DUP Table */}
                    <div className={styles.articleSection}>
                        <p className={styles.sectionTitle}>
                            <FlaskConical size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} aria-hidden="true" />
                            {t('tra_dup.heading')}
                        </p>
                        <div style={{ overflowX: 'auto' }}>
                            <table className={styles.sciTable}>
                                <thead>
                                    <tr>
                                        <th style={{ minWidth: 100 }}></th>
                                        <th>{t('tra_dup.tra_label')}</th>
                                        <th>{t('tra_dup.dup_label')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, i) => (
                                        <tr key={i}>
                                            <td>{row.aspect}</td>
                                            <td>{row.tra}</td>
                                            <td>{row.dup}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Peaking Rules */}
                    <div className={styles.articleSection}>
                        <p className={styles.sectionTitle}>{t('peaking.heading')}</p>
                        <ul className={styles.peakingList}>
                            {rules.map((rule, i) => (
                                <li key={i} className={styles.peakingItem}>
                                    <span className={styles.peakingDot} aria-hidden="true" />
                                    {rule}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
