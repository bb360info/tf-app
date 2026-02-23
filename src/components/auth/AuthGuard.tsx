'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuth } from '@/lib/pocketbase/AuthProvider';
import styles from './AuthGuard.module.css';

interface AuthGuardProps {
    children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            // Encode current path for redirect after login
            const returnTo = encodeURIComponent(pathname);
            router.replace(`/${locale}/auth/login?returnTo=${returnTo}`);
        }
    }, [isLoading, isAuthenticated, router, pathname, locale]);

    if (isLoading) {
        return (
            <div className={styles.guardLoading}>
                <div className={styles.spinner} aria-label="Loading..." />
            </div>
        );
    }

    if (!isAuthenticated) {
        // Still rendering while redirect happens
        return (
            <div className={styles.guardLoading}>
                <div className={styles.spinner} aria-label="Redirecting..." />
            </div>
        );
    }

    return <>{children}</>;
}
