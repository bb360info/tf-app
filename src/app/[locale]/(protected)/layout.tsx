'use client';

import { useCallback } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { BottomTabBar } from '@/components/shared/BottomTabBar';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useTranslations } from 'next-intl';
import { ToastProvider } from '@/components/ui/ToastProvider';
import styles from './protected.module.css';

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const handleError = useCallback(
        async (error: Error, info: { componentStack: string | null }) => {
            try {
                const { reportError } = await import('@/lib/telemetry');
                await reportError({
                    error: error.message,
                    stack: error.stack,
                    componentStack: info.componentStack ?? '',
                    url: typeof window !== 'undefined' ? window.location.href : '',
                    device_info:
                        typeof navigator !== 'undefined' ? navigator.userAgent : '',
                });
            } catch {
                // Telemetry failure is never critical
            }
        },
        []
    );

    const tErrors = useTranslations('errors');

    return (
        <AuthGuard>
            <ToastProvider>
                <ErrorBoundary
                    onError={handleError}
                    labels={{
                        title: tErrors('title'),
                        fallbackMessage: tErrors('fallbackMessage'),
                        retry: tErrors('retry'),
                    }}
                >
                    <div className={styles.protectedContainer}>
                        {children}
                    </div>
                </ErrorBoundary>
                <BottomTabBar />
            </ToastProvider>
        </AuthGuard>
    );
}
