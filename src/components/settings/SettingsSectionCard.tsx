import { ReactNode } from 'react';
import styles from './SettingsSectionCard.module.css';

interface SettingsSectionCardProps {
    title?: string;
    children: ReactNode;
}

export function SettingsSectionCard({ title, children }: SettingsSectionCardProps) {
    return (
        <section className={styles.section}>
            {title && <h2 className={styles.sectionTitle}>{title}</h2>}
            {children}
        </section>
    );
}
