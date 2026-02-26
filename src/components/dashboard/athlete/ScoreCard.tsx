import { useTranslations } from 'next-intl';
import { ShieldAlert, ShieldCheck, Shield } from 'lucide-react';
import styles from './ScoreCard.module.css';

export function ScoreCard({ score }: { score: number | null }) {
    const t = useTranslations('dashboard');
    const isHigh = score !== null && score >= 70;
    const isMed = score !== null && score >= 40 && score < 70;
    const isLow = score !== null && score < 40;

    return (
        <div className={`${styles.card} ${isHigh ? styles.high : isMed ? styles.med : isLow ? styles.low : ''}`}>
            <span className={styles.title}>{t('scoreCard.readiness')}</span>
            <div className={styles.body}>
                <div className={styles.score}>{score ?? '--'}</div>
                <div className={isHigh ? styles.iconHigh : isMed ? styles.iconMed : isLow ? styles.iconLow : styles.iconNone}>
                    {isHigh ? <ShieldCheck size={36} /> : isLow ? <ShieldAlert size={36} /> : <Shield size={36} />}
                </div>
            </div>
            <div className={styles.recommendation}>
                {isHigh ? t('scoreCard.primeShape')
                    : isMed ? t('scoreCard.normalState')
                        : isLow ? t('scoreCard.fatigued')
                            : t('scoreCard.checkinRequired')}
            </div>
        </div>
    );
}
