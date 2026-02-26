'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { AthleteForm, type AthleteFormInitialData, type AthleteFormSubmitPayload } from '@/components/athletes';
import { createAthlete } from '@/lib/pocketbase/services/athletes';
import styles from './AddAthleteModal.module.css';

interface AddAthleteModalProps {
    onClose: () => void;
    onCreated: () => void;
}

export function AddAthleteModal({ onClose, onCreated }: AddAthleteModalProps) {
    const t = useTranslations('athleteForm');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const initialData: AthleteFormInitialData = {
        name: '',
        birthDate: '',
        gender: '',
        heightCm: '',
        primaryDiscipline: '',
        secondaryDisciplines: [],
    };

    const handleSubmit = useCallback(async (payload: AthleteFormSubmitPayload) => {
        const name = payload.athletePatch.name?.trim();
        if (!name) return;

        setIsLoading(true);
        setError('');

        try {
            const athlete = await createAthlete({
                name,
                birth_date: payload.athletePatch.birth_date,
                gender: payload.athletePatch.gender,
                height_cm: payload.athletePatch.height_cm,
                primary_discipline: payload.athletePatch.primary_discipline,
                secondary_disciplines: payload.athletePatch.secondary_disciplines,
            });


            onCreated();
        } catch (err) {
            const { logError } = await import('@/lib/utils/errors');
            logError(err, { component: 'AddAthleteModal', action: 'create' });
            setError(t('createFailed'));
        } finally {
            setIsLoading(false);
        }
    }, [onCreated, t]);

    return (
        <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-label={t('createTitle')}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className={styles.modal}>
                <h2 className={styles.modalTitle}>{t('createTitle')}</h2>
                <AthleteForm
                    mode="create"
                    initialData={initialData}
                    isSubmitting={isLoading}
                    error={error}
                    submitLabel={t('addCta')}
                    onCancel={onClose}
                    onSubmit={handleSubmit}
                />
            </div>
        </div>
    );
}
