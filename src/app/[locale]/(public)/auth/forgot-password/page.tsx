'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/pocketbase/AuthProvider';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import styles from '@/components/auth/AuthForms.module.css';

export default function ForgotPasswordPage() {
    const t = useTranslations();
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');

        if (!email || !email.includes('@')) {
            setError(t('errors.invalidEmail'));
            return;
        }

        setIsLoading(true);
        try {
            await resetPassword(email);
            setIsSent(true);
        } catch (err) {
            const { logError } = await import('@/lib/utils/errors');
            logError(err, { component: 'ForgotPasswordPage', action: 'resetPassword' });
            setError(t('errors.networkError'));
        } finally {
            setIsLoading(false);
        }
    }

    if (isSent) {
        return (
            <div className={styles.formContainer}>
                <div className={styles.successBlock}>
                    <CheckCircle size={48} strokeWidth={1.5} />
                    <h1 className={styles.title}>{t('auth.resetPassword')}</h1>
                    <p className={styles.description}>{t('auth.resetSuccess')}</p>
                </div>
                <Link href="/auth/login" className={styles.submitBtnBlock}>
                    {t('auth.signIn')}
                </Link>
            </div>
        );
    }

    return (
        <div className={styles.formContainer}>
            <Link href="/auth/login" className={styles.backLink}>
                <ArrowLeft size={18} />
                {t('auth.signIn')}
            </Link>

            <h1 className={styles.title}>{t('auth.resetPassword')}</h1>
            <p className={styles.description}>{t('auth.resetDescription')}</p>

            {error && (
                <div className={styles.errorBanner} role="alert">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.field}>
                    <label htmlFor="reset-email" className={`${styles.label} ${styles.iconLabel}`}>
                        <Mail size={16} aria-hidden="true" />
                        {t('auth.email')}
                    </label>
                    <input
                        id="reset-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={styles.input}
                        autoComplete="email"
                        required
                        autoFocus
                        disabled={isLoading}
                        placeholder="your@email.com"
                    />
                </div>

                <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={isLoading || !email}
                >
                    {isLoading ? t('app.loading') : t('auth.sendResetLink')}
                </button>
            </form>
        </div>
    );
}
