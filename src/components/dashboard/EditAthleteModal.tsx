'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { updateAthlete, type AthleteWithStats } from '@/lib/pocketbase/services/athletes';
import styles from './AddAthleteModal.module.css';

interface EditAthleteModalProps {
    athlete: AthleteWithStats;
    onClose: () => void;
    onUpdated: () => void;
}

export function EditAthleteModal({ athlete, onClose, onUpdated }: EditAthleteModalProps) {
    const t = useTranslations('dashboard.newAthlete');
    const tDash = useTranslations('dashboard');

    const [name, setName] = useState(athlete.name);
    const [birthDate, setBirthDate] = useState(athlete.birth_date || '');
    const [gender, setGender] = useState<'male' | 'female' | ''>(athlete.gender || '');
    const [heightCm, setHeightCm] = useState(athlete.height_cm?.toString() || '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = useCallback(async () => {
        if (!name.trim()) return;
        setIsLoading(true);
        setError('');
        try {
            await updateAthlete(athlete.id, {
                name: name.trim(),
                birth_date: birthDate || undefined,
                gender: (gender as 'male' | 'female') || undefined,
                height_cm: heightCm ? Number(heightCm) : undefined,
            });
            onUpdated();
        } catch (err) {
            const { logError } = await import('@/lib/utils/errors');
            logError(err, { component: 'EditAthleteModal', action: 'update' });
            setError(tDash('updateFailed'));
        } finally {
            setIsLoading(false);
        }
    }, [name, birthDate, gender, heightCm, athlete.id, onUpdated, tDash]);

    return (
        <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-label={tDash('editAthlete')}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className={styles.modal}>
                <h2 className={styles.modalTitle}>{tDash('editAthlete')}</h2>

                {error && <div className={styles.error}>{error}</div>}

                {/* Name (required) */}
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="edit-athlete-name">
                        {t('name')} *
                    </label>
                    <input
                        id="edit-athlete-name"
                        type="text"
                        className={styles.input}
                        placeholder={t('namePlaceholder')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Birth date + Gender */}
                <div className={styles.row}>
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="edit-athlete-birth">
                            {t('birthDate')}
                        </label>
                        <input
                            id="edit-athlete-birth"
                            type="date"
                            className={styles.input}
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                        />
                    </div>
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="edit-athlete-gender">
                            {t('gender')}
                        </label>
                        <select
                            id="edit-athlete-gender"
                            className={styles.select}
                            value={gender}
                            onChange={(e) => setGender(e.target.value as '' | 'male' | 'female')}
                        >
                            <option value="">—</option>
                            <option value="male">{t('genderMale')}</option>
                            <option value="female">{t('genderFemale')}</option>
                        </select>
                    </div>
                </div>

                {/* Height */}
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="edit-athlete-height">
                        {t('heightCm')}
                    </label>
                    <input
                        id="edit-athlete-height"
                        type="number"
                        min="100"
                        max="250"
                        step="1"
                        className={styles.input}
                        placeholder="185"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                    />
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <button type="button" className={styles.cancelBtn} onClick={onClose}>
                        {t('cancel')}
                    </button>
                    <button
                        type="button"
                        className={styles.saveBtn}
                        onClick={handleSubmit}
                        disabled={!name.trim() || isLoading}
                    >
                        {isLoading ? <Loader2 size={16} aria-hidden="true" style={{ animation: 'spin 0.7s linear infinite' }} /> : t('save')}
                    </button>
                </div>
            </div>
        </div>
    );
}
