'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Loader, Users, CheckCircle, AlertCircle, Info, ArrowRight } from 'lucide-react';
import pb from '@/lib/pocketbase/client';
import { joinByInviteCode } from '@/lib/pocketbase/services/groups';
import { savePendingInvite } from '@/lib/utils/pendingInvite';
import styles from './join.module.css';

type State =
    | { type: 'loading' }
    | { type: 'noCode' }
    | { type: 'joining' }
    | { type: 'success'; groupName: string }
    | { type: 'alreadyMember' }
    | { type: 'codeExpired' }
    | { type: 'invalidLink' }
    | { type: 'coachCannotJoin' }
    | { type: 'registerPrompt' };

export default function JoinContent() {
    const t = useTranslations('join');
    const searchParams = useSearchParams();
    const code = searchParams.get('code');

    const [state, setState] = useState<State>({ type: 'loading' });

    useEffect(() => {
        if (!code) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setState({ type: 'noCode' });
            return;
        }

        const authRecord = pb.authStore.record;

        // Not logged in — save pending invite and prompt registration
        if (!authRecord || !pb.authStore.isValid) {
            savePendingInvite(code);
             
            setState({ type: 'registerPrompt' });
            return;
        }

        // Coach detection BEFORE any join attempt (don't wait for server error)
        if (authRecord.role === 'coach') {
             
            setState({ type: 'coachCannotJoin' });
            return;
        }

        // Athlete is logged in — attempt to join immediately
         
        setState({ type: 'joining' });
        joinByInviteCode(code)
            .then((group) => {
                setState({ type: 'success', groupName: (group as { name?: string }).name || 'Group' });
            })
            .catch((err: unknown) => {
                const message = err instanceof Error ? err.message : String(err);
                if (message.includes('alreadyMember')) {
                    setState({ type: 'alreadyMember' });
                } else if (message.includes('invalidOrExpired')) {
                    setState({ type: 'codeExpired' });
                } else {
                    setState({ type: 'invalidLink' });
                }
            });
    }, [code]);

    // ── States ──────────────────────────────────────────────────────

    if (state.type === 'loading' || state.type === 'joining') {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <div className={`${styles.iconWrap} ${styles.iconWrapDefault}`}>
                        <Loader size={28} className={styles.spinIcon} />
                    </div>
                    <p className={styles.subtitle}>
                        {state.type === 'joining' ? t('joining') : ''}
                    </p>
                </div>
            </div>
        );
    }

    if (state.type === 'success') {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <div className={`${styles.iconWrap} ${styles.iconWrapSuccess}`}>
                        <CheckCircle size={28} />
                    </div>
                    <div>
                        <h1 className={styles.title}>{t('success', { name: state.groupName })}</h1>
                    </div>
                    <ul className={styles.hintList}>
                        <li className={styles.hintItem}>
                            <span className={styles.hintDot} />
                            <span>{t('successHint')}</span>
                        </li>
                        <li className={styles.hintItem}>
                            <span className={styles.hintDot} />
                            <span>{t('successProfile')}</span>
                        </li>
                    </ul>
                    <div className={styles.btnGroup}>
                        <Link href="/dashboard" className={styles.btnPrimary}>
                            {t('goToDashboard')} <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (state.type === 'alreadyMember') {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <div className={`${styles.iconWrap} ${styles.iconWrapSuccess}`}>
                        <CheckCircle size={28} />
                    </div>
                    <div>
                        <h1 className={styles.title}>{t('alreadyMember')}</h1>
                        <p className={styles.subtitle}>{t('alreadyMemberDesc')}</p>
                    </div>
                    <div className={styles.btnGroup}>
                        <Link href="/dashboard" className={styles.btnPrimary}>
                            {t('goToDashboard')} <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (state.type === 'coachCannotJoin') {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <div className={`${styles.iconWrap} ${styles.iconWrapWarning}`}>
                        <Info size={28} />
                    </div>
                    <div>
                        <h1 className={styles.title}>{t('coachCannotJoin')}</h1>
                        <p className={styles.subtitle}>{t('coachCannotJoinDesc')}</p>
                    </div>
                    <div className={styles.btnGroup}>
                        <Link href="/dashboard" className={styles.btnPrimary}>
                            {t('goToDashboard')} <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (state.type === 'codeExpired') {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <div className={`${styles.iconWrap} ${styles.iconWrapError}`}>
                        <AlertCircle size={28} />
                    </div>
                    <div>
                        <h1 className={styles.title}>{t('invalidLink')}</h1>
                        <p className={styles.subtitle}>{t('codeExpired')}</p>
                    </div>
                    <div className={styles.btnGroup}>
                        <Link href="/dashboard" className={styles.btnSecondary}>
                            {t('goToDashboard')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (state.type === 'registerPrompt') {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <div className={`${styles.iconWrap} ${styles.iconWrapDefault}`}>
                        <Users size={28} />
                    </div>
                    <div>
                        <h1 className={styles.title}>{t('title')}</h1>
                        <p className={styles.subtitle}>{t('registerFirst')}</p>
                    </div>
                    <div className={styles.btnGroup}>
                        <Link href="/auth/register" className={styles.btnPrimary}>
                            {t('register')} <ArrowRight size={16} />
                        </Link>
                        <Link href="/auth/login" className={styles.btnSecondary}>
                            {t('loginExisting')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // noCode or invalidLink
    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={`${styles.iconWrap} ${styles.iconWrapError}`}>
                    <AlertCircle size={28} />
                </div>
                <div>
                    <h1 className={styles.title}>{t('invalidLink')}</h1>
                    <p className={styles.subtitle}>{t('invalidLinkDesc')}</p>
                </div>
                <div className={styles.btnGroup}>
                    <Link href="/dashboard" className={styles.btnSecondary}>
                        {t('goToDashboard')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
