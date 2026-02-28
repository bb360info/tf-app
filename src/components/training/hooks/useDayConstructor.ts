import { useState, useCallback } from 'react';
import { ejectTemplate } from '@/lib/pocketbase/services/templates';
import type { PlanWithExercises } from '@/lib/pocketbase/services/plans';

interface UseDayConstructorOptions {
    plan: PlanWithExercises | null;
    loadPlan: () => Promise<void>;
}

interface UseDayConstructorReturn {
    activeDay: number | null;
    setActiveDay: (d: number | null) => void;
    pickerDay: number | null;
    setPickerDay: (d: number | null) => void;
    pickerSession: number;
    setPickerSession: (s: number) => void;
    pickerMode: 'normal' | 'warmup';
    setPickerMode: (m: 'normal' | 'warmup') => void;
    handleAddWarmupFromCatalog: (day: number, session: number) => void;
    handleEjectWarmup: (day: number, session: number) => Promise<void>;
}

/**
 * Encapsulates day selection and exercise picker state/handlers for WeekConstructor.
 * Extracted from WeekConstructor to reduce its LOC (Track 4.266 Phase 3).
 */
export function useDayConstructor({
    plan,
    loadPlan,
}: UseDayConstructorOptions): UseDayConstructorReturn {
    const [activeDay, setActiveDay] = useState<number | null>(null);
    const [pickerDay, setPickerDay] = useState<number | null>(null);
    const [pickerSession, setPickerSession] = useState<number>(0);
    const [pickerMode, setPickerMode] = useState<'normal' | 'warmup'>('normal');

    /** Open exercise picker in warmup mode for a specific day+session */
    const handleAddWarmupFromCatalog = useCallback((day: number, session: number) => {
        setPickerDay(day);
        setPickerSession(session);
        setPickerMode('warmup');
    }, []);

    const handleEjectWarmup = useCallback(
        async (day: number, session: number) => {
            if (!plan) return;
            try {
                await ejectTemplate(plan.id, day, session);
                await loadPlan();
            } catch (err) {
                console.error('Failed to eject warmup:', err);
            }
        },
        [plan, loadPlan]
    );

    return {
        activeDay,
        setActiveDay,
        pickerDay,
        setPickerDay,
        pickerSession,
        setPickerSession,
        pickerMode,
        setPickerMode,
        handleAddWarmupFromCatalog,
        handleEjectWarmup,
    };
}
