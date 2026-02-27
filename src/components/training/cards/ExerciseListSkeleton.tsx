/**
 * ExerciseListSkeleton — shimmer rows mimicking ExerciseListItem.
 * Shown during initial data load.
 */

import styles from '../Skeleton.module.css';

interface ExerciseListSkeletonProps {
    count?: number;
}

export function ExerciseListSkeleton({ count = 3 }: ExerciseListSkeletonProps) {
    return (
        <div className={styles.exerciseList} role="presentation" aria-hidden="true">
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className={styles.exerciseItem}>
                    {/* CNS dot */}
                    <div className={`${styles.exerciseDot} ${styles.shimmer}`} />
                    {/* Name + dosage */}
                    <div className={styles.exerciseInfo}>
                        <div className={`${styles.exerciseName} ${styles.shimmer}`} />
                        <div className={`${styles.exerciseDosage} ${styles.shimmer}`} />
                    </div>
                    {/* Status icon */}
                    <div className={`${styles.exerciseIcon} ${styles.shimmer}`} />
                </div>
            ))}
        </div>
    );
}
