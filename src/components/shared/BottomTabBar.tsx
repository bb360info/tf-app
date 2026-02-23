'use client';

import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import {
    LayoutDashboard,
    Dumbbell,
    BarChart3,
    BookOpen,
    Settings,
} from 'lucide-react';
import styles from './BottomTabBar.module.css';

const TABS = [
    { key: 'dashboard', path: '/dashboard', icon: LayoutDashboard },
    { key: 'training', path: '/training', icon: Dumbbell },
    { key: 'analytics', path: '/analytics', icon: BarChart3 },
    { key: 'reference', path: '/reference', icon: BookOpen },
    { key: 'settings', path: '/settings', icon: Settings },
] as const;

export function BottomTabBar() {
    const locale = useLocale();
    const pathname = usePathname();
    const t = useTranslations('nav');

    return (
        <nav className={styles.tabBar} role="tablist" aria-label="Main navigation">
            {TABS.map(({ key, path, icon: Icon }) => {
                const href = `/${locale}${path}`;
                const isActive = pathname.startsWith(href);

                return (
                    <Link
                        key={key}
                        href={href}
                        role="tab"
                        aria-selected={isActive}
                        className={`${styles.tab} ${isActive ? styles.active : ''}`}
                    >
                        <Icon size={22} aria-hidden="true" strokeWidth={isActive ? 2.2 : 1.8} />
                        <span className={styles.label}>{t(key)}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
