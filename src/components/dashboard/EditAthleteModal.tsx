'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AthleteForm, type AthleteFormInitialData, type AthleteFormSubmitPayload } from '@/components/athletes';
import { updateAthlete, type AthleteWithStats } from '@/lib/pocketbase/services/athletes';
import styles from './AddAthleteModal.module.css';

interface EditAthleteModalProps {
    athlete: AthleteWithStats;
    onClose: () => void;
    onUpdated: () => void;
}

export function EditAthleteModal({ athlete, onClose, onUpdated }: EditAthleteModalProps) {
    const t = useTranslations('athleteForm');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const initialData: AthleteFormInitialData = {
        name: athlete.name,
        birthDate: athlete.birth_date || '',
        gender: athlete.gender || '',
        heightCm: athlete.height_cm?.toString() || '',
        primaryDiscipline: athlete.primary_discipline ?? '',
        secondaryDisciplines: athlete.secondary_disciplines ?? [],
    };


    const handleSubmit = useCallback(async (payload: AthleteFormSubmitPayload) => {
        setIsLoading(true);
        setError('');

        try {
            await updateAthlete(athlete.id, {
                name: payload.athletePatch.name?.trim() || athlete.name,
                birth_date: payload.athletePatch.birth_date,
                gender: payload.athletePatch.gender,
                height_cm: payload.athletePatch.height_cm,
                primary_discipline: payload.athletePatch.primary_discipline,
                secondary_disciplines: payload.athletePatch.secondary_disciplines,
            });


            onUpdated();
        } catch (err) {
            const { logError } = await import('@/lib/utils/errors');
            logError(err, { component: 'EditAthleteModal', action: 'update' });
            setError(t('updateFailed'));
        } finally {
            setIsLoading(false);
        }
    }, [athlete.id, athlete.name, onUpdated, t]);

    return (
        <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-label={t('editTitle')}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className={styles.modal}>
                <h2 className={styles.modalTitle}>{t('editTitle')}</h2>
                <AthleteForm
                    mode="edit"
                    initialData={initialData}
                    isSubmitting={isLoading}
                    error={error}
                    submitLabel={t('saveChangesCta')}
                    onCancel={onClose}
                    onSubmit={handleSubmit}
                />
            </div>
        </div>
    );
}
