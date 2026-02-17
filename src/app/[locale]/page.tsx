'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import styles from './page.module.css';

export default function HomePage() {
    const t = useTranslations();

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
