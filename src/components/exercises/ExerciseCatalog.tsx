'use client';

/**
 * ExerciseCatalog — основной компонент каталога упражнений.
 * Поиск, фильтры по категории/уровню/фазе, сетка карточек, избранные.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Search, Star, X, Filter, Plus } from 'lucide-react';
import { searchExercises } from '@/lib/pocketbase/services/exercises';
import type { ExercisesRecord, TrainingCategory, ExerciseLevel, PhaseType } from '@/lib/pocketbase/types';
import type { Language } from '@/lib/pocketbase/types';
import { useExerciseFavorites } from '@/lib/hooks/useExerciseFavorites';
import { ExerciseDetailSheet } from './ExerciseDetailSheet';
import { ShowAthleteOverlay } from './ShowAthleteOverlay';
import { ExerciseConstructor } from './ExerciseConstructor';
import styles from './ExerciseCatalog.module.css';

type FilterTab = 'all' | 'favorites';

interface Filters {
    category: TrainingCategory | '';
    level: ExerciseLevel | '';
    phase: PhaseType | '';
    equipment: string;
}

const CATEGORIES: TrainingCategory[] = ['plyometric', 'highjump', 'strength', 'gpp', 'speed', 'flexibility', 'jump'];
const LEVELS: ExerciseLevel[] = ['beginner', 'intermediate', 'advanced'];
const PHASES: PhaseType[] = ['GPP', 'SPP', 'PRE_COMP', 'COMP', 'TRANSITION'];

function getExerciseName(ex: ExercisesRecord, locale: Language): string {
    switch (locale) {
        case 'ru': return ex.name_ru || ex.name_en;
        case 'cn': return ex.name_cn || ex.name_en;
        default: return ex.name_en;
    }
}

export function ExerciseCatalog() {
    const t = useTranslations('exercises');
    const locale = useLocale() as Language;
    const { isFavorite, toggleFavorite, getFavoriteIds } = useExerciseFavorites();

    const [exercises, setExercises] = useState<ExercisesRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [tab, setTab] = useState<FilterTab>('all');
    const [filters, setFilters] = useState<Filters>({ category: '', level: '', phase: '', equipment: '' });
    const [showFilters, setShowFilters] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState<ExercisesRecord | null>(null);
    const [showAthleteEx, setShowAthleteEx] = useState<ExercisesRecord | null>(null);
    const [showConstructor, setShowConstructor] = useState(false);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 350);
        return () => clearTimeout(timer);
    }, [query]);

    const loadExercises = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const results = await searchExercises({
                query: debouncedQuery || undefined,
                category: filters.category || undefined,
                level: filters.level || undefined,
                phase: filters.phase || undefined,
                equipment: filters.equipment || undefined,
            });
            setExercises(results);
        } catch (err) {
            const { logError } = await import('@/lib/utils/errors');
            logError(err, { component: 'ExerciseCatalog', action: 'load' });
            setError(t('loadError'));
        } finally {
            setIsLoading(false);
        }
    }, [debouncedQuery, filters, t]);

    useEffect(() => {
        loadExercises();
    }, [loadExercises]);

    const favoriteIds = getFavoriteIds();

    const displayedExercises = useMemo(() => {
        if (tab === 'favorites') {
            const favSet = new Set(favoriteIds);
            return exercises.filter((ex) => favSet.has(ex.id));
        }
        return exercises;
    }, [exercises, tab, favoriteIds]);

    const activeFilterCount = [filters.category, filters.level, filters.phase, filters.equipment].filter(Boolean).length;

    const resetFilters = useCallback(() => {
        setFilters({ category: '', level: '', phase: '', equipment: '' });
    }, []);

    return (
        <div className={styles.root}>
            {/* Top row: Search + Create button */}
            <div className={styles.topRow}>
                <button
                    type="button"
                    className={styles.createBtn}
                    onClick={() => setShowConstructor(true)}
                    aria-label={t('createExercise')}
                >
                    <Plus size={16} aria-hidden="true" />
                    {t('createExercise')}
                </button>
            </div>

            {/* Search bar */}
            <div className={styles.searchRow}>
                <div className={styles.searchWrap}>
                    <Search size={16} className={styles.searchIcon} aria-hidden="true" />
                    <input
                        type="search"
                        className={styles.searchInput}
                        placeholder={t('search')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        aria-label={t('search')}
                    />
                    {query && (
                        <button
                            type="button"
                            className={styles.clearBtn}
                            onClick={() => setQuery('')}
                            aria-label="Clear"
                        >
                            <X size={14} aria-hidden="true" />
                        </button>
                    )}
                </div>
                <button
                    type="button"
                    className={`${styles.filterToggleBtn} ${activeFilterCount > 0 ? styles.filterActive : ''}`}
                    onClick={() => setShowFilters((v) => !v)}
                    aria-label={t('filterCategory')}
                    aria-expanded={showFilters}
                >
                    <Filter size={16} aria-hidden="true" />
                    {activeFilterCount > 0 && (
                        <span className={styles.filterBadge} aria-label={`${activeFilterCount} active filters`}>
                            {activeFilterCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Filter panel */}
            {showFilters && (
                <div className={styles.filterPanel} role="group" aria-label="Filters">
                    {/* Category */}
                    <div className={styles.filterGroup}>
                        <p className={styles.filterLabel}>{t('filterCategory')}</p>
                        <div className={styles.chips}>
                            <button
                                type="button"
                                className={`${styles.chip} ${!filters.category ? styles.chipActive : ''}`}
                                onClick={() => setFilters((f) => ({ ...f, category: '' }))}
                            >
                                {t('filterAll')}
                            </button>
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    className={`${styles.chip} ${filters.category === cat ? styles.chipActive : ''}`}
                                    onClick={() => setFilters((f) => ({ ...f, category: cat }))}
                                    style={filters.category === cat ? {
                                        background: `color-mix(in srgb, var(--color-${cat}) 15%, transparent)`,
                                        color: `var(--color-${cat})`,
                                        borderColor: `var(--color-${cat})`
                                    } : undefined}
                                >
                                    {t(`category.${cat}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Level */}
                    <div className={styles.filterGroup}>
                        <p className={styles.filterLabel}>{t('filterLevel')}</p>
                        <div className={styles.chips}>
                            <button
                                type="button"
                                className={`${styles.chip} ${!filters.level ? styles.chipActive : ''}`}
                                onClick={() => setFilters((f) => ({ ...f, level: '' }))}
                            >
                                {t('filterAll')}
                            </button>
                            {LEVELS.map((lvl) => (
                                <button
                                    key={lvl}
                                    type="button"
                                    className={`${styles.chip} ${filters.level === lvl ? styles.chipActive : ''}`}
                                    onClick={() => setFilters((f) => ({ ...f, level: lvl }))}
                                >
                                    {t(`level.${lvl}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Phase */}
                    <div className={styles.filterGroup}>
                        <p className={styles.filterLabel}>{t('filterPhase')}</p>
                        <div className={styles.chips}>
                            <button
                                type="button"
                                className={`${styles.chip} ${!filters.phase ? styles.chipActive : ''}`}
                                onClick={() => setFilters((f) => ({ ...f, phase: '' }))}
                            >
                                {t('filterAll')}
                            </button>
                            {PHASES.map((ph) => (
                                <button
                                    key={ph}
                                    type="button"
                                    className={`${styles.chip} ${filters.phase === ph ? styles.chipActive : ''}`}
                                    onClick={() => setFilters((f) => ({ ...f, phase: ph }))}
                                >
                                    {ph}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Equipment */}
                    <div className={styles.filterGroup}>
                        <p className={styles.filterLabel}>{t('filterEquipment')}</p>
                        <div className={styles.chips}>
                            <button
                                type="button"
                                className={`${styles.chip} ${!filters.equipment ? styles.chipActive : ''}`}
                                onClick={() => setFilters((f) => ({ ...f, equipment: '' }))}
                            >
                                {t('filterAll')}
                            </button>
                            {['barbell', 'box', 'dumbbell', 'mat', 'hurdles', 'band', 'bodyweight'].map((eq) => (
                                <button
                                    key={eq}
                                    type="button"
                                    className={`${styles.chip} ${filters.equipment === eq ? styles.chipActive : ''}`}
                                    onClick={() => setFilters((f) => ({ ...f, equipment: eq }))}
                                >
                                    {eq}
                                </button>
                            ))}
                        </div>
                    </div>

                    {activeFilterCount > 0 && (
                        <button type="button" className={styles.resetBtn} onClick={resetFilters}>
                            <X size={14} aria-hidden="true" /> {t('filterAll')}
                        </button>
                    )}
                </div>
            )}

            {/* Tabs */}
            <div className={styles.tabs} role="tablist">
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'all'}
                    className={`${styles.tab} ${tab === 'all' ? styles.tabActive : ''}`}
                    onClick={() => setTab('all')}
                >
                    {t('allExercises')}
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'favorites'}
                    className={`${styles.tab} ${tab === 'favorites' ? styles.tabActive : ''}`}
                    onClick={() => setTab('favorites')}
                >
                    <Star size={14} aria-hidden="true" />
                    {t('favorites')}
                </button>
            </div>

            {/* Count */}
            {!isLoading && !error && (
                <p className={styles.count}>
                    {displayedExercises.length} {t('found')}
                </p>
            )}

            {/* States */}
            {isLoading && (
                <div className={styles.loadingState}>
                    <div className={styles.spinner} aria-label={t('loading')} />
                </div>
            )}

            {error && (
                <div className={styles.errorState}>
                    <p>{error}</p>
                    <button type="button" className={styles.retryBtn} onClick={loadExercises}>
                        {t('retry')}
                    </button>
                </div>
            )}

            {!isLoading && !error && displayedExercises.length === 0 && (
                <div className={styles.emptyState}>
                    <p className={styles.emptyTitle}>{t('noResults')}</p>
                    <p className={styles.emptyHint}>{t('noResultsHint')}</p>
                </div>
            )}

            {/* Grid */}
            {!isLoading && displayedExercises.length > 0 && (
                <div className={styles.grid}>
                    {displayedExercises.map((ex) => {
                        const catColor = `var(--color-${ex.training_category})`;
                        const name = getExerciseName(ex, locale);
                        const fav = isFavorite(ex.id);

                        return (
                            <button
                                key={ex.id}
                                type="button"
                                className={styles.card}
                                onClick={() => setSelectedExercise(ex)}
                                aria-label={name}
                            >
                                {/* Color accent */}
                                <div
                                    className={styles.cardAccent}
                                    style={{ background: catColor }}
                                    aria-hidden="true"
                                />

                                {/* Favorite star */}
                                <button
                                    type="button"
                                    className={`${styles.favBtn} ${fav ? styles.favActive : ''}`}
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(ex.id); }}
                                    aria-label={fav ? t('removeFavorite') : t('addFavorite')}
                                    aria-pressed={fav}
                                >
                                    <Star size={14} fill={fav ? 'currentColor' : 'none'} aria-hidden="true" />
                                </button>

                                <div className={styles.cardBody}>
                                    <div className={styles.badgeRow}>
                                        <span
                                            className={styles.categoryBadge}
                                            style={{ color: catColor, background: `color-mix(in srgb, ${catColor} 10%, transparent)` }}
                                        >
                                            {t(`category.${ex.training_category}`)}
                                        </span>
                                        {(ex as ExercisesRecord & { status?: string }).status === 'approved' && (
                                            <span className={styles.communityBadge}>{t('communityBadge')}</span>
                                        )}
                                    </div>
                                    <h3 className={styles.cardName}>{name}</h3>
                                    <div className={styles.cardMeta}>
                                        <span className={styles.metaItem}>{t(`level.${ex.level}`)}</span>
                                        {ex.dosage && (
                                            <span className={styles.metaItem}>{ex.dosage}</span>
                                        )}
                                        <span className={styles.cnsDots} aria-label={`CNS ${ex.cns_cost}`}>
                                            {Array.from({ length: 5 }, (_, i) => (
                                                <span
                                                    key={i}
                                                    className={`${styles.cnsDot} ${i < ex.cns_cost ? styles.cnsDotFilled : ''}`}
                                                />
                                            ))}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Detail sheet */}
            {selectedExercise && (
                <ExerciseDetailSheet
                    exercise={selectedExercise}
                    onClose={() => setSelectedExercise(null)}
                    onShowAthlete={(ex) => {
                        setSelectedExercise(null);
                        setShowAthleteEx(ex);
                    }}
                />
            )}

            {/* Show athlete fullscreen overlay */}
            {showAthleteEx && (
                <ShowAthleteOverlay
                    exercise={showAthleteEx}
                    locale={locale}
                    onClose={() => setShowAthleteEx(null)}
                    labels={{ close: t('close'), dosage: t('dosage') }}
                />
            )}

            {/* Exercise Constructor (create custom exercise) */}
            {showConstructor && (
                <ExerciseConstructor
                    onClose={() => setShowConstructor(false)}
                    onCreated={() => {
                        setShowConstructor(false);
                        loadExercises();
                    }}
                />
            )}
        </div>
    );
}
