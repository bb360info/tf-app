'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AthleteForm, type AthleteFormInitialData, type AthleteFormSubmitPayload } from '@/components/athletes';
import { useToast } from '@/lib/hooks/useToast';
import { updateAthlete } from '@/lib/pocketbase/services/athletes';
import type { Discipline } from '@/lib/pocketbase/types';
import { SettingsSectionCard } from './SettingsSectionCard';

interface AthleteProfileSettingsPanelProps {
    athleteId: string;
    initialPrimaryDiscipline?: Discipline;
    initialSecondaryDisciplines?: Discipline[];
}

export function AthleteProfileSettingsPanel({
    athleteId,
    initialPrimaryDiscipline,
    initialSecondaryDisciplines,
}: AthleteProfileSettingsPanelProps) {
    const t = useTranslations();
    const tForm = useTranslations('athleteForm');
    const { showToast } = useToast();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const initialData: AthleteFormInitialData = useMemo(
        () => ({
            name: '',
            birthDate: '',
            gender: '',
            heightCm: '',
            primaryDiscipline: initialPrimaryDiscipline ?? '',
            secondaryDisciplines: initialSecondaryDisciplines ?? [],
        }),
        [initialPrimaryDiscipline, initialSecondaryDisciplines]
    );


    const handleSubmit = useCallback(async (payload: AthleteFormSubmitPayload) => {
        setIsSubmitting(true);
        setError('');

        try {
            await updateAthlete(athleteId, {
                primary_discipline: payload.athletePatch.primary_discipline,
                secondary_disciplines: payload.athletePatch.secondary_disciplines,
            });

            showToast({ message: t('settings.saved'), type: 'success' });
        } catch (submitError) {
            const { logError } = await import('@/lib/utils/errors');
            logError(submitError, { component: 'AthleteProfileSettingsPanel', action: 'submit' });
            setError(tForm('updateFailed'));
            showToast({ message: t('settings.profileUpdateFailed'), type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    }, [athleteId, showToast, t, tForm]);

    return (
        <SettingsSectionCard title={t('settings.athleteProfile')}>
            <AthleteForm
                mode="settings"
                initialData={initialData}
                isSubmitting={isSubmitting}
                error={error}
                submitLabel={tForm('saveSportProfileCta')}
                onSubmit={handleSubmit}
            />
        </SettingsSectionCard>
    );
}
