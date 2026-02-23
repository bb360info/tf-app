'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { TestType } from '@/lib/pocketbase/types';
import {
    upsertTestResult,
    findExistingTestResult,
    testUnit,
    ALL_TEST_TYPES,
    type TestResultRecord,
} from '@/lib/pocketbase/services/testResults';
import styles from './AddTestResultModal.module.css';

interface AddTestResultModalProps {
    athleteId: string;
    onClose: () => void;
    onCreated: () => void;
    defaultTestType?: TestType;
}

export function AddTestResultModal({
    athleteId,
    onClose,
    onCreated,
    defaultTestType = 'standing_jump',
}: AddTestResultModalProps) {
    const t = useTranslations('analytics');
    const tf = useTranslations('analytics.addTestForm');

    const [testType, setTestType] = useState<TestType>(defaultTestType);
    const [value, setValue] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Confirmation state for upsert
    const [existingRecord, setExistingRecord] = useState<TestResultRecord | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);

    const unit = testUnit(testType);

    const doSave = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            await upsertTestResult({
                athlete_id: athleteId,
                test_type: testType,
                value: parseFloat(value),
                date,
                notes: notes.trim() || undefined,
            });
            onCreated();
        } catch (err) {
            console.error('[AddTestResultModal] upsertTestResult failed:', err);
            setError(tf('saveFailed'));
        } finally {
            setIsLoading(false);
            setShowConfirm(false);
            setExistingRecord(null);
        }
    }, [athleteId, testType, value, date, notes, onCreated, tf]);

    const handleSubmit = useCallback(async () => {
        const numValue = parseFloat(value);
        if (!value || isNaN(numValue) || numValue <= 0) {
            setError(tf('invalidValue'));
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        if (date > today) {
            setError(tf('futureDateError'));
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Check for existing result on this date
            const existing = await findExistingTestResult(athleteId, testType, date);
            if (existing) {
                // Show confirmation
                setExistingRecord(existing);
                setShowConfirm(true);
                setIsLoading(false);
                return;
            }

            // No existing record — save directly
            await doSave();
        } catch (err) {
            console.error('[AddTestResultModal] check/save failed:', err);
            setError(tf('saveFailed'));
            setIsLoading(false);
        }
    }, [athleteId, testType, value, date, tf, doSave]);

    const isValid = value !== '' && parseFloat(value) > 0 && !!date;

    return (
        <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-label={tf('title')}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className={styles.modal}>
                <h2 className={styles.modalTitle}>{tf('title')}</h2>

                {error && <div className={styles.error}>{error}</div>}

                {/* Confirmation banner */}
                {showConfirm && existingRecord && (
                    <div className={styles.confirmBanner}>
                        <div className={styles.confirmIcon}>
                            <AlertTriangle size={18} aria-hidden="true" />
                        </div>
                        <div className={styles.confirmContent}>
                            <p className={styles.confirmText}>
                                {tf('existingResult', {
                                    value: existingRecord.value,
                                    unit,
                                })}
                            </p>
                            <div className={styles.confirmActions}>
                                <button
                                    type="button"
                                    className={styles.confirmYes}
                                    onClick={doSave}
                                    disabled={isLoading}
                                >
                                    {isLoading
                                        ? <Loader2 size={14} aria-hidden="true" className={styles.spinIcon} />
                                        : tf('confirmReplace')}
                                </button>
                                <button
                                    type="button"
                                    className={styles.confirmNo}
                                    onClick={() => { setShowConfirm(false); setExistingRecord(null); }}
                                >
                                    {tf('cancel')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Test type */}
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="test-type">
                        {tf('testType')}
                    </label>
                    <select
                        id="test-type"
                        className={styles.select}
                        value={testType}
                        onChange={(e) => { setTestType(e.target.value as TestType); setShowConfirm(false); }}
                        disabled={showConfirm}
                    >
                        {ALL_TEST_TYPES.map((type) => (
                            <option key={type} value={type}>
                                {t(`tests.${type}`)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Value + Date */}
                <div className={styles.row}>
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="test-value">
                            {tf('value')} ({unit})
                        </label>
                        <input
                            id="test-value"
                            type="number"
                            min="0"
                            step="0.01"
                            className={styles.input}
                            placeholder={unit === 's' ? '3.85' : unit === 'cm' ? '285' : '120'}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            autoFocus
                        />
                        <span className={styles.unitHint}>{unit}</span>
                    </div>
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="test-date">
                            {tf('date')}
                        </label>
                        <input
                            id="test-date"
                            type="date"
                            className={styles.input}
                            value={date}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={(e) => { setDate(e.target.value); setShowConfirm(false); }}
                        />
                    </div>
                </div>

                {/* Notes */}
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="test-notes">
                        {tf('notes')}
                    </label>
                    <textarea
                        id="test-notes"
                        className={styles.textarea}
                        placeholder={tf('notesPlaceholder')}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                {/* Actions */}
                {!showConfirm && (
                    <div className={styles.actions}>
                        <button type="button" className={styles.cancelBtn} onClick={onClose}>
                            {tf('cancel')}
                        </button>
                        <button
                            type="button"
                            className={styles.saveBtn}
                            onClick={handleSubmit}
                            disabled={!isValid || isLoading}
                        >
                            {isLoading
                                ? <Loader2 size={16} aria-hidden="true" className={styles.spinIcon} />
                                : tf('save')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
