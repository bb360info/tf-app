'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/pocketbase/AuthProvider';
import { Link } from '@/i18n/navigation';
import { RegisterSchema } from '@/lib/validation/core';
import { getMyPreferences } from '@/lib/pocketbase/services/preferences';
import pb from '@/lib/pocketbase/client';
import styles from './AuthForms.module.css';

async function isOnboardingDone(): Promise<boolean> {
    if (typeof window !== 'undefined' && localStorage.getItem('onboarding_done') === '1') {
        return true;
    }
    try {
        const prefs = await getMyPreferences();
        if (prefs?.onboarding_complete) {
            localStorage.setItem('onboarding_done', '1');
            return true;
        }
    } catch {
        /* ignore */
    }
    return false;
}

export default function RegisterForm() {
    const t = useTranslations();
    const router = useRouter();
    const { register, loginGoogle } = useAuth();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasPendingInvite, setHasPendingInvite] = useState(false);
    const returnTo = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('returnTo')
        : null;
    const oauthRoleHref = returnTo
        ? `/auth/oauth-role?returnTo=${encodeURIComponent(returnTo)}`
        : '/auth/oauth-role';
    const loginHref = returnTo
        ? `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
        : '/auth/login';

    useEffect(() => {
        // Lazy import: pendingInvite.ts only loaded when needed
        import('@/lib/utils/pendingInvite').then(({ getPendingInvite }) => {
            if (getPendingInvite() !== null) {
                setHasPendingInvite(true);
            }
        });
    }, []);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');

        // Validate with Zod
        const result = RegisterSchema.safeParse({
            email,
            first_name: firstName,
            last_name: lastName,
            password,
            passwordConfirm,
            role: hasPendingInvite ? 'athlete' : 'coach',
        });

        if (!result.success) {
            const firstIssue = result.error.issues[0];
            const field = firstIssue?.path[0];
            if (field === 'email') {
                setError(t('errors.invalidEmail'));
            } else if (field === 'first_name') {
                setError(t('errors.required'));
            } else if (field === 'passwordConfirm') {
                setError(t('errors.passwordMismatch'));
            } else {
                setError(t('errors.passwordMin'));
            }
            return;
        }

        setIsLoading(true);
        try {
            const role = hasPendingInvite ? 'athlete' : 'coach';
            await register({
                email,
                password,
                first_name: firstName,
                last_name: lastName,
                role,
                allowAthleteViaInvite: hasPendingInvite,
            });
            router.push('/onboarding');
        } catch (err) {
            const { logError } = await import('@/lib/utils/errors');
            logError(err, { component: 'RegisterForm', action: 'register' });
            const message = err instanceof Error ? err.message : String(err);
            if (message.includes('athleteInviteOnly')) {
                setError(t('auth.athleteInviteOnlyError'));
            } else {
                setError(t('errors.registerFailed'));
            }
        } finally {
            setIsLoading(false);
        }
    }

    async function handleGoogleRegister() {
        setError('');
        setIsLoading(true);
        try {
            const authData = await loginGoogle();
            const role = (authData.record?.role as string | undefined) ?? (pb.authStore.record?.role as string | undefined);
            const isNewOAuthUser = Boolean((authData as { meta?: { isNew?: boolean } }).meta?.isNew);
            const invalidRole = role !== 'coach' && role !== 'athlete';

            if (isNewOAuthUser || invalidRole) {
                router.push(oauthRoleHref);
                return;
            }

            if (role === 'athlete') {
                const { joinWithPendingInvite } = await import('@/lib/utils/pendingInvite');
                const joinResult = await joinWithPendingInvite();
                if (joinResult.status === 'invalidOrExpired') {
                    setError(t('auth.inviteExpiredLogin'));
                    return;
                }
                if (joinResult.status === 'coachCannotJoin') {
                    setError(t('auth.inviteCoachBlocked'));
                    return;
                }
                if (joinResult.status === 'error') {
                    setError(t('auth.inviteJoinFailed'));
                    return;
                }
            }

            if (returnTo) {
                window.location.href = decodeURIComponent(returnTo);
                return;
            }
            const done = await isOnboardingDone();
            router.push(done ? '/dashboard' : '/onboarding');
        } catch (err) {
            const { logError } = await import('@/lib/utils/errors');
            logError(err, { component: 'RegisterForm', action: 'googleRegister' });
            setError(t('errors.registerFailed'));
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className={styles.formContainer}>
            <h1 className={styles.title}>{t('auth.register')}</h1>

            {error && (
                <div className={styles.errorBanner} role="alert">
                    {error}
                </div>
            )}

            {/* Invite banner — shown when user arrived via an invite link */}
            {hasPendingInvite && (
                <div className={styles.infoBanner} role="note">
                    {t('auth.inviteBanner')}
                </div>
            )}

            {!hasPendingInvite && (
                <div className={styles.infoBanner} role="note">
                    {t('auth.athleteInviteOnlyHint')}
                </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
                {/* First Name + Last Name side-by-side */}
                <div className={styles.nameRow}>
                    <div className={styles.field}>
                        <label htmlFor="register-first-name" className={styles.label}>
                            {t('auth.firstName')}
                        </label>
                        <input
                            id="register-first-name"
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder={t('auth.firstNamePlaceholder')}
                            className={styles.input}
                            autoComplete="given-name"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="register-last-name" className={styles.label}>
                            {t('auth.lastName')}
                        </label>
                        <input
                            id="register-last-name"
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder={t('auth.lastNamePlaceholder')}
                            className={styles.input}
                            autoComplete="family-name"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className={styles.field}>
                    <label htmlFor="register-email" className={styles.label}>
                        {t('auth.email')}
                    </label>
                    <input
                        id="register-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={styles.input}
                        autoComplete="email"
                        required
                        disabled={isLoading}
                    />
                </div>

                <div className={styles.field}>
                    <label htmlFor="register-password" className={styles.label}>
                        {t('auth.password')}
                    </label>
                    <input
                        id="register-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={styles.input}
                        autoComplete="new-password"
                        required
                        minLength={8}
                        disabled={isLoading}
                    />
                </div>

                <div className={styles.field}>
                    <label htmlFor="register-password-confirm" className={styles.label}>
                        {t('auth.confirmPassword')}
                    </label>
                    <input
                        id="register-password-confirm"
                        type="password"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        className={styles.input}
                        autoComplete="new-password"
                        required
                        minLength={8}
                        disabled={isLoading}
                    />
                </div>

                <p className={styles.terms}>{t('auth.termsAgree')}</p>

                <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={isLoading}
                >
                    {isLoading ? t('app.loading') : t('auth.signUp')}
                </button>
            </form>

            <div className={styles.divider}>
                <span>{t('auth.orContinueWith')}</span>
            </div>

            <button
                type="button"
                className={styles.googleBtn}
                onClick={handleGoogleRegister}
                disabled={isLoading}
            >
                <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
                    <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                    />
                    <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                    />
                    <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                    />
                    <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                    />
                </svg>
                {t('auth.registerWithGoogle')}
            </button>

            <p className={styles.switchLink}>
                {t('auth.hasAccount')}{' '}
                <Link href={loginHref}>{t('auth.signIn')}</Link>
            </p>
        </div>
    );
}
