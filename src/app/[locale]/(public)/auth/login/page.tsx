'use client';

import LoginForm from '@/components/auth/LoginForm';
import { PageWrapper } from '@/components/shared/PageWrapper';
import styles from './auth.module.css';

export default function LoginPage() {
    return (
        <div className={styles.authPage}>
            <PageWrapper maxWidth="narrow">
                <LoginForm />
            </PageWrapper>
        </div>
    );
}
