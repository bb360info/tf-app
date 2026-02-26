import { useTranslations } from 'next-intl';
import styles from './TrainingToday.module.css';

export function TrainingToday() {
    const t = useTranslations('dashboard');
    return (
        <div className={styles.card}>
            <h3 className={styles.title}>{t('trainingTodayTitle')}</h3>
            <p className={styles.desc}>{t('trainingTodayDesc')}</p>
        </div>
    );
}
