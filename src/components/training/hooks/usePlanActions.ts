import { useCallback } from 'react';
import {
    addExerciseToPlan,
    updatePlanExercise,
    removePlanExercise,
    reorderExercises,
    publishPlan,
    revertToDraft,
} from '@/lib/pocketbase/services/plans';
import { addWarmupItem } from '@/lib/pocketbase/services/templates';
import { autoFillWeek } from '@/lib/autofill/processor';
import { useToast } from '@/lib/hooks/useToast';
import { useTranslations } from 'next-intl';
import type { PlanExerciseWithExpand, PlanWithExercises } from '@/lib/pocketbase/services/plans';
import type { ExerciseRecord } from '@/lib/pocketbase/services/exercises';
import type { PhaseType } from '@/lib/pocketbase/types';
import type { UpdateExerciseData, AdHocWarmupData } from '../types';
import type { CustomExercisesRecord } from '@/lib/pocketbase/types';

interface UsePlanActionsOptions {
    plan: PlanWithExercises | null;
    exercises: PlanExerciseWithExpand[];
    phaseType: PhaseType;
    pickerDay: number | null;
    pickerSession: number;
    pickerMode: 'normal' | 'warmup';
    dayExercisesBySession: Record<number, Record<number, PlanExerciseWithExpand[]>>;
    setIsAutoFilling: (v: boolean) => void;
    setIsPublishing: (v: boolean) => void;
    setConfirmAction: (v: 'autofill' | 'duplicate' | 'publish' | null) => void;
    setPickerDay: (d: number | null) => void;
    setPickerSession: (s: number) => void;
    setPickerMode: (m: 'normal' | 'warmup') => void;
    setPlan: (plan: PlanWithExercises) => void;
    phaseId: string;
    weekNumber: number;
    isPublished: boolean;
    loadPlan: () => Promise<void>;
    /** [Track 4.267 Phase 2] Lazy-create plan on first coach action */
    ensurePlanExists: () => Promise<PlanWithExercises>;
}

interface UsePlanActionsReturn {
    handleAddExercise: (exercise: ExerciseRecord | CustomExercisesRecord, source: 'library' | 'custom') => Promise<void>;
    handleUpdateExercise: (id: string, data: UpdateExerciseData) => Promise<void>;
    handleRemoveExercise: (id: string) => Promise<void>;
    handleReorder: (id: string, direction: 'up' | 'down') => Promise<void>;
    handleAddWarmupItem: (day: number, session: number, data: AdHocWarmupData) => Promise<void>;
    handleSaveAsTemplate: (day: number, session: number, name: string) => Promise<void>;
    handleSaveSnapshot: () => Promise<void>;
    handleAutoFill: () => Promise<void>;
    handlePublish: () => Promise<void>;
    handleDuplicateWeek: () => Promise<void>;
    /** [Task 3.2] Apply warmup template to a specific day */
    handleApplyWarmupToDay: (day: number, templateId: string) => Promise<void>;
}

/**
 * Encapsulates exercise CRUD, reorder, warmup, autofill, and snapshot handlers.
 * Extracted from WeekConstructor to reduce its LOC (Track 4.266 Phase 3).
 */
