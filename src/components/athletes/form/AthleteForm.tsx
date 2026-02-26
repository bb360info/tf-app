'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Trash2, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Discipline } from '@/lib/pocketbase/types';
import { AthleteFormSubmitPayloadSchema } from '@/lib/validation/athleteForm';
import type { AthleteFormProps, AthleteFormSubmitPayload } from './types';
import styles from './AthleteForm.module.css';

const DISCIPLINE_OPTIONS: Discipline[] = ['high_jump', 'long_jump', 'triple_jump'];

function disciplineLabel(t: ReturnType<typeof useTranslations>, discipline: Discipline) {
    switch (discipline) {
        case 'high_jump':
            return t('disciplineHighJump');
        case 'long_jump':
            return t('disciplineLongJump');
        case 'triple_jump':
            return t('disciplineTripleJump');
    }
}

export function AthleteForm({
    mode,
    initialData,
    isSubmitting = false,
    error = '',
    submitLabel,
    onCancel,
    onSubmit,
}: AthleteFormProps) {
    const t = useTranslations('athleteForm');
    const [step, setStep] = useState<'basic' | 'sport'>(mode === 'settings' ? 'sport' : 'basic');

    const [name, setName] = useState(initialData.name);
    const [birthDate, setBirthDate] = useState(initialData.birthDate);
    const [gender, setGender] = useState(initialData.gender);
    const [heightCm, setHeightCm] = useState(initialData.heightCm);
    const [primaryDiscipline, setPrimaryDiscipline] = useState<Discipline | ''>(initialData.primaryDiscipline);
    const [secondaryDisciplines, setSecondaryDisciplines] = useState<Discipline[]>(initialData.secondaryDisciplines);

    const [validationError, setValidationError] = useState('');

    useEffect(() => {
        setStep(mode === 'settings' ? 'sport' : 'basic');
    }, [mode]);

    useEffect(() => {
        setName(initialData.name);
        setBirthDate(initialData.birthDate);
        setGender(initialData.gender);
        setHeightCm(initialData.heightCm);
        setPrimaryDiscipline(initialData.primaryDiscipline);
        setSecondaryDisciplines(initialData.secondaryDisciplines);
    }, [initialData]);


    const hasInvalidDisciplinePair = useMemo(() => {
        return primaryDiscipline !== '' && secondaryDisciplines.includes(primaryDiscipline);
    }, [primaryDiscipline, secondaryDisciplines]);

    const canProceedFromBasic = mode === 'settings' || name.trim().length > 0;

    const setPrimary = (value: Discipline | '') => {
        setValidationError('');
        setPrimaryDiscipline(value);
        if (value) {
            setSecondaryDisciplines((prev) => prev.filter((d) => d !== value));
        }
    };

    const toggleSecondary = (value: Discipline) => {
        setValidationError('');
        setSecondaryDisciplines((prev) => {
            if (prev.includes(value)) {
                return prev.filter((d) => d !== value);
            }
            if (prev.length >= 2) {
                return prev;
            }
            return [...prev, value];
        });
    };


    const buildPayload = (): AthleteFormSubmitPayload | null => {
        if (mode !== 'settings' && !name.trim()) {
            setValidationError(t('nameRequired'));
            return null;
        }

        if (hasInvalidDisciplinePair) {
            setValidationError(t('secondaryInvalid'));
            return null;
        }

        const athletePatch: AthleteFormSubmitPayload['athletePatch'] = {
            primary_discipline: primaryDiscipline || undefined,
            // Keep explicit empty array so edit/settings can clear secondary disciplines.
            secondary_disciplines: secondaryDisciplines,
        };

        if (mode !== 'settings') {
            athletePatch.name = name.trim();
            athletePatch.birth_date = birthDate || undefined;
            athletePatch.gender = gender || undefined;
            athletePatch.height_cm = heightCm ? Number(heightCm) : undefined;
        }

        const candidate: AthleteFormSubmitPayload = {
            athletePatch,
        };

        const parsed = AthleteFormSubmitPayloadSchema.safeParse(candidate);
        if (!parsed.success) {
            setValidationError(t('validationError'));
            return null;
        }

        return parsed.data;
    };

    const handleSubmit = () => {
        setValidationError('');
        const payload = buildPayload();
        if (!payload) return;
        onSubmit(payload);
    };

    const resolvedSubmitLabel = submitLabel ?? (
        mode === 'create' ? t('addCta')
            : mode === 'edit' ? t('saveChangesCta')
                : t('saveSportProfileCta')
    );

    return (
        <div className={styles.container}>
            {mode !== 'settings' && (
                <div className={styles.stepTabs}>
                    <button
                        type="button"
                        className={`${styles.stepTab} ${step === 'basic' ? styles.stepTabActive : ''}`}
                        onClick={() => setStep('basic')}
                    >
                        {t('tabBasic')}
                    </button>
                    <button
                        type="button"
                        className={`${styles.stepTab} ${step === 'sport' ? styles.stepTabActive : ''}`}
                        onClick={() => setStep('sport')}
                    >
                        {t('tabSport')}
                    </button>
                </div>
            )}

            {(error || validationError) && (
                <div className={styles.error}>{error || validationError}</div>
            )}

            {mode !== 'settings' && step === 'basic' && (
                <>
                    <div className={styles.field}>
                        <label htmlFor="athlete-form-name" className={styles.label}>
                            {t('name')} *
                        </label>
                        <input
                            id="athlete-form-name"
                            type="text"
                            className={styles.input}
                            placeholder={t('namePlaceholder')}
                            value={name}
                            onChange={(e) => {
                                setValidationError('');
                                setName(e.target.value);
                            }}
                            autoFocus
                        />
                    </div>

                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label htmlFor="athlete-form-birth-date" className={styles.label}>
                                {t('birthDate')}
                            </label>
                            <input
                                id="athlete-form-birth-date"
                                type="date"
                                className={styles.input}
                                value={birthDate}
                                onChange={(e) => {
                                    setValidationError('');
                                    setBirthDate(e.target.value);
                                }}
                            />
                        </div>
                        <div className={styles.field}>
                            <label htmlFor="athlete-form-gender" className={styles.label}>
                                {t('gender')}
                            </label>
                            <select
                                id="athlete-form-gender"
                                className={styles.select}
                                value={gender}
                                onChange={(e) => {
                                    setValidationError('');
                                    setGender(e.target.value as typeof gender);
                                }}
                            >
                                <option value="">—</option>
                                <option value="male">{t('genderMale')}</option>
                                <option value="female">{t('genderFemale')}</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="athlete-form-height" className={styles.label}>
                            {t('heightCm')}
                        </label>
                        <input
                            id="athlete-form-height"
                            type="number"
                            min="100"
                            max="250"
                            step="1"
                            className={styles.input}
                            value={heightCm}
                            onChange={(e) => {
                                setValidationError('');
                                setHeightCm(e.target.value);
                            }}
                        />
                    </div>
                </>
            )}

            {step === 'sport' && (
                <>
                    <div className={styles.field}>
                        <label htmlFor="athlete-form-primary" className={styles.label}>
                            {t('discipline')}
                        </label>
                        <select
                            id="athlete-form-primary"
                            className={styles.select}
                            value={primaryDiscipline}
                            onChange={(e) => setPrimary(e.target.value as Discipline | '')}
                        >
                            <option value="">—</option>
                            {DISCIPLINE_OPTIONS.map((discipline) => (
                                <option key={discipline} value={discipline}>
                                    {disciplineLabel(t, discipline)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.field}>
                        <span className={styles.secondaryTitle}>{t('secondaryDisciplines')}</span>
                        <div className={styles.secondaryGrid}>
                            {DISCIPLINE_OPTIONS.filter((d) => d !== primaryDiscipline).map((discipline) => {
                                const active = secondaryDisciplines.includes(discipline);
                                const disabled = !active && secondaryDisciplines.length >= 2;
                                return (
                                    <button
                                        key={discipline}
                                        type="button"
                                        onClick={() => toggleSecondary(discipline)}
                                        disabled={disabled}
                                        className={`${styles.secondaryButton} ${active ? styles.secondaryButtonActive : ''} ${disabled ? styles.secondaryButtonDisabled : ''}`}
                                    >
                                        {disciplineLabel(t, discipline)}
                                    </button>
                                );
                            })}
                        </div>
                        <p className={styles.helper}>{t('secondaryHint')}</p>
                    </div>

                </>
            )}

            <div className={styles.actions}>
                {mode !== 'settings' && step === 'sport' && (
                    <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={() => setStep('basic')}
                        disabled={isSubmitting}
                    >
                        {t('back')}
                    </button>
                )}

                {onCancel && (
                    <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        {t('cancel')}
                    </button>
                )}

                {mode !== 'settings' && step === 'basic' && (
                    <button
                        type="button"
                        className={styles.saveBtn}
                        onClick={() => setStep('sport')}
                        disabled={!canProceedFromBasic || isSubmitting}
                    >
                        {t('next')}
                    </button>
                )}

                {(mode === 'settings' || step === 'sport') && (
                    <button
                        type="button"
                        className={styles.saveBtn}
                        onClick={handleSubmit}
                        disabled={isSubmitting || hasInvalidDisciplinePair || (mode !== 'settings' && !name.trim())}
                    >
                        {isSubmitting ? <Loader2 size={16} aria-hidden="true" style={{ animation: 'spin 0.7s linear infinite' }} /> : resolvedSubmitLabel}
                    </button>
                )}
            </div>
        </div>
    );
}
