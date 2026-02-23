'use client';

import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

/**
 * Client component wrapper that provides ErrorBoundary for the entire locale layout.
 * Required since layout.tsx is a Server Component but ErrorBoundary must be a Client Component.
 */
export function ErrorBoundaryWrapper({ children }: Props) {
    const t = useTranslations('errors');

    return (
        <ErrorBoundary
            labels={{
                title: t('title'),
                fallbackMessage: t('fallbackMessage'),
                retry: t('retry'),
            }}
        >
            {children}
        </ErrorBoundary>
    );
}
