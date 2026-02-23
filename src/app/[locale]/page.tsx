'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/pocketbase/AuthProvider';
import styles from './page.module.css';

export default function HomePage() {
    const t = useTranslations();
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    // Redirect authenticated users to dashboard
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.replace('/dashboard');
        }
    }, [isLoading, isAuthenticated, router]);

    return (
        <div className={styles.page}>
            <main className={styles.main}>
                <div className={styles.hero}>
                    <h1 className={styles.title}>{t('app.title')}</h1>
                    <p className={styles.description}>{t('app.description')}</p>
                </div>
                <div className={styles.actions}>
                    <Link href="/auth/login" className={styles.primaryBtn}>
                        {t('auth.login')}
                    </Link>
                    <Link href="/auth/register" className={styles.secondaryBtn}>
                        {t('auth.register')}
                    </Link>
                </div>
                <div className={styles.languageSwitcher}>
                    <span className={styles.languageLabel}>{t('language.label')}:</span>
                    <Link href="/" locale="ru" className={styles.langLink}>
                        {t('language.ru')}
                    </Link>
                    <Link href="/" locale="en" className={styles.langLink}>
                        {t('language.en')}
                    </Link>
                    <Link href="/" locale="cn" className={styles.langLink}>
                        {t('language.cn')}
                    </Link>
                </div>
            </main>
        </div>
    );
}
