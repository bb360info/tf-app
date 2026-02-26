import DayColumn from './DayColumn';
import type { PlanExercisesRecord } from '@/lib/pocketbase/types';
import styles from './WeekStrip.module.css';

interface Props {
    dayExercisesBySession: Record<number, Record<number, PlanExercisesRecord[]>>;
    loggedDays: Set<number>;
    groupReadiness: Map<string, number>;
    onOpenDay: (day: number) => void;
    getDayDate: (dayIndex: number) => Date | null;
}

export function WeekStrip({
    dayExercisesBySession,
    loggedDays,
    groupReadiness,
    onOpenDay,
    getDayDate,
}: Props) {
    return (
        <div id="week-grid-container" className={styles.grid}>
            {Array.from({ length: 7 }, (_, day) => (
                <DayColumn
                    key={day}
                    dayOfWeek={day}
                    date={getDayDate(day)}
                    groupReadiness={groupReadiness}
                    exercisesBySession={dayExercisesBySession[day] ?? { 0: [] }}
                    hasLog={loggedDays.has(day)}
                    onOpenDay={onOpenDay}
                />
            ))}
        </div>
    );
}
