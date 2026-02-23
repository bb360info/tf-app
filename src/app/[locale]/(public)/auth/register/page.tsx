'use client';

import RegisterForm from '@/components/auth/RegisterForm';
import styles from '../login/auth.module.css';

export default function RegisterPage() {
    return (
        <div className={styles.authPage}>
            <RegisterForm />
        </div>
    );
}
