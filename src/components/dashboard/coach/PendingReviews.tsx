import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { countPendingCompetitionProposals } from '@/lib/pocketbase/services/competitionProposals';
import styles from './PendingReviews.module.css';

export function PendingReviews() {
    const t = useTranslations('dashboard');
    const { user } = useAuth();
    const [pending, setPending] = useState(0);

    useEffect(() => {
        if (user) {
            countPendingCompetitionProposals().then(setPending).catch(() => { });
        }
    }, [user]);

    return (
        <div className={styles.card}>
            <h3 className={styles.title}>{t('pendingReviewsTitle')}</h3>
            {pending > 0 ? (
                <p className={styles.desc}>
                    {t('pendingReviewsCount', { count: pending })}
                </p>
            ) : (
                <p className={styles.desc}>{t('pendingReviewsAllDone')}</p>
            )}
        </div>
    );
}
