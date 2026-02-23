import { type LucideIcon, Inbox } from 'lucide-react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
    /** Lucide icon component — default: Inbox */
    icon?: LucideIcon;
    /** Primary heading text */
    title: string;
    /** Optional description below the title */
    description?: string;
    /** Optional CTA button */
    action?: {
        label: string;
        onClick: () => void;
    };
    /** Additional CSS class */
    className?: string;
}

/**
 * Universal empty state component with glass card, Lucide icon, and optional CTA.
 * Use in place of plain text "no data" messages.
 */
export function EmptyState({
    icon: Icon = Inbox,
    title,
    description,
    action,
    className = '',
}: EmptyStateProps) {
    return (
        <div className={`${styles.container} ${className}`}>
            <div className={styles.icon}>
                <Icon size={32} />
            </div>
            <h3 className={styles.title}>{title}</h3>
            {description && (
                <p className={styles.description}>{description}</p>
            )}
            {action && (
                <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={action.onClick}
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
