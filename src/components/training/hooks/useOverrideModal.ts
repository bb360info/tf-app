import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { PlanWithExercises } from '@/lib/pocketbase/services/plans';

type TFn = ReturnType<typeof useTranslations>;

interface UseOverrideModalOptions {
    plan: PlanWithExercises | null;
    t: TFn;
}

/**
 * Encapsulates override modal state and handlers for WeekConstructor.
 * Extracted from WeekConstructor to reduce its LOC.
 */
export function useOverrideModal({ plan, t }: UseOverrideModalOptions) {
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [overrideAthletes, setOverrideAthletes] = useState<Array<{ id: string; name: string }>>([]);
    const [overrideAthleteId, setOverrideAthleteId] = useState('');
    const [isCreatingOverride, setIsCreatingOverride] = useState(false);
    const [overrideError, setOverrideError] = useState<string | null>(null);
    const [overrideSuccess, setOverrideSuccess] = useState(false);
    const [overrideAthletesLoading, setOverrideAthletesLoading] = useState(false);

    const handleOpenOverrideModal = useCallback(async () => {
        setShowOverrideModal(true);
        setOverrideError(null);
        setOverrideSuccess(false);
        setOverrideAthleteId('');
        if (overrideAthletes.length === 0) {
            setOverrideAthletesLoading(true);
            try {
                const { listMyAthletes } = await import('@/lib/pocketbase/services/athletes');
                const athletes = await listMyAthletes();
                setOverrideAthletes(
                    athletes.map((a) => ({
                        id: a.id,
                        name: a.name ?? a.id,
                    }))
                );
            } catch (err) {
                const { logError } = await import('@/lib/utils/errors');
                logError(err, { component: 'WeekConstructor', action: 'loadAthletes' });
                setOverrideError(t('errors.networkError'));
            } finally {
                setOverrideAthletesLoading(false);
            }
        }
    }, [overrideAthletes.length, t]);

    const handleCreateOverride = useCallback(async () => {
        if (!plan || !overrideAthleteId || isCreatingOverride) return;
        setIsCreatingOverride(true);
        setOverrideError(null);
        try {
            const { createIndividualOverride } = await import('@/lib/pocketbase/services/plans');
            await createIndividualOverride(plan.id, overrideAthleteId);
            setOverrideSuccess(true);
            setTimeout(() => {
                setShowOverrideModal(false);
                setOverrideSuccess(false);
                setOverrideAthleteId('');
            }, 1500);
        } catch (err) {
            setOverrideError(err instanceof Error ? err.message : t('errors.networkError'));
        } finally {
            setIsCreatingOverride(false);
        }
    }, [plan, overrideAthleteId, isCreatingOverride, t]);

    const handleCloseOverrideModal = useCallback(() => {
        setShowOverrideModal(false);
        setOverrideError(null);
        setOverrideSuccess(false);
        setOverrideAthleteId('');
    }, []);

    return {
        showOverrideModal,
        setShowOverrideModal,
        overrideAthletes,
        overrideAthleteId,
        setOverrideAthleteId,
        isCreatingOverride,
        overrideError,
        overrideSuccess,
        overrideAthletesLoading,
        handleOpenOverrideModal,
        handleCreateOverride,
        handleCloseOverrideModal,
    };
}
