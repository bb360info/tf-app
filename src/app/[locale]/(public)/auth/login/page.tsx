'use client';

import LoginForm from '@/components/auth/LoginForm';
import styles from './auth.module.css';

export default function LoginPage() {
    return (
        <div className={styles.authPage}>
            <LoginForm />
        </div>
    );
}
