'use client';

import RegisterForm from '@/components/auth/RegisterForm';
import { PageWrapper } from '@/components/shared/PageWrapper';
import styles from '../login/auth.module.css';

export default function RegisterPage() {
    return (
        <div className={styles.authPage}>
            <PageWrapper maxWidth="narrow">
                <RegisterForm />
            </PageWrapper>
        </div>
    );
}
