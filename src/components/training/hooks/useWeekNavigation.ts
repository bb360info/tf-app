import { useState } from 'react';

interface UseWeekNavigationOptions {
    maxWeeks: number;
    initialWeek?: number;
}

interface UseWeekNavigationReturn {
    weekNumber: number;
    handlePrevWeek: () => void;
    handleNextWeek: () => void;
}

/**
 * Encapsulates week navigation state for WeekConstructor.
 * Extracted from WeekConstructor to reduce its LOC (Track 4.266 Phase 3).
 */
export function useWeekNavigation({
    maxWeeks,
    initialWeek,
}: UseWeekNavigationOptions): UseWeekNavigationReturn {
    const [weekNumber, setWeekNumber] = useState(() => {
        // Clamp initialWeek to [1, maxWeeks]
        if (initialWeek && initialWeek >= 1 && initialWeek <= maxWeeks) return initialWeek;
        return 1;
    });

    const handlePrevWeek = () => setWeekNumber((w) => Math.max(1, w - 1));
    const handleNextWeek = () => setWeekNumber((w) => Math.min(maxWeeks, w + 1));

    return { weekNumber, handlePrevWeek, handleNextWeek };
}
