'use client';

import { Suspense } from 'react';
import OAuthRolePicker from '@/components/auth/OAuthRolePicker';
import { PageWrapper } from '@/components/shared/PageWrapper';
import styles from '../login/auth.module.css';

function OAuthRoleFallback() {
    return null;
}

export default function OAuthRolePage() {
    return (
        <div className={styles.authPage}>
            <PageWrapper maxWidth="narrow">
                <Suspense fallback={<OAuthRoleFallback />}>
                    <OAuthRolePicker />
                </Suspense>
            </PageWrapper>
        </div>
    );
}
