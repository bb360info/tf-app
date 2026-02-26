import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import styles from './ComingSoonCard.module.css';

interface Props {
    titleKey?: string;
    descKey?: string;
}

export function ComingSoonCard({
    titleKey = 'feature.comingSoon',
    descKey = 'feature.inDevelopment',
}: Props) {
    const t = useTranslations();

    return (
        <div className={styles.card}>
            <div className={styles.iconWrapper}>
                <Sparkles size={24} className={styles.icon} />
            </div>
            <h3 className={styles.title}>{t(titleKey)}</h3>
            <p className={styles.description}>{t(descKey)}</p>
        </div>
    );
}
