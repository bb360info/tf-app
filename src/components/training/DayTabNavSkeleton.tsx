/**
 * DayTabNavSkeleton — 7-tab shimmer placeholder for DayTabNav.
 * Shown during initial data load in AthleteTrainingView.
 */

import styles from './Skeleton.module.css';

export function DayTabNavSkeleton() {
    return (
        <div className={styles.tabNav} role="presentation" aria-hidden="true">
            {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className={`${styles.tabItem} ${styles.shimmer}`} />
            ))}
        </div>
    );
}
