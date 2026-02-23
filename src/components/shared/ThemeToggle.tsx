'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from '@/lib/theme/ThemeProvider';
import styles from './ThemeToggle.module.css';

type ThemeMode = 'light' | 'dark' | 'auto';

const OPTIONS: Array<{ mode: ThemeMode; icon: typeof Sun; labelKey: string }> = [
    { mode: 'light', icon: Sun, labelKey: 'themeLight' },
    { mode: 'auto', icon: Monitor, labelKey: 'themeAuto' },
    { mode: 'dark', icon: Moon, labelKey: 'themeDark' },
];

export function ThemeToggle() {
    const { mode, setMode } = useTheme();
    const t = useTranslations('settings');

    return (
        <div className={styles.wrap} role="group" aria-label={t('theme')}>
            {OPTIONS.map(({ mode: m, icon: Icon, labelKey }) => (
                <button
                    key={m}
                    type="button"
                    className={`${styles.btn} ${mode === m ? styles.active : ''}`}
                    onClick={() => setMode(m)}
                    aria-pressed={mode === m}
                    aria-label={t(labelKey)}
                    title={t(labelKey)}
                >
                    <Icon size={18} aria-hidden="true" />
                </button>
            ))}
        </div>
    );
}
