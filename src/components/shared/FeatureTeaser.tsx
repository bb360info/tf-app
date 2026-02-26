import { LucideIcon } from 'lucide-react';
import styles from './FeatureTeaser.module.css';
import { useTranslations } from 'next-intl';

interface FeatureTeaserProps {
    title: string;
    description: string;
    icon: LucideIcon;
}

export function FeatureTeaser({ title, description, icon: Icon }: FeatureTeaserProps) {
    const t = useTranslations('feature');

    return (
        <div className={styles.teaserCard} aria-disabled="true">
            <div className={styles.iconWrapper}>
                <Icon size={24} aria-hidden="true" className={styles.icon} />
            </div>
            <div className={styles.content}>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.description}>{description}</p>
            </div>
            <div className={styles.badgeWrapper}>
                <span className={styles.badge}>{t('comingSoon')}</span>
            </div>
        </div>
    );
}
