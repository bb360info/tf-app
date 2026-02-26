'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Loader2, ShieldCheck, Dumbbell } from 'lucide-react';
import pb from '@/lib/pocketbase/client';
import { updateUserRole } from '@/lib/pocketbase/auth';
import { getMyPreferences } from '@/lib/pocketbase/services/preferences';
import { getPendingInvite, joinWithPendingInvite } from '@/lib/utils/pendingInvite';
import styles from './OAuthRolePicker.module.css';

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

export default function OAuthRolePicker() {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnTo = searchParams.get('returnTo');

    const [hasPendingInvite, setHasPendingInvite] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const loginHref = useMemo(
        () => (returnTo ? `/${locale}/auth/login?returnTo=${encodeURIComponent(returnTo)}` : `/${locale}/auth/login`),
        [locale, returnTo]
    );

    useEffect(() => {
        if (!pb.authStore.isValid || !pb.authStore.record) {
            router.replace(loginHref);
            return;
        }
        setHasPendingInvite(getPendingInvite() !== null);
        setIsReady(true);
    }, [loginHref, router]);

    async function redirectAfterRoleSelection() {
        if (returnTo) {
            window.location.href = decodeURIComponent(returnTo);
            return;
        }
        const done = await isOnboardingDone();
        router.push(done ? '/dashboard' : '/onboarding');
    }

    async function applyRole(role: 'coach' | 'athlete') {
        if (isLoading) return;
        setError('');
        setIsLoading(true);
        try {
            await updateUserRole(role);
            if (role === 'athlete') {
                if (!hasPendingInvite) {
                    setError(t('auth.athleteInviteOnlyError'));
                    return;
                }
                const joinResult = await joinWithPendingInvite();
                if (joinResult.status !== 'joined' && joinResult.status !== 'alreadyMember') {
                    if (joinResult.status === 'invalidOrExpired') {
                        setError(t('auth.inviteExpiredLogin'));
                        return;
                    }
                    if (joinResult.status === 'coachCannotJoin') {
                        setError(t('auth.inviteCoachBlocked'));
                        return;
                    }
                    if (joinResult.status === 'none') {
                        setError(t('auth.athleteInviteOnlyError'));
                        return;
                    }
                    setError(t('auth.inviteJoinFailed'));
                    return;
                }
            }
            await redirectAfterRoleSelection();
        } catch {
            setError(t('auth.roleApplyFailed'));
        } finally {
            setIsLoading(false);
        }
    }

    if (!isReady) {
        return (
            <div className={styles.loadingWrap}>
                <Loader2 size={20} className={styles.spin} aria-hidden />
                <span>{t('app.loading')}</span>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>{t('auth.oauthRoleTitle')}</h1>
            <p className={styles.subtitle}>{t('auth.oauthRoleSubtitle')}</p>

            {error && (
                <div className={styles.errorBanner} role="alert">
                    {error}
                </div>
            )}

            <div className={styles.optionList}>
                <button
                    type="button"
                    className={styles.roleCard}
                    onClick={() => void applyRole('coach')}
                    disabled={isLoading}
                >
                    <div className={styles.roleIcon}>
                        <ShieldCheck size={18} aria-hidden />
                    </div>
                    <div className={styles.roleText}>
                        <span className={styles.roleName}>{t('auth.continueAsCoach')}</span>
                        <span className={styles.roleHint}>{t('auth.coachRoleHint')}</span>
                    </div>
                </button>

                <button
                    type="button"
                    className={`${styles.roleCard} ${!hasPendingInvite ? styles.roleCardDisabled : ''}`}
                    onClick={() => void applyRole('athlete')}
                    disabled={isLoading || !hasPendingInvite}
                    aria-disabled={!hasPendingInvite}
                >
                    <div className={styles.roleIcon}>
                        <Dumbbell size={18} aria-hidden />
                    </div>
                    <div className={styles.roleText}>
                        <span className={styles.roleName}>{t('auth.continueAsAthlete')}</span>
                        <span className={styles.roleHint}>
                            {hasPendingInvite ? t('auth.athleteRoleHint') : t('auth.athleteInviteOnlyHint')}
                        </span>
                    </div>
                </button>
            </div>
        </div>
    );
}
