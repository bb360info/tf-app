'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import styles from './not-found.module.css';

// not-found.tsx at [locale] level: 'use client' + useTranslations() works
// because NextIntlClientProvider is mounted in the locale layout above.
export default function NotFound() {
    const t = useTranslations('app');

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <p className={styles.code}>404</p>
                <h1 className={styles.title}>{t('notFound')}</h1>
                <p className={styles.description}>{t('notFoundDescription')}</p>
                <Link href="/" className={styles.homeBtn}>
                    {t('goHome')}
                </Link>
            </div>
        </div>
    );
}
