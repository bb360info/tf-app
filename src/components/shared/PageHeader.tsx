import React, { ReactNode } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ChevronLeft } from 'lucide-react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
    title: ReactNode;
    subtitle?: ReactNode;
    onBack?: () => void;
    backHref?: string;
    actions?: ReactNode;
    className?: string;
}

export function PageHeader({
    title,
    subtitle,
    onBack,
    backHref,
    actions,
    className = '',
}: PageHeaderProps) {
    const router = useRouter();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (backHref) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            router.push(backHref as any);
        } else {
            router.back();
        }
    };

    const showBackButton = onBack !== undefined || backHref !== undefined;

    return (
        <header className={`${styles.header} ${className}`}>
            <div className={styles.leftSection}>
                {showBackButton && (
                    <button
                        onClick={handleBack}
                        className={styles.backButton}
                        aria-label="Go back"
                    >
                        <ChevronLeft size={24} />
                    </button>
                )}
                <div className={styles.titleWrapper}>
                    <h1 className={styles.title}>{title}</h1>
                    {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                </div>
            </div>

            {actions && (
                <div className={styles.rightSection}>
                    {actions}
                </div>
            )}
        </header>
    );
}
