'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import styles from './LocaleSwitcher.module.css';

const LOCALES = [
    { code: 'ru', label: 'RU' },
    { code: 'en', label: 'EN' },
    { code: 'cn', label: '中文' },
] as const;

type Locale = typeof LOCALES[number]['code'];

export function LocaleSwitcher() {
    const currentLocale = useLocale();
    const pathname = usePathname();
    const router = useRouter();
    const t = useTranslations('settings');

    function switchLocale(newLocale: Locale) {
        if (newLocale === currentLocale) return;

        // Replace /[currentLocale]/ with /[newLocale]/ in pathname
        // Use replace() instead of push() so back button doesn't cycle through locales
        const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
        router.replace(newPath);
    }

    return (
        <div className={styles.wrap} role="group" aria-label={t('appLanguage')}>
            {LOCALES.map(({ code, label }) => (
                <button
                    key={code}
                    type="button"
                    className={`${styles.btn} ${currentLocale === code ? styles.active : ''}`}
                    onClick={() => switchLocale(code)}
                    aria-pressed={currentLocale === code}
                    aria-label={`Switch to ${label}`}
                    lang={code === 'cn' ? 'zh' : code}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
