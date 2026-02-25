
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    listSeasons,
    deleteSeason,
    PHASE_COLORS,
    PHASE_LABELS,
    type SeasonWithRelations,
} from '@/lib/pocketbase/services/seasons';
import { logError } from '@/lib/utils/errors';
import type { PhaseType } from '@/lib/pocketbase/types';

import type { AthleteRecord } from '@/lib/pocketbase/services/athletes';
import { Dumbbell, ChevronUp, Diamond, Minus, Settings, Users, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { AthleteTrainingView } from '@/components/training/AthleteTrainingView';
import { AthleteSeasonsList } from '@/components/training/AthleteSeasonsList';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { Skeleton } from '@/components/shared/Skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import styles from './training.module.css';

export default function TrainingPage() {
    const t = useTranslations();
    const locale = useLocale() as 'ru' | 'en' | 'cn';
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAthlete } = useAuth();
    const [seasons, setSeasons] = useState<SeasonWithRelations[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showWizard, setShowWizard] = useState(false);
    const [initialGroupId, setInitialGroupId] = useState<string | null>(null);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
    const [confirmDeleteSeasonId, setConfirmDeleteSeasonId] = useState<string | null>(null);
    const [deletingSeason, setDeletingSeason] = useState(false);
    // Athlete-only: store resolved athleteId from AthleteTrainingView
    const [resolvedAthleteId, setResolvedAthleteId] = useState<string | null>(null);

    useEffect(() => {
        const shouldOpenWizard = searchParams.get('openWizard') === '1';
        if (!shouldOpenWizard) return;
        setInitialGroupId(searchParams.get('groupId'));
        setShowWizard(true);
    }, [searchParams]);


    // Coach specific state
    const [myAthletes, setMyAthletes] = useState<AthleteRecord[]>([]);
    const [filterAthleteId, setFilterAthleteId] = useState<string>('');

    // Load athletes for coach
    useEffect(() => {
        if (!isAthlete) {
            import('@/lib/pocketbase/services/athletes').then(({ listMyAthletes }) => {
                listMyAthletes().then(setMyAthletes).catch(console.error);
            });
        }
    }, [isAthlete]);



    const loadSeasons = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await listSeasons(filterAthleteId || undefined);
            setSeasons(data);
        } catch (err) {
            logError(err, { component: 'TrainingPage', action: 'loadSeasons' });
            setError(t('errors.networkError'));
        } finally {
            setLoading(false);
        }
    }, [t, filterAthleteId]);

    const handleDeleteSeason = async (seasonId: string) => {
        setDeletingSeason(true);
        const prev = seasons;
        setSeasons(s => s.filter(x => x.id !== seasonId)); // optimistic
        try {
            await deleteSeason(seasonId);
        } catch (err) {
            logError(err, { component: 'TrainingPage', action: 'handleDeleteSeason' });
            setSeasons(prev); // rollback
        } finally {
            setDeletingSeason(false);
            setConfirmDeleteSeasonId(null);
        }
    };

    useEffect(() => {
        loadSeasons();
    }, [loadSeasons]);

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(
                locale === 'cn' ? 'zh-CN' : locale === 'ru' ? 'ru-RU' : 'en-US',
                { month: 'short', day: 'numeric', year: 'numeric' }
            );
        } catch {
            /* expected: invalid date string */
            return dateStr;
        }
    };

    // Athletes see their own training view (read-only plan + RPE logging)
    if (isAthlete) {
        return (
            <div className={styles.page}>
                <PageWrapper maxWidth="standard">
                    <PageHeader title={t('training.title')} />
                    <AthleteTrainingView
                        onAthleteIdResolved={(id) => setResolvedAthleteId(id)}
                    />
                    {resolvedAthleteId && (
                        <AthleteSeasonsList athleteId={resolvedAthleteId} />
                    )}
                </PageWrapper>
            </div>
        );
    }

    // If a season is selected, show its detail view
    if (selectedSeasonId) {
        return (
            <SeasonDetailLazy
                seasonId={selectedSeasonId}
                onBack={() => setSelectedSeasonId(null)}
            />
        );
    }

    if (loading) {
        return (
            <div className={styles.page}>
                <PageWrapper maxWidth="standard">
                    <PageHeader title={<Skeleton variant="text" width={200} height={32} style={{ margin: 0 }} />} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-6)' }}>
                        <Skeleton variant="card" height={180} />
                        <Skeleton variant="card" height={180} />
                    </div>
                </PageWrapper>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.page}>
                <PageWrapper maxWidth="standard">
                    <div className={styles.emptyState}>
                        <p className={styles.emptyTitle}>{error}</p>
                        <button className={styles.createBtn} onClick={loadSeasons}>
                            {t('training.retry')}
                        </button>
                    </div>
                </PageWrapper>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <PageWrapper maxWidth="standard">
                <PageHeader
                    title={t('training.title')}
                    actions={
                        <div className={styles.headerActions}>
                            {/* Athlete Filter (Coach only) */}
                            {!isAthlete && myAthletes.length > 0 && (
                                <div className={styles.athleteFilter}>
                                    <Users size={16} className={styles.filterIcon} />
                                    <select
                                        className={styles.athleteSelect}
                                        value={filterAthleteId}
                                        onChange={e => setFilterAthleteId(e.target.value)}
                                    >
                                        <option value="">{t('training.allAthletes')}</option>
                                        {myAthletes.map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}



                            <button
                                className={styles.createBtn}
                                onClick={() => setShowWizard(true)}
                            >
                                <Plus size={18} /> <span className="hidden-mobile">{t('training.newSeason')}</span>
                            </button>

                            <button
                                className={`${styles.createBtn} ${styles.settingsBtn}`}
                                onClick={() => router.push(`/${locale}/settings`)}
                                aria-label={t('nav.settings')}
                            >
                                <Settings size={18} />
                            </button>
                        </div>
                    }
                />



                {
                    seasons.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}><Dumbbell size={48} /></div>
                            <h2 className={styles.emptyTitle}>{t('training.emptyTitle')}</h2>
                            <p className={styles.emptyDescription}>{t('training.emptyDescription')}</p>
                            <button
                                className={styles.createBtn}
                                onClick={() => setShowWizard(true)}
                            >
                                + {t('training.createFirst')}
                            </button>
                        </div>
                    ) : (
                        <div className={styles.seasonsList}>
                            {seasons.map((season) => {
                                const phases = season.expand?.['training_phases(season_id)'] ?? [];
                                const competitions = season.expand?.['competitions(season_id)'] ?? [];
                                const sortedPhases = [...phases].sort((a, b) => a.order - b.order);

                                return (
                                    <div
                                        key={season.id}
                                        className={styles.seasonCard}
                                        style={{ position: 'relative' }}
                                    >
                                        <button
                                            className={styles.seasonCardInner}
                                            onClick={() => setSelectedSeasonId(season.id)}
                                            aria-label={season.name}
                                        >
                                            <h3 className={styles.seasonName}>{season.name}</h3>
                                            <p className={styles.seasonDates}>
                                                {formatDate(season.start_date)} — {formatDate(season.end_date)}
                                            </p>

                                            {sortedPhases.length > 0 && (
                                                <>
                                                    <div className={styles.phaseTimeline}>
                                                        {sortedPhases.map((phase) => (
                                                            <div
                                                                key={phase.id}
                                                                className={styles.phaseBar}
                                                                style={{ backgroundColor: PHASE_COLORS[phase.phase_type as PhaseType] }}
                                                                title={PHASE_LABELS[phase.phase_type as PhaseType][locale]}
                                                            />
                                                        ))}
                                                    </div>
                                                    <div className={styles.phaseBadges}>
                                                        {sortedPhases.map((phase) => (
                                                            <span
                                                                key={phase.id}
                                                                className={styles.phaseBadge}
                                                                style={{ backgroundColor: PHASE_COLORS[phase.phase_type as PhaseType] }}
                                                            >
                                                                {PHASE_LABELS[phase.phase_type as PhaseType][locale]}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </>
                                            )}

                                            {competitions.length > 0 && (
                                                <div className={styles.competitions}>
                                                    {competitions.map((comp) => (
                                                        <span
                                                            key={comp.id}
                                                            className={styles.competitionChip}
                                                            data-priority={comp.priority}
                                                        >
                                                            {comp.priority === 'A' ? <ChevronUp size={14} /> : comp.priority === 'B' ? <Diamond size={12} /> : <Minus size={14} />}
                                                            {comp.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </button>
                                        {/* Delete season button — coach only */}
                                        {!isAthlete && (
                                            <button
                                                type="button"
                                                className={styles.seasonDeleteBtn}
                                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteSeasonId(season.id); }}
                                                aria-label={t('training.deleteSeasonTitle')}
                                                disabled={deletingSeason}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )
                }

                {
                    showWizard && (
                        <SeasonWizardLazy
                            initialGroupId={initialGroupId ?? undefined}
                            onClose={() => setShowWizard(false)}
                            onCreated={() => {
                                setShowWizard(false);
                                loadSeasons();
                            }}
                        />
                    )
                }
            </PageWrapper>

            {/* ConfirmDialog for season deletion */}
            {
                (() => {
                    const season = seasons.find(s => s.id === confirmDeleteSeasonId);
                    return (
                        <ConfirmDialog
                            open={!!confirmDeleteSeasonId}
                            title={t('training.deleteSeasonTitle')}
                            message={season ? t('training.deleteSeasonConfirm', { name: season.name }) : ''}
                            confirmLabel={t('groups.confirmDelete')}
                            cancelLabel={t('groups.confirmCancel')}
                            variant="danger"
                            onConfirm={() => { if (confirmDeleteSeasonId) handleDeleteSeason(confirmDeleteSeasonId); }}
                            onCancel={() => setConfirmDeleteSeasonId(null)}
                        />
                    );
                })()
            }
        </div >
    );
}

// Lazy-load heavy components to keep initial bundle small
import dynamic from 'next/dynamic';

const SeasonWizardLazy = dynamic(
    () => import('@/components/training/SeasonWizard'),
    {
        loading: () => (
            <div className={styles.wizardLoadingOverlay}>
                <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto', padding: 'var(--space-6)' }}>
                    <Skeleton variant="card" height={400} />
                </div>
            </div>
        ),
    }
);

const SeasonDetailLazy = dynamic(
    () => import('@/components/training/SeasonDetail'),
    {
        loading: () => (
            <div className={styles.detailLoadingBox}>
                <PageWrapper maxWidth="standard">
                    <PageHeader title={<Skeleton variant="text" width={300} height={32} style={{ margin: 0 }} />} />
                    <div style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <Skeleton variant="card" height={120} />
                        <Skeleton variant="card" height={200} />
                    </div>
                </PageWrapper>
            </div>
        ),
    }
);
