'use client';

import { useTranslations } from 'next-intl';
import { ExerciseCatalog } from '@/components/exercises/ExerciseCatalog';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageWrapper } from '@/components/shared/PageWrapper';
import styles from './exercises.module.css';

export default function ExercisesPage() {
    const t = useTranslations('exercises');

    return (
        <div className={styles.page}>
            <PageWrapper maxWidth="standard">
                <PageHeader
                    title={t('title')}
                    subtitle={t('subtitle')}
                />

                <ExerciseCatalog />
            </PageWrapper>
        </div>
    );
}
