'use client';

/**
 * ExercisePicker — refactored.
 * - phaseType сделан optional (QuickWorkout не привязан к фазе)
 * - добавлена вкладка «Мои упражнения» (custom_exercises)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Search, X, Filter, Zap, User } from 'lucide-react';
import { searchExercises, getExerciseName, cnsCostColor, CATEGORY_COLORS } from '@/lib/pocketbase/services/exercises';
import type { ExerciseRecord } from '@/lib/pocketbase/services/exercises';
import type { PhaseType, TrainingCategory, ExerciseLevel } from '@/lib/pocketbase/types';
import { listMyCustomExercises, getCustomExerciseName } from '@/lib/pocketbase/services/customExercises';
import type { CustomExercisesRecord } from '@/lib/pocketbase/services/customExercises';
import { pb } from '@/lib/pocketbase';
import styles from './ExercisePicker.module.css';

// Unified type for both sources
export type PickedExercise =
    | { source: 'library'; exercise: ExerciseRecord }
    | { source: 'custom'; exercise: CustomExercisesRecord };

interface Props {
    phaseType?: PhaseType; // now optional
    onSelect: (exercise: ExerciseRecord | CustomExercisesRecord, source: 'library' | 'custom') => void;
    onClose: () => void;
}

type Tab = 'library' | 'custom';

const CATEGORY_OPTIONS: TrainingCategory[] = [
    'plyometric', 'highjump', 'strength', 'gpp', 'speed', 'flexibility', 'jump',
];
const LEVEL_OPTIONS: ExerciseLevel[] = ['beginner', 'intermediate', 'advanced'];

export default function ExercisePicker({ phaseType, onSelect, onClose }: Props) {
    const t = useTranslations();
    const locale = useLocale() as 'ru' | 'en' | 'cn';

    const [tab, setTab] = useState<Tab>('library');
    const [query, setQuery] = useState('');
    const [filterPhase, setFilterPhase] = useState(!!phaseType);
    const [filterCategory, setFilterCategory] = useState<TrainingCategory | null>(null);
    const [filterLevel, setFilterLevel] = useState<ExerciseLevel | null>(null);
    const [exercises, setExercises] = useState<ExerciseRecord[]>([]);
    const [customExercises, setCustomExercises] = useState<CustomExercisesRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    // Fetch library exercises
    const fetchExercises = useCallback(async () => {
        if (tab !== 'library') return;
        setLoading(true);
        try {
            const results = await searchExercises({
                query: query.trim() || undefined,
                phase: filterPhase && phaseType ? phaseType : undefined,
                category: filterCategory ?? undefined,
                level: filterLevel ?? undefined,
            });
            setExercises(results);
        } catch (err) {
            console.error('Failed to search exercises:', err);
        } finally {
            setLoading(false);
        }
    }, [query, filterPhase, phaseType, filterCategory, filterLevel, tab]);

    // Fetch my custom exercises
    const fetchCustomExercises = useCallback(async () => {
        if (tab !== 'custom') return;
        setLoading(true);
        try {
            const userId = pb.authStore.record?.id ?? '';
            const results = await listMyCustomExercises(userId);
            setCustomExercises(results);
        } catch (err) {
            console.error('Failed to fetch custom exercises:', err);
        } finally {
            setLoading(false);
        }
    }, [tab]);

    // Debounced search for library
    useEffect(() => {
        const timer = setTimeout(fetchExercises, 300);
        return () => clearTimeout(timer);
    }, [fetchExercises]);

    // Immediate load for custom tab
    useEffect(() => {
        fetchCustomExercises();
    }, [fetchCustomExercises]);

    // Filter custom exercises by query
    const filteredCustom = useMemo(() => {
        if (!query.trim()) return customExercises;
        const q = query.toLowerCase();
        return customExercises.filter((ex) =>
            (ex.name_ru?.toLowerCase().includes(q)) ||
            (ex.name_en?.toLowerCase().includes(q)) ||
            (ex.name_cn?.toLowerCase().includes(q))
        );
    }, [customExercises, query]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filterPhase && phaseType) count++;
        if (filterCategory) count++;
        if (filterLevel) count++;
        return count;
    }, [filterPhase, phaseType, filterCategory, filterLevel]);

    const displayList = tab === 'library' ? exercises : filteredCustom;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
                {/* Handle */}
                <div className={styles.handle} />

                {/* Header */}
                <div className={styles.header}>
                    <h3 className={styles.title}>{t('training.addExercise')}</h3>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label={t('close')}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className={styles.tabs} role="tablist">
                    <button
                        role="tab"
                        aria-selected={tab === 'library'}
                        className={`${styles.tab} ${tab === 'library' ? styles.tabActive : ''}`}
                        onClick={() => setTab('library')}
                    >
                        {t('exercises.allExercises')}
                    </button>
                    <button
                        role="tab"
                        aria-selected={tab === 'custom'}
                        className={`${styles.tab} ${tab === 'custom' ? styles.tabActive : ''}`}
                        onClick={() => setTab('custom')}
                    >
                        <User size={14} aria-hidden="true" />
                        {t('constructor.myExercises')}
                    </button>
                </div>

                {/* Search + Filter toggle */}
                <div className={styles.searchRow}>
                    <div className={styles.searchBox}>
                        <Search size={16} className={styles.searchIcon} />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t('training.searchExercises')}
                            className={styles.searchInput}
                            autoFocus
                        />
                        {query && (
                            <button
                                className={styles.clearBtn}
                                onClick={() => setQuery('')}
                                aria-label="Clear"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    {tab === 'library' && (
                        <button
                            className={`${styles.filterToggle} ${showFilters ? styles.filterActive : ''}`}
                            onClick={() => setShowFilters(!showFilters)}
                            aria-label={t('training.filterByPhase')}
                        >
                            <Filter size={18} />
                            {activeFilterCount > 0 && (
                                <span className={styles.filterBadge}>{activeFilterCount}</span>
                            )}
                        </button>
                    )}
                </div>

                {/* Filters panel (library only) */}
                {tab === 'library' && showFilters && (
                    <div className={styles.filtersPanel}>
                        {/* Phase filter — only show if phaseType provided */}
                        {phaseType && (
                            <div className={styles.filterGroup}>
                                <span className={styles.filterLabel}>{t('training.filterByPhase')}</span>
                                <button
                                    className={`${styles.chip} ${filterPhase ? styles.chipActive : ''}`}
                                    onClick={() => setFilterPhase(!filterPhase)}
                                >
                                    {phaseType}
                                </button>
                            </div>
                        )}

                        {/* Category filter */}
                        <div className={styles.filterGroup}>
                            <span className={styles.filterLabel}>{t('training.category')}</span>
                            <div className={styles.chipRow}>
                                {CATEGORY_OPTIONS.map((cat) => (
                                    <button
                                        key={cat}
                                        className={`${styles.chip} ${filterCategory === cat ? styles.chipActive : ''}`}
                                        style={
                                            filterCategory === cat
                                                ? { backgroundColor: CATEGORY_COLORS[cat], color: '#fff' }
                                                : undefined
                                        }
                                        onClick={() =>
                                            setFilterCategory(filterCategory === cat ? null : cat)
                                        }
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Level filter */}
                        <div className={styles.filterGroup}>
                            <span className={styles.filterLabel}>{t('training.level')}</span>
                            <div className={styles.chipRow}>
                                {LEVEL_OPTIONS.map((lvl) => (
                                    <button
                                        key={lvl}
                                        className={`${styles.chip} ${filterLevel === lvl ? styles.chipActive : ''}`}
                                        onClick={() =>
                                            setFilterLevel(filterLevel === lvl ? null : lvl)
                                        }
                                    >
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Results */}
                <div className={styles.results}>
                    {loading ? (
                        <div className={styles.loading}>{t('loading')}</div>
                    ) : displayList.length === 0 ? (
                        <div className={styles.empty}>
                            {tab === 'custom'
                                ? t('constructor.noCustomExercises')
                                : t('training.noExercises')
                            }
                        </div>
                    ) : tab === 'library' ? (
                        (displayList as ExerciseRecord[]).map((exercise) => (
                            <button
                                key={exercise.id}
                                className={styles.exerciseRow}
                                style={{ borderLeftColor: CATEGORY_COLORS[exercise.training_category] }}
                                onClick={() => onSelect(exercise, 'library')}
                            >
                                <div className={styles.exerciseInfo}>
                                    <span className={styles.exerciseName}>
                                        {getExerciseName(exercise, locale)}
                                    </span>
                                    <div className={styles.exerciseMeta}>
                                        <span
                                            className={styles.categoryChip}
                                            style={{
                                                backgroundColor: CATEGORY_COLORS[exercise.training_category] + '20',
                                                color: CATEGORY_COLORS[exercise.training_category],
                                            }}
                                        >
                                            {exercise.training_category}
                                        </span>
                                        <span className={styles.levelBadge}>{exercise.level}</span>
                                    </div>
                                </div>
                                <div
                                    className={styles.cnsDot}
                                    style={{ backgroundColor: cnsCostColor(exercise.cns_cost) }}
                                    title={`CNS: ${exercise.cns_cost}/5`}
                                >
                                    <Zap size={10} />
                                </div>
                            </button>
                        ))
                    ) : (
                        (displayList as CustomExercisesRecord[]).map((exercise) => (
                            <button
                                key={exercise.id}
                                className={styles.exerciseRow}
                                style={{ borderLeftColor: CATEGORY_COLORS[exercise.training_category] }}
                                onClick={() => onSelect(exercise, 'custom')}
                            >
                                <div className={styles.exerciseInfo}>
                                    <span className={styles.exerciseName}>
                                        {getCustomExerciseName(exercise, locale)}
                                    </span>
                                    <div className={styles.exerciseMeta}>
                                        <span
                                            className={styles.categoryChip}
                                            style={{
                                                backgroundColor: CATEGORY_COLORS[exercise.training_category] + '20',
                                                color: CATEGORY_COLORS[exercise.training_category],
                                            }}
                                        >
                                            {exercise.training_category}
                                        </span>
                                        <span className={`${styles.levelBadge} ${styles.customBadge}`}>
                                            <User size={10} />
                                        </span>
                                    </div>
                                </div>
                                <div
                                    className={styles.cnsDot}
                                    style={{ backgroundColor: cnsCostColor(exercise.cns_cost) }}
                                    title={`CNS: ${exercise.cns_cost}/5`}
                                >
                                    <Zap size={10} />
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Count */}
                {!loading && displayList.length > 0 && (
                    <div className={styles.footer}>
                        {displayList.length} {t('training.exercisesFound')}
                    </div>
                )}
            </div>
        </div>
    );
}
