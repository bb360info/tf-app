import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageWrapper } from '@/components/shared/PageWrapper';
import JoinContent from './JoinContent';
import styles from './join.module.css';

// Generic OG tags for link preview in messengers.
// Cannot be group-specific: Next.js Static Export has no runtime server for dynamic metadata.
export const metadata: Metadata = {
    title: 'Join Group — Jumpedia',
    description: 'Your coach invites you to join a training group on Jumpedia',
    openGraph: {
        title: 'Join Group — Jumpedia',
        description: 'Your coach invites you to join a training group on Jumpedia',
        type: 'website',
    },
};

function JoinSkeleton() {
    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.skeletonIcon} />
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonText} />
                <div className={styles.skeletonBtn} />
            </div>
        </div>
    );
}

/**
 * /join?code=XXXXXX — Invite link landing page.
 *
 * Must be wrapped in <Suspense> because JoinContent uses useSearchParams(),
 * which is not allowed outside Suspense in Next.js Static Export (output: 'export').
 * Without this wrapper, `pnpm build` would fail with a "missing Suspense boundary" error.
 */
export default function JoinPage() {
    return (
        <PageWrapper maxWidth="narrow">
            <Suspense fallback={<JoinSkeleton />}>
                <JoinContent />
            </Suspense>
        </PageWrapper>
    );
}
