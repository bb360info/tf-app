import { useState } from 'react';
import { stampTemplate } from '@/lib/pocketbase/services/templates';
import type { PlanExerciseWithExpand, PlanWithExercises } from '@/lib/pocketbase/services/plans';

interface UseTemplatePickerOptions {
    plan: PlanWithExercises | null;
    exercises: PlanExerciseWithExpand[];
    loadPlan: () => Promise<void>;
}

interface UseTemplatePickerReturn {
    templatePanelTarget: { day: number; session: number } | null;
    setTemplatePanelTarget: (t: { day: number; session: number } | null) => void;
    showWarmupPanel: boolean;
    setShowWarmupPanel: (v: boolean) => void;
    handleApplyTemplate: (templateId: string) => Promise<void>;
    handleApplyWarmupToWeek: (templateId: string) => Promise<void>;
}

/**
 * Encapsulates template panel and warmup-to-week state/handlers for WeekConstructor.
 * Extracted from WeekConstructor to reduce its LOC (Track 4.266 Phase 3).
 */
export function useTemplatePicker({
    plan,
    exercises,
    loadPlan,
}: UseTemplatePickerOptions): UseTemplatePickerReturn {
    const [templatePanelTarget, setTemplatePanelTarget] = useState<{ day: number; session: number } | null>(null);
    const [showWarmupPanel, setShowWarmupPanel] = useState(false);

    /** Append training_day template exercises to a specific day+session */
    const handleApplyTemplate = async (templateId: string) => {
        if (!plan || !templatePanelTarget) return;
        try {
            await stampTemplate(templateId, plan.id, templatePanelTarget.day, templatePanelTarget.session);
            await loadPlan();
        } catch (err) {
            console.error('Failed to stamp template', err);
            throw err;
        }
    };

    /** Apply warmup template to all occupied day+session slots in current week */
    const handleApplyWarmupToWeek = async (templateId: string) => {
        if (!plan) return;
        // Find all distinct (day, session) slots with exercises in current week
        const slotMap = new Map<string, { day: number; session: number }>();
        for (const ex of exercises) {
            const key = `${ex.day_of_week}-${ex.session}`;
            if (!slotMap.has(key)) {
                slotMap.set(key, { day: ex.day_of_week ?? 0, session: ex.session ?? 0 });
            }
        }
        for (const slot of slotMap.values()) {
            await stampTemplate(templateId, plan.id, slot.day, slot.session);
        }
        await loadPlan();
        setShowWarmupPanel(false);
    };

    return {
        templatePanelTarget,
        setTemplatePanelTarget,
        showWarmupPanel,
        setShowWarmupPanel,
        handleApplyTemplate,
        handleApplyWarmupToWeek,
    };
}
