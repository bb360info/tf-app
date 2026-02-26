'use client';

import { ArrowRight, Check, Trophy, Zap, type LucideIcon } from 'lucide-react';
import type { Discipline } from '@/lib/pocketbase/types';
import styles from './DisciplineSelector.module.css';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DisciplineMeta {
    value: Discipline;
    Icon: LucideIcon;
    unit: string;   // measurement unit for PB
}

const DISCIPLINES: DisciplineMeta[] = [
    { value: 'high_jump', Icon: Trophy, unit: 'm' },
    { value: 'long_jump', Icon: ArrowRight, unit: 'm' },
    { value: 'triple_jump', Icon: Zap, unit: 'm' },
];

// ─── Props ───────────────────────────────────────────────────────────────────

export interface DisciplineSelectorProps {
    /** Label lookup function — pass t from useTranslations('onboarding.specialization') */
    t: (key: string) => string;
    /** Currently selected primary discipline */
    primary: Discipline | '';
    onPrimaryChange: (d: Discipline) => void;
    /** Currently selected secondary disciplines */
    secondary?: Discipline[];
    onSecondaryChange?: (d: Discipline[]) => void;
    showSecondary?: boolean;
    /** Show PB input below primary */
    personalBest?: string;
    onPersonalBestChange?: (v: string) => void;
    showPersonalBest?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DisciplineSelector({
    t,
    primary,
    onPrimaryChange,
    secondary = [],
    onSecondaryChange,
    showSecondary = true,
    personalBest = '',
    onPersonalBestChange,
    showPersonalBest = true,
}: DisciplineSelectorProps) {

    function handleSecondaryToggle(d: Discipline) {
        if (!onSecondaryChange) return;
        if (secondary.includes(d)) {
            onSecondaryChange(secondary.filter((x) => x !== d));
        } else {
            onSecondaryChange([...secondary, d]);
        }
    }

    return (
        <div className={styles.container}>
            {/* Primary discipline — single select */}
            <div>
                <p className={styles.sectionLabel}>{t('primary')}</p>
                <div className={styles.cardGroup}>
                    {DISCIPLINES.map((disc) => {
                        const isActive = primary === disc.value;
                        return (
                            <button
                                key={disc.value}
                                type="button"
                                className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
                                onClick={() => onPrimaryChange(disc.value)}
                                aria-pressed={isActive}
                            >
                                <span className={styles.cardIcon} aria-hidden>
                                    <disc.Icon size={18} />
                                </span>
                                <div>
                                    <p className={styles.cardName}>
                                        {t(`disciplines.${disc.value}`)}
                                    </p>
                                </div>
                                {isActive && (
                                    <Check
                                        size={18}
                                        className={`${styles.checkmark} ${styles.checkmarkActive}`}
                                        aria-hidden
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Personal Best — shown after primary is selected */}
            {showPersonalBest && primary && onPersonalBestChange && (
                <div className={styles.pbSection}>
                    <p className={styles.pbLabel}>{t('personalBest')}</p>
                    <div className={styles.pbInputRow}>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="30"
                            value={personalBest}
                            onChange={(e) => onPersonalBestChange(e.target.value)}
                            placeholder={t('pbPlaceholder')}
                            className={styles.pbInput}
                        />
                        <span className={styles.pbUnit}>{t('meters')}</span>
                    </div>
                    <p className={styles.pbHint}>{t('pbHint')}</p>
                </div>
            )}

            {/* Secondary disciplines — multi-select, exclude primary */}
            {showSecondary && onSecondaryChange && (
                <div>
                    <p className={styles.sectionLabel}>{t('secondary')}</p>
                    <div className={styles.cardGroup}>
                        {DISCIPLINES.filter((d) => d.value !== primary).map((disc) => {
                            const isActive = secondary.includes(disc.value);
                            return (
                                <button
                                    key={disc.value}
                                    type="button"
                                    className={`${styles.card} ${isActive ? styles.cardSecondaryActive : ''}`}
                                    onClick={() => handleSecondaryToggle(disc.value)}
                                    aria-pressed={isActive}
                                >
                                    <span className={styles.cardIcon} aria-hidden>
                                        <disc.Icon size={18} />
                                    </span>
                                    <p className={styles.cardName}>
                                        {t(`disciplines.${disc.value}`)}
                                    </p>
                                    <div className={`${styles.checkmark} ${isActive ? styles.checkmarkActive : ''}`}>
                                        {isActive && <Check size={12} aria-hidden />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
