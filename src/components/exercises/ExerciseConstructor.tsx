'use client';

/**
 * ExerciseConstructor — 4-step wizard для создания custom exercise.
 *
 * Step 1: Basics    — name (RU/EN), category, level, cns_cost
 * Step 2: Details   — dosage, equipment, muscles, phase_suitability
 * Step 3: Coaching  — coach_cues_ru, coach_cues_en
 * Step 4: Review    — preview + submit or save as personal
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { createCustomExercise, submitForReview } from '@/lib/pocketbase/services/customExercises';
import { pb } from '@/lib/pocketbase';
import type { TrainingCategory, ExerciseLevel, PhaseType, UnitType } from '@/lib/pocketbase/types';
import styles from './ExerciseConstructor.module.css';

const CATEGORIES: TrainingCategory[] = ['plyometric', 'highjump', 'strength', 'gpp', 'speed', 'flexibility', 'jump'];
const LEVELS: ExerciseLevel[] = ['beginner', 'intermediate', 'advanced'];
const PHASES: PhaseType[] = ['GPP', 'SPP', 'PRE_COMP', 'COMP', 'TRANSITION'];

interface FormData {
    name_ru: string;
    name_en: string;
    training_category: TrainingCategory;
    level: ExerciseLevel;
    unit_type: UnitType;
    cns_cost: number;
    dosage: string;
    equipment: string;
    muscles: string;
    phase_suitability: PhaseType[];
    coach_cues_ru: string;
    coach_cues_en: string;
}

const INITIAL: FormData = {
    name_ru: '',
    name_en: '',
    training_category: 'strength',
    level: 'intermediate',
    unit_type: 'reps',
    cns_cost: 2,
    dosage: '',
    equipment: '',
    muscles: '',
    phase_suitability: [],
    coach_cues_ru: '',
    coach_cues_en: '',
};

interface Props {
    onClose: () => void;
    onCreated?: () => void;
}

function StepDots({ current, total }: { current: number; total: number }) {
    return (
        <div className={styles.stepDots} aria-label={`Step ${current + 1} of ${total}`}>
            {Array.from({ length: total }, (_, i) => (
                <div
                    key={i}
                    className={`${styles.dot} ${i === current ? styles.dotActive : ''} ${i < current ? styles.dotDone : ''}`}
                />
            ))}
        </div>
    );
}

export function ExerciseConstructor({ onClose, onCreated }: Props) {
    const t = useTranslations('constructor');
    const tEx = useTranslations('exercises');
    const [step, setStep] = useState(0);
    const [form, setForm] = useState<FormData>(INITIAL);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const update = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    }, []);

    const togglePhase = useCallback((phase: PhaseType) => {
        setForm((prev) => ({
            ...prev,
            phase_suitability: prev.phase_suitability.includes(phase)
                ? prev.phase_suitability.filter((p) => p !== phase)
                : [...prev.phase_suitability, phase],
        }));
    }, []);

    const canNext = useCallback((): boolean => {
        if (step === 0) return !!form.name_en.trim();
        if (step === 1) return form.phase_suitability.length > 0;
        return true;
    }, [step, form]);

    const handleSave = useCallback(async (submit: boolean) => {
        setSaving(true);
        setError('');
        try {
            const userId = pb.authStore.record?.id ?? '';
            const created = await createCustomExercise(userId, {
                name_ru: form.name_ru || undefined,
                name_en: form.name_en,
                training_category: form.training_category,
                level: form.level,
                unit_type: form.unit_type,
                cns_cost: form.cns_cost,
                dosage: form.dosage || undefined,
                equipment: form.equipment ? form.equipment.split(',').map((s) => s.trim()).filter(Boolean) : [],
                muscles: form.muscles ? form.muscles.split(',').map((s) => s.trim()).filter(Boolean) : [],
                phase_suitability: form.phase_suitability,
                coach_cues_ru: form.coach_cues_ru || undefined,
                coach_cues_en: form.coach_cues_en || undefined,
            });

            if (submit) {
                await submitForReview(created.id);
            }

            onCreated?.();
            onClose();
        } catch (err) {
            setError(t('saveError'));
            console.error(err);
        } finally {
            setSaving(false);
        }
    }, [form, onClose, onCreated, t]);

    const TOTAL_STEPS = 4;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
                {/* Handle */}
                <div className={styles.handle} />

                {/* Header */}
                <div className={styles.header}>
                    <button
                        type="button"
                        className={styles.backBtn}
                        onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}
                        aria-label={step === 0 ? t('cancel') : t('back')}
                    >
                        {step === 0 ? <X size={20} /> : <ChevronLeft size={20} />}
                    </button>
                    <div className={styles.headerCenter}>
                        <p className={styles.headerTitle}>{t('title')}</p>
                        <StepDots current={step} total={TOTAL_STEPS} />
                    </div>
                    <div className={styles.headerSpacer} aria-hidden="true" />
                </div>

                {/* Body */}
                <div className={styles.body}>

                    {/* Step 0: Basics */}
                    {step === 0 && (
                        <div className={styles.stepContent}>
                            <h2 className={styles.stepTitle}>{t('step1Title')}</h2>

                            <div className={styles.field}>
                                <label className={styles.label}>{t('nameEn')} *</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={form.name_en}
                                    onChange={(e) => update('name_en', e.target.value)}
                                    placeholder="e.g. Box Jump"
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>{t('nameRu')}</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={form.name_ru}
                                    onChange={(e) => update('name_ru', e.target.value)}
                                    placeholder={t('nameRuPlaceholder')}
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>{t('category')}</label>
                                <div className={styles.chips}>
                                    {CATEGORIES.map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            className={`${styles.chip} ${form.training_category === cat ? styles.chipActive : ''}`}
                                            onClick={() => update('training_category', cat)}
                                        >
                                            {tEx(`category.${cat}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.row}>
                                <div className={styles.field}>
                                    <label className={styles.label}>{t('level')}</label>
                                    <div className={styles.chips}>
                                        {LEVELS.map((lvl) => (
                                            <button
                                                key={lvl}
                                                type="button"
                                                className={`${styles.chip} ${form.level === lvl ? styles.chipActive : ''}`}
                                                onClick={() => update('level', lvl)}
                                            >
                                                {tEx(`level.${lvl}`)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className={styles.field}>
                                    <label className={styles.label}>{t('cns')} (1-5)</label>
                                    <div className={styles.chips}>
                                        {[1, 2, 3, 4, 5].map((n) => (
                                            <button
                                                key={n}
                                                type="button"
                                                className={`${styles.chip} ${form.cns_cost === n ? styles.chipActive : ''}`}
                                                onClick={() => update('cns_cost', n)}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 1: Details */}
                    {step === 1 && (
                        <div className={styles.stepContent}>
                            <h2 className={styles.stepTitle}>{t('step2Title')}</h2>

                            <div className={styles.field}>
                                <label className={styles.label}>{t('dosage')}</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={form.dosage}
                                    onChange={(e) => update('dosage', e.target.value)}
                                    placeholder="e.g. 3×8, 30 sec"
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>{t('equipment')}</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={form.equipment}
                                    onChange={(e) => update('equipment', e.target.value)}
                                    placeholder={t('commaSeparated')}
                                />
                                <p className={styles.hint}>{t('equipmentHint')}</p>
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>{t('muscles')}</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={form.muscles}
                                    onChange={(e) => update('muscles', e.target.value)}
                                    placeholder={t('commaSeparated')}
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>{t('phases')} *</label>
                                <div className={styles.chips}>
                                    {PHASES.map((ph) => (
                                        <button
                                            key={ph}
                                            type="button"
                                            className={`${styles.chip} ${form.phase_suitability.includes(ph) ? styles.chipActive : ''}`}
                                            onClick={() => togglePhase(ph)}
                                        >
                                            {ph}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Coaching */}
                    {step === 2 && (
                        <div className={styles.stepContent}>
                            <h2 className={styles.stepTitle}>{t('step3Title')}</h2>
                            <p className={styles.stepHint}>{t('step3Hint')}</p>

                            <div className={styles.field}>
                                <label className={styles.label}>{t('cuesEn')}</label>
                                <textarea
                                    className={styles.textarea}
                                    value={form.coach_cues_en}
                                    onChange={(e) => update('coach_cues_en', e.target.value)}
                                    placeholder="e.g. Drive knees up, land softly..."
                                    rows={4}
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>{t('cuesRu')}</label>
                                <textarea
                                    className={styles.textarea}
                                    value={form.coach_cues_ru}
                                    onChange={(e) => update('coach_cues_ru', e.target.value)}
                                    placeholder={t('cuesRuPlaceholder')}
                                    rows={4}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review */}
                    {step === 3 && (
                        <div className={styles.stepContent}>
                            <h2 className={styles.stepTitle}>{t('step4Title')}</h2>

                            <div className={styles.reviewCard}>
                                <p className={styles.reviewName}>{form.name_en}</p>
                                {form.name_ru && <p className={styles.reviewNameRu}>{form.name_ru}</p>}
                                <div className={styles.reviewRow}>
                                    <span className={styles.reviewLabel}>{t('category')}:</span>
                                    <span>{tEx(`category.${form.training_category}`)}</span>
                                </div>
                                <div className={styles.reviewRow}>
                                    <span className={styles.reviewLabel}>{t('level')}:</span>
                                    <span>{tEx(`level.${form.level}`)}</span>
                                </div>
                                <div className={styles.reviewRow}>
                                    <span className={styles.reviewLabel}>{t('cns')}:</span>
                                    <span>{form.cns_cost}/5</span>
                                </div>
                                {form.dosage && (
                                    <div className={styles.reviewRow}>
                                        <span className={styles.reviewLabel}>{t('dosage')}:</span>
                                        <span>{form.dosage}</span>
                                    </div>
                                )}
                                <div className={styles.reviewRow}>
                                    <span className={styles.reviewLabel}>{t('phases')}:</span>
                                    <span>{form.phase_suitability.join(', ')}</span>
                                </div>
                            </div>

                            {error && <p className={styles.error}>{error}</p>}

                            <div className={styles.reviewActions}>
                                <button
                                    type="button"
                                    className={styles.savePersonalBtn}
                                    onClick={() => handleSave(false)}
                                    disabled={saving}
                                >
                                    {saving ? '...' : t('savePersonal')}
                                </button>
                                <button
                                    type="button"
                                    className={styles.submitBtn}
                                    onClick={() => handleSave(true)}
                                    disabled={saving}
                                >
                                    <Check size={16} aria-hidden="true" />
                                    {saving ? '...' : t('submitReview')}
                                </button>
                            </div>

                            <p className={styles.reviewNote}>{t('reviewNote')}</p>
                        </div>
                    )}
                </div>

                {/* Footer nav */}
                {step < 3 && (
                    <div className={styles.footer}>
                        <button
                            type="button"
                            className={styles.nextBtn}
                            onClick={() => setStep((s) => s + 1)}
                            disabled={!canNext()}
                            aria-label={t('next')}
                        >
                            {t('next')} <ChevronRight size={18} aria-hidden="true" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
