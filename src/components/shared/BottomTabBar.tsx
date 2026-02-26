'use client';

import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
    LayoutDashboard,
    Dumbbell,
    BarChart3,
    Menu,
    Users
} from 'lucide-react';
import styles from './BottomTabBar.module.css';
import { useAuth } from '@/lib/hooks/useAuth';

type TabDefinition = {
    key: string;
    path: string;
    icon: React.ElementType;
};

const ATHLETE_TABS: TabDefinition[] = [
    { key: 'home', path: '/dashboard', icon: LayoutDashboard },
    { key: 'activity', path: '/training', icon: Dumbbell },
    { key: 'stats', path: '/analytics', icon: BarChart3 },
    { key: 'more', path: '/more', icon: Menu },
];

const COACH_TABS: TabDefinition[] = [
    { key: 'team', path: '/dashboard', icon: Users },
    { key: 'training', path: '/training', icon: Dumbbell },
    { key: 'more', path: '/more', icon: Menu },
];

export function BottomTabBar() {
    const locale = useLocale();
    const pathname = usePathname();
    const t = useTranslations('nav');
    const { isCoach } = useAuth();

    const tabs = isCoach ? COACH_TABS : ATHLETE_TABS;

    return (
        <nav className={styles.tabBar} role="tablist" aria-label="Main navigation">
            {tabs.map(({ key, path, icon: Icon }) => {
                const expectedPath = `/${locale}${path}`;
                const isActive = pathname.startsWith(expectedPath) && (path === '/dashboard' ? pathname === expectedPath : true);

                return (
                    <Link
                        key={key}
                        href={path}
                        role="tab"
                        aria-selected={isActive}
                        className={`${styles.tab} ${isActive ? styles.active : ''}`}
                    >
                        <div className={styles.iconWrapper}>
                            <Icon size={22} aria-hidden="true" strokeWidth={isActive ? 2.2 : 1.8} />
                        </div>
                        <span className={styles.label}>{t(key)}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
