'use client';

import { useLocale } from 'next-intl';
import styles from './DaySummaryCard.module.css';
import type { PlanExerciseWithExpand } from '@/lib/pocketbase/services/plans';
import type { ExercisesRecord } from '@/lib/pocketbase/types';

interface Props {
    date: Date | null;
    exercises: PlanExerciseWithExpand[];
    onClick: () => void;
}

export default function DaySummaryCard({ date, exercises, onClick }: Props) {
    const locale = useLocale();

    // Determine intensity or focus (placeholder logic for now)
    // Maybe checking CNS cost or specific tags
    const hasHighCNS = exercises.some(ex => (ex.expand?.exercise_id?.cns_cost ?? 0) >= 4);
    const count = exercises.length;

    const formattedDate = date ? date.toLocaleDateString(undefined, { day: 'numeric' }) : '';

    const getExerciseName = (ex: PlanExerciseWithExpand) => {
        const exercise = ex.expand?.exercise_id as ExercisesRecord | undefined;
        if (!exercise) return 'Exercise';
        // @ts-expect-error - dynamic access to localized fields
        return exercise[`name_${locale}`] || exercise.name_en || 'Exercise';
    };

    return (
        <div className={styles.card} onClick={onClick}>
            <div className={styles.header}>
                <span className={styles.date}>{formattedDate}</span>
                {hasHighCNS && <span className={styles.dotRed} title="High CNS" />}
            </div>
            {/* Debug output hidden or visible if dev */}
            {/* <div style={{fontSize: 8}}>{exercises.length} items</div> */}
            {count > 0 ? (
                <div className={styles.content}>
                    {/* List first 3 exercises */}
                    {exercises.slice(0, 3).map((ex) => (
                        <div key={ex.id} className={styles.exItem}>
                            {getExerciseName(ex)}
                        </div>
                    ))}
                    {count > 3 && (
                        <div className={styles.more}>+ {count - 3} more</div>
                    )}
                </div>
            ) : (
                <div className={styles.empty}>-</div>
            )}
        </div>
    );
}