export function usePlanActions({
    plan,
    exercises,
    phaseType,
    phaseId,
    weekNumber,
    isPublished,
    pickerDay,
    pickerSession,
    pickerMode,
    dayExercisesBySession,
    setIsAutoFilling,
    setIsPublishing,
    setConfirmAction,
    setPickerDay,
    setPickerSession,
    setPickerMode,
    setPlan,
    loadPlan,
    ensurePlanExists,
}: UsePlanActionsOptions): UsePlanActionsReturn {
    const { showToast } = useToast();
    const t = useTranslations();

    const handleAddExercise = useCallback(
        async (exercise: ExerciseRecord | CustomExercisesRecord, source: 'library' | 'custom') => {
            if (pickerDay === null) return;

            // Warmup mode: add exercise as warmup item
            if (pickerMode === 'warmup') {
                try {
                    const activePlan = await ensurePlanExists();
                    await addWarmupItem(activePlan.id, pickerDay, pickerSession, {
                        exercise_id: exercise.id,
                    });
                    setPickerDay(null);
                    setPickerSession(0);
                    setPickerMode('normal');
                    await loadPlan();
                } catch (err) {
                    console.error('Failed to add warmup from catalog:', err);
                }
                return;
            }

            const sessionExs = dayExercisesBySession[pickerDay]?.[pickerSession] ?? [];
            try {
                // [Track 4.267 Phase 2] Lazy-create plan on first exercise add
                const activePlan = await ensurePlanExists();
                if (source === 'library') {
                    const ex = exercise as ExerciseRecord;
                    await addExerciseToPlan({
                        plan_id: activePlan.id,
                        exercise_id: ex.id,
                        day_of_week: pickerDay,
                        session: pickerSession,
                        order: sessionExs.length,
                        sets: undefined,
                        reps: ex.dosage ?? undefined,
                    });
                } else {
                    const ex = exercise as CustomExercisesRecord;
                    await addExerciseToPlan({
                        plan_id: activePlan.id,
                        exercise_id: ex.id,
                        day_of_week: pickerDay,
                        session: pickerSession,
                        order: sessionExs.length,
                        sets: undefined,
                        reps: ex.dosage ?? undefined,
                    });
                }
                setPickerDay(null);
                setPickerSession(0);
                await loadPlan();
            } catch (err) {
                console.error('Failed to add exercise:', err);
            }
        },
        [pickerDay, pickerSession, pickerMode, dayExercisesBySession, loadPlan, setPickerDay, setPickerSession, setPickerMode, ensurePlanExists]
    );

    const handleUpdateExercise = useCallback(
        async (id: string, data: UpdateExerciseData) => {
            try {
                await updatePlanExercise(id, data);
                await loadPlan();
            } catch (err) {
                console.error('Failed to update exercise:', err);
            }
        },
        [loadPlan]
    );

    const handleRemoveExercise = useCallback(
        async (id: string) => {
            try {
                await removePlanExercise(id);
                await loadPlan();
            } catch (err) {
                console.error('Failed to remove exercise:', err);
            }
        },
        [loadPlan]
    );

    const handleReorder = useCallback(
        async (id: string, direction: 'up' | 'down') => {
            const ex = exercises.find((e) => e.id === id);
            if (!ex) return;
            const day = ex.day_of_week ?? 0;
            const session = ex.session ?? 0;
            const sessionExs = [...(dayExercisesBySession[day]?.[session] ?? [])];
            const idx = sessionExs.findIndex((e) => e.id === id);
            if (idx < 0) return;

            const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= sessionExs.length) return;

            const updates = [
                { id: sessionExs[idx].id, order: sessionExs[swapIdx].order },
                { id: sessionExs[swapIdx].id, order: sessionExs[idx].order },
            ];

            try {
                await reorderExercises(updates);
                await loadPlan();
            } catch (err) {
                console.error('Failed to reorder:', err);
            }
        },
        [exercises, dayExercisesBySession, loadPlan]
    );

    const handleAddWarmupItem = useCallback(
        async (day: number, session: number, data: AdHocWarmupData) => {
            try {
                // [Track 4.267 Phase 2] Lazy-create plan if needed
                const activePlan = await ensurePlanExists();
                await addWarmupItem(activePlan.id, day, session, {
                    exercise_id: data.exercise_id,
                    custom_text_ru: data.custom_text_ru,
                    custom_text_en: data.custom_text_en,
                    custom_text_cn: data.custom_text_cn,
                    duration_seconds: data.duration_seconds,
                });
                await loadPlan();
            } catch (err) {
                console.error('Failed to add warmup item:', err);
            }
        },
        [ensurePlanExists, loadPlan]
    );

    const handleSaveAsTemplate = useCallback(
        async (day: number, session: number, name: string) => {
            if (!plan || !name.trim()) return;
            try {
                const pb = (await import('@/lib/pocketbase/client')).default;
                const coachId = pb.authStore.record?.id as string | undefined;
                if (!coachId) return;
                const { createTemplateFromPlanDay } = await import('@/lib/pocketbase/services/templates');
                await createTemplateFromPlanDay(plan.id, day, session, coachId, {
                    ru: name.trim(),
                    en: name.trim(),
                    cn: name.trim(),
                });
                // template saved silently
            } catch (err) {
                console.error('Failed to save template:', err);
            }
        },
        [plan]
    );

    const handleSaveSnapshot = useCallback(async () => {
        if (!plan) return;
        try {
            const { createSnapshot } = await import('@/lib/pocketbase/services/snapshots');
            await createSnapshot(plan.id, {
                plan,
                exercises,
                created: new Date().toISOString(),
            });
            showToast({ message: t('training.saveVersion') + ' OK', type: 'success' });
        } catch (err) {
            console.error('Snapshot failed', err);
            showToast({ message: 'Failed to save version', type: 'error' });
        }
    }, [plan, exercises, t, showToast]);

    const handleAutoFill = useCallback(async () => {
        setIsAutoFilling(true);
        setConfirmAction(null);
        try {
            // [Track 4.267 Phase 2] Lazy-create plan if needed
            const activePlan = await ensurePlanExists();
            const result = await autoFillWeek(activePlan.id, phaseType);
            await loadPlan();
            if (result.added === 0) {
                showToast({ message: t('training.autoFillNoExercises'), type: 'warning' });
            } else {
                showToast({ message: t('training.autoFillSuccess', { defaultMessage: 'Auto-fill applied!' }), type: 'success' });
            }
        } catch (err) {
            console.error('Auto-fill failed', err);
            showToast({ message: 'Auto-fill failed', type: 'error' });
        } finally {
            setIsAutoFilling(false);
        }
    }, [phaseType, t, loadPlan, showToast, setIsAutoFilling, setConfirmAction, ensurePlanExists]);

    const handlePublish = useCallback(async () => {
        if (!plan) return;
        setIsPublishing(true);
        setConfirmAction(null);
        try {
            if (isPublished) {
                const updated = await revertToDraft(plan.id);
                setPlan(updated);
                showToast({ message: t('training.revertedToDraft', { defaultMessage: 'Reverted to draft' }), type: 'info' });
            } else {
                const updated = await publishPlan(plan.id);
                setPlan(updated);
                showToast({ message: t('training.published', { defaultMessage: 'Week published!' }), type: 'success' });
            }
        } catch (err) {
            console.error('Failed to update plan status:', err);
            showToast({ message: 'Failed to update plan status', type: 'error' });
        } finally {
            setIsPublishing(false);
        }
    }, [plan, isPublished, t, showToast, setIsPublishing, setConfirmAction, setPlan]);

    const handleDuplicateWeek = useCallback(async () => {
        if (!plan || weekNumber <= 1 || isPublished) return;
        setConfirmAction(null);
        try {
            const { duplicatePlanWeek } = await import('@/lib/pocketbase/services/plans');
            await duplicatePlanWeek(phaseId, weekNumber - 1, weekNumber);
            await loadPlan();
            showToast({ message: t('training.duplicateSuccess', { defaultMessage: 'Week duplicated!' }), type: 'success' });
        } catch (err) {
            console.error('Failed to duplicate week:', err);
            showToast({ message: 'Error duplicating week', type: 'error' });
        }
    }, [plan, weekNumber, isPublished, phaseId, loadPlan, t, showToast, setConfirmAction]);

    /** [Task 3.2] Apply warmup template to a specific day (lazy-creates plan if needed) */
    const handleApplyWarmupToDay = useCallback(
        async (day: number, templateId: string) => {
            try {
                const activePlan = await ensurePlanExists();
                const { stampWarmupToDay } = await import('@/lib/pocketbase/services/templates');
                const result = await stampWarmupToDay(templateId, activePlan.id, day);
                await loadPlan();
                showToast({
                    message: t('training.warmupDayApplied', { defaultMessage: `Warmup applied (${result.applied} exercises)` }),
                    type: 'success',
                });
            } catch (err) {
                console.error('Failed to apply warmup to day:', err);
                showToast({ message: 'Failed to apply warmup', type: 'error' });
            }
        },
        [ensurePlanExists, loadPlan, t, showToast]
    );

    return {
        handleAddExercise,
        handleUpdateExercise,
        handleRemoveExercise,
        handleReorder,
        handleAddWarmupItem,
        handleSaveAsTemplate,
        handleSaveSnapshot,
        handleAutoFill,
        handlePublish,
        handleDuplicateWeek,
        handleApplyWarmupToDay,
    };
}
