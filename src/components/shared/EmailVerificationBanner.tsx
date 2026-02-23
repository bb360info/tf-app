'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Mail, X, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { requestEmailVerification } from '@/lib/pocketbase/auth';
import styles from './EmailVerificationBanner.module.css';

/**
 * Shows a dismissable banner when user email is not verified.
 * Dismiss persists per session (sessionStorage) — shows again on next visit.
 */
export function EmailVerificationBanner() {
    const t = useTranslations('auth');
    const { user } = useAuth();
    const [dismissed, setDismissed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return sessionStorage.getItem('email_verify_dismissed') === '1';
    });
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);

    // Don't show if verified, dismissed, or no user
    if (!user || user.verified || dismissed) return null;

    async function handleResend() {
        if (!user?.email || resending) return;
        setResending(true);
        try {
            await requestEmailVerification(user.email);
            setResent(true);
        } catch {
            /* non-critical: email re-send */
        } finally {
            setResending(false);
        }
    }

    function handleDismiss() {
        setDismissed(true);
        sessionStorage.setItem('email_verify_dismissed', '1');
    }

    return (
        <div className={styles.banner} role="alert">
            <div className={styles.content}>
                <Mail size={18} className={styles.icon} aria-hidden="true" />
                <div className={styles.text}>
                    <span className={styles.title}>{t('emailVerification')}</span>
                    {resent ? (
                        <span className={styles.sent}>
                            {t('emailVerificationSent', { email: user.email })}
                        </span>
                    ) : (
                        <button
                            type="button"
                            className={styles.resendBtn}
                            onClick={handleResend}
                            disabled={resending}
                        >
                            <RefreshCw size={14} className={resending ? styles.spinning : ''} />
                            {t('resendVerification')}
                        </button>
                    )}
                </div>
            </div>
            <button
                type="button"
                className={styles.dismissBtn}
                onClick={handleDismiss}
                aria-label={t('close') || 'Close'}
            >
                <X size={16} />
            </button>
        </div>
    );
}
