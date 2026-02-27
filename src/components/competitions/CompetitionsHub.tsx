'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { CalendarPlus, Filter, History, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { CompetitionCard } from '@/components/competitions/CompetitionCard';
import { useAuth } from '@/lib/hooks/useAuth';
import {
    createCompetition,
    listCompetitions,
    type CompetitionRecord,
} from '@/lib/pocketbase/services/competitions';
import { listCompetitionParticipantsForCompetitions, upsertCompetitionParticipant } from '@/lib/pocketbase/services/competitionParticipants';
import { listPendingCompetitionProposals } from '@/lib/pocketbase/services/competitionProposals';
import { getSelfAthleteProfile, listMyAthletes, type AthleteRecord } from '@/lib/pocketbase/services/athletes';
import { listSeasons, listSeasonsForAthlete, type SeasonWithRelations } from '@/lib/pocketbase/services/seasons';
import type { CompetitionStatus, Discipline, SeasonType } from '@/lib/pocketbase/types';
import styles from './CompetitionsHub.module.css';

type TabKey = 'upcoming' | 'history';

export type ParticipantSummary = {
    total: number;
    confirmed: number;
    finished: number;
    withdrawn: number;
};

const UPCOMING_STATUSES: CompetitionStatus[] = ['planned', 'confirmed'];
const HISTORY_STATUSES: CompetitionStatus[] = ['completed', 'cancelled'];

const DISCIPLINE_VALUES: Discipline[] = ['high_jump', 'long_jump', 'triple_jump'];
const SEASON_TYPE_VALUES: SeasonType[] = ['indoor', 'outdoor'];
const STATUS_VALUES: CompetitionStatus[] = ['planned', 'confirmed', 'completed', 'cancelled'];

export function CompetitionsHub() {
    const t = useTranslations('competitions');
    const tCommon = useTranslations();
    const searchParams = useSearchParams();
    const { isCoach } = useAuth();

    const initialTab = searchParams.get('tab');
    const initialAction = searchParams.get('action');
    const initialSeasonId = searchParams.get('seasonId') ?? '';
    const highlightedCompetitionId = searchParams.get('competitionId');

    const [activeTab, setActiveTab] = useState<TabKey>(
        initialTab === 'history' ? 'history' : 'upcoming'
    );
    const [seasonFilter, setSeasonFilter] = useState(initialSeasonId);
    const [disciplineFilter, setDisciplineFilter] = useState<Discipline | ''>('');
    const [seasonTypeFilter, setSeasonTypeFilter] = useState<SeasonType | ''>('');
    const [statusFilter, setStatusFilter] = useState<CompetitionStatus | ''>('');
    const [athleteFilter, setAthleteFilter] = useState('');

    const [athleteScopeId, setAthleteScopeId] = useState<string | null>(null);
    const [seasons, setSeasons] = useState<SeasonWithRelations[]>([]);
    const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
    const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
    const [participantsByCompetition, setParticipantsByCompetition] = useState<Record<string, ParticipantSummary>>({});
    const [pendingByCompetition, setPendingByCompetition] = useState<Record<string, number>>({});
    const [pendingInbox, setPendingInbox] = useState<
        Array<{ id: string; competitionId: string; competitionName: string; athleteName: string; proposedAt: string }>
    >([]);
    const [openedCompetitionId, setOpenedCompetitionId] = useState(highlightedCompetitionId ?? '');

    const [showPastForm, setShowPastForm] = useState(
        initialTab === 'history' && initialAction === 'create'
    );
    const [creatingPast, setCreatingPast] = useState(false);
    const [pastError, setPastError] = useState('');
    const [pastName, setPastName] = useState('');
    const [pastDate, setPastDate] = useState('');
    const [pastSeasonId, setPastSeasonId] = useState(initialSeasonId);
    const [pastDiscipline, setPastDiscipline] = useState<Discipline | ''>('');
    const [pastSeasonType, setPastSeasonType] = useState<SeasonType | ''>('');
    const [pastLocation, setPastLocation] = useState('');
    const [pastOfficialResult, setPastOfficialResult] = useState('');
    const [pastAthleteId, setPastAthleteId] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const loadContext = useCallback(async () => {
        try {
            if (isCoach) {
                const [loadedSeasons, loadedAthletes] = await Promise.all([listSeasons(), listMyAthletes()]);
                setSeasons(loadedSeasons);
                setAthletes(loadedAthletes);
                if (!seasonFilter && loadedSeasons.length > 0) {
                    setPastSeasonId(loadedSeasons[0].id);
                }
            } else {
                const self = await getSelfAthleteProfile();
                if (!self) {
                    setAthleteScopeId(null);
                    setSeasons([]);
                    // [Fix] Don't early return — form should still render
                } else {
                    setAthleteScopeId(self.id);
                    const loadedSeasons = await listSeasonsForAthlete(self.id);
                    setSeasons(loadedSeasons);
                    if (!seasonFilter && loadedSeasons.length > 0) {
                        setPastSeasonId(loadedSeasons[0].id);
                    }
                }
            }
        } catch {
            setError(t('errors.loadContext'));
        }
    }, [isCoach, seasonFilter, t]);

    const loadCompetitions = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const loaded = await listCompetitions({
                seasonId: seasonFilter || undefined,
                discipline: disciplineFilter || undefined,
                seasonType: seasonTypeFilter || undefined,
                status: statusFilter || undefined,
                athleteId: isCoach ? athleteFilter || undefined : athleteScopeId || undefined,
            });

            const tabStatuses = activeTab === 'upcoming' ? UPCOMING_STATUSES : HISTORY_STATUSES;
            const filteredByTab = loaded.filter((item) => tabStatuses.includes((item.status || 'planned') as CompetitionStatus));
            const sortedByTab = [...filteredByTab].sort((a, b) => {
                const aTs = new Date(a.date).getTime();
                const bTs = new Date(b.date).getTime();
                return activeTab === 'upcoming' ? aTs - bTs : bTs - aTs;
            });

            setCompetitions(sortedByTab);

            const [participants, pending] = await Promise.all([
                listCompetitionParticipantsForCompetitions(sortedByTab.map((item) => item.id)),
                listPendingCompetitionProposals(),
            ]);

            const participantMap: Record<string, ParticipantSummary> = {};
            for (const participant of participants) {
                const competitionId = participant.competition_id;
                if (!participantMap[competitionId]) {
                    participantMap[competitionId] = {
                        total: 0,
                        confirmed: 0,
                        finished: 0,
                        withdrawn: 0,
                    };
                }
                participantMap[competitionId].total += 1;
                if (participant.status === 'confirmed') participantMap[competitionId].confirmed += 1;
                if (participant.status === 'finished') participantMap[competitionId].finished += 1;
                if (participant.status === 'withdrawn') participantMap[competitionId].withdrawn += 1;
            }
            setParticipantsByCompetition(participantMap);

            const pendingCountMap: Record<string, number> = {};
            const inbox = pending.slice(0, 8).map((proposal) => {
                const competitionName = (proposal.expand?.competition_id as { name?: string } | undefined)?.name ?? t('fallbacks.unknownCompetition');
                const athleteName = (proposal.expand?.athlete_id as { name?: string } | undefined)?.name ?? t('fallbacks.unknownAthlete');
                pendingCountMap[proposal.competition_id] = (pendingCountMap[proposal.competition_id] ?? 0) + 1;
                return {
                    id: proposal.id,
                    competitionId: proposal.competition_id,
                    competitionName,
                    athleteName,
                    proposedAt: proposal.proposed_at ?? proposal.created,
                };
            });
            setPendingByCompetition(pendingCountMap);
            setPendingInbox(inbox);
        } catch {
            setError(t('errors.loadCompetitions'));
            setCompetitions([]);
            setParticipantsByCompetition({});
            setPendingByCompetition({});
            setPendingInbox([]);
        } finally {
            setIsLoading(false);
        }
    }, [
        activeTab,
        athleteFilter,
        athleteScopeId,
        disciplineFilter,
        isCoach,
        seasonFilter,
        seasonTypeFilter,
        statusFilter,
        t,
    ]);

    useEffect(() => {
        void loadContext();
    }, [loadContext]);

    useEffect(() => {
        void loadCompetitions();
    }, [loadCompetitions]);

    const seasonNameById = useMemo(() => {
        const map: Record<string, string> = {};
        for (const season of seasons) map[season.id] = season.name;
        return map;
    }, [seasons]);

    const handleCreatePast = async (event: FormEvent) => {
        event.preventDefault();
        const athleteNeedsResult = !isCoach && !pastOfficialResult;
        const athleteNeedsDiscipline = !isCoach && !pastDiscipline;
        const athleteNeedsSeasonType = !isCoach && !pastSeasonType;
        const coachNeedsAthlete = isCoach && !pastAthleteId;
        // [Track 4.263] season_id is now optional — athlete can add past competition without a season
        if (!pastName || !pastDate || athleteNeedsResult || athleteNeedsDiscipline || athleteNeedsSeasonType || coachNeedsAthlete) {
            setPastError(t('errors.pastRequired'));
            return;
        }
        setPastError('');
        setCreatingPast(true);
        // [Track 4.263] Polymorphic ownership: auto-detect owner_type by available FK
        const resolvedAthleteId = isCoach ? pastAthleteId : athleteScopeId;
        const ownerType: 'season' | 'athlete' = pastSeasonId ? 'season' : 'athlete';
        try {
            const newComp = await createCompetition({
                owner_type: ownerType,
                season_id: pastSeasonId || undefined,
                athlete_id: ownerType === 'athlete' && resolvedAthleteId ? resolvedAthleteId : undefined,
                name: pastName.trim(),
                date: pastDate,
                priority: 'C',
                status: 'completed',
                discipline: pastDiscipline || undefined,
                season_type: pastSeasonType || undefined,
                location: pastLocation.trim() || undefined,
                official_result: pastOfficialResult ? parseFloat(pastOfficialResult) : undefined,
            });

            // Auto-participant: атлет автоматически добавляется как участник
            if (!isCoach && athleteScopeId) {
                await upsertCompetitionParticipant({
                    competition_id: newComp.id,
                    athlete_id: athleteScopeId,
                    status: 'finished',
                });
            }

            setShowPastForm(false);
            setPastName('');
            setPastDate('');
            setPastDiscipline('');
            setPastSeasonType('');
            setPastLocation('');
            setPastOfficialResult('');
            setPastAthleteId('');
            await loadCompetitions();
        } catch (err) {
            console.error('[CompetitionsHub] createPast failed:', err, { ownerType, resolvedAthleteId, pastSeasonId, athleteScopeId });
            setPastError(t('errors.createPastFailed'));
        } finally {
            setCreatingPast(false);
        }
    };

    return (
        <main className={styles.page}>
            <PageWrapper maxWidth="wide">
                <PageHeader title={t('title')} subtitle={t('subtitle')} />

                <div className={styles.controls}>
                    <div className={styles.tabs} role="tablist" aria-label={t('tabs.aria')}>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'upcoming'}
                            className={`${styles.tab} ${activeTab === 'upcoming' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('upcoming')}
                        >
                            {t('tabs.upcoming')}
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'history'}
                            className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('history')}
                        >
                            {t('tabs.history')}
                        </button>
                    </div>

                    {activeTab === 'history' && (
                        <button type="button" className={styles.pastBtn} onClick={() => setShowPastForm((prev) => !prev)}>
                            <CalendarPlus size={16} aria-hidden="true" />
                            {t('actions.addPast')}
                        </button>
                    )}
                </div>

                {showPastForm && (
                    <form className={styles.pastForm} onSubmit={handleCreatePast}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                {t('pastForm.name')}
                                <span className={styles.required}>*</span>
                            </label>
                            <input
                                value={pastName}
                                onChange={(event) => setPastName(event.target.value)}
                                className={styles.input}
                                placeholder={t('pastForm.name')}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                {tCommon('quickPlan.date')}
                                <span className={styles.required}>*</span>
                            </label>
                            <input
                                value={pastDate}
                                onChange={(event) => setPastDate(event.target.value)}
                                className={styles.input}
                                type="date"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                {t('labels.season')}
                            </label>
                            <select value={pastSeasonId} onChange={(event) => setPastSeasonId(event.target.value)} className={styles.select}>
                                <option value="">{t('pastForm.selectSeason')}</option>
                                {seasons.map((season) => (
                                    <option key={season.id} value={season.id}>
                                        {season.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {isCoach && (
                            <div className={styles.formGroup}>
                                <label className={styles.label}>
                                    {t('pastForm.selectAthlete')}
                                    <span className={styles.required}>*</span>
                                </label>
                                <select
                                    value={pastAthleteId}
                                    onChange={(event) => setPastAthleteId(event.target.value)}
                                    className={styles.select}
                                >
                                    <option value="">{t('pastForm.selectAthlete')}</option>
                                    {athletes.map((athlete) => (
                                        <option key={athlete.id} value={athlete.id}>
                                            {athlete.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                {tCommon('athleteForm.discipline')}
                                {!isCoach && <span className={styles.required}>*</span>}
                            </label>
                            <select
                                value={pastDiscipline}
                                onChange={(event) => setPastDiscipline(event.target.value as Discipline | '')}
                                className={styles.select}
                            >
                                <option value="">{t('pastForm.selectDiscipline')}</option>
                                {DISCIPLINE_VALUES.map((discipline) => (
                                    <option key={discipline} value={discipline}>
                                        {tCommon(`dashboard.newAthlete.discipline${discipline === 'high_jump' ? 'HighJump' : discipline === 'long_jump' ? 'LongJump' : 'TripleJump'}`)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                {tCommon('athleteForm.seasonType')}
                                {!isCoach && <span className={styles.required}>*</span>}
                            </label>
                            <select
                                value={pastSeasonType}
                                onChange={(event) => setPastSeasonType(event.target.value as SeasonType | '')}
                                className={styles.select}
                            >
                                <option value="">{t('pastForm.selectSeasonType')}</option>
                                <option value="indoor">{t('pastForm.seasonIndoor')}</option>
                                <option value="outdoor">{t('pastForm.seasonOutdoor')}</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                {t('pastForm.location')}
                            </label>
                            <input
                                value={pastLocation}
                                onChange={(event) => setPastLocation(event.target.value)}
                                className={styles.input}
                                placeholder={t('pastForm.location')}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                {t('pastForm.officialResult')}
                                {!isCoach && <span className={styles.required}>*</span>}
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={pastOfficialResult}
                                onChange={(event) => setPastOfficialResult(event.target.value)}
                                className={styles.input}
                                placeholder={t('pastForm.officialResult')}
                                required={!isCoach}
                            />
                        </div>

                        {pastError && <p className={styles.errorText}>{pastError}</p>}
                        <button type="submit" className={styles.pastSubmit} disabled={creatingPast}>
                            {creatingPast ? t('actions.creating') : t('actions.savePast')}
                        </button>
                    </form>
                )}

                <section className={styles.filters}>
                    <div className={styles.filtersTitle}>
                        <Filter size={16} aria-hidden="true" />
                        {t('filters.title')}
                    </div>
                    <div className={styles.filtersGrid}>
                        <select value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)} className={styles.select}>
                            <option value="">{t('filters.allSeasons')}</option>
                            {seasons.map((season) => (
                                <option key={season.id} value={season.id}>
                                    {season.name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={disciplineFilter}
                            onChange={(event) => setDisciplineFilter(event.target.value as Discipline | '')}
                            className={styles.select}
                        >
                            <option value="">{t('filters.allDisciplines')}</option>
                            {DISCIPLINE_VALUES.map((discipline) => (
                                <option key={discipline} value={discipline}>
                                    {tCommon(`dashboard.newAthlete.discipline${discipline === 'high_jump' ? 'HighJump' : discipline === 'long_jump' ? 'LongJump' : 'TripleJump'}`)}
                                </option>
                            ))}
                        </select>

                        <select
                            value={seasonTypeFilter}
                            onChange={(event) => setSeasonTypeFilter(event.target.value as SeasonType | '')}
                            className={styles.select}
                        >
                            <option value="">{t('filters.allSeasonTypes')}</option>
                            {SEASON_TYPE_VALUES.map((value) => (
                                <option key={value} value={value}>
                                    {value === 'indoor' ? tCommon('athleteForm.seasonIndoor') : tCommon('athleteForm.seasonOutdoor')}
                                </option>
                            ))}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value as CompetitionStatus | '')}
                            className={styles.select}
                        >
                            <option value="">{t('filters.allStatuses')}</option>
                            {STATUS_VALUES.map((value) => (
                                <option key={value} value={value}>
                                    {t(`status.${value}`)}
                                </option>
                            ))}
                        </select>

                        {isCoach && (
                            <select value={athleteFilter} onChange={(event) => setAthleteFilter(event.target.value)} className={styles.select}>
                                <option value="">{t('filters.allAthletes')}</option>
                                {athletes.map((athlete) => (
                                    <option key={athlete.id} value={athlete.id}>
                                        {athlete.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </section>

                {isCoach && (
                    <section className={styles.inbox}>
                        <h2 className={styles.sectionTitle}>{t('inbox.title')}</h2>
                        {pendingInbox.length === 0 ? (
                            <p className={styles.inboxEmpty}>{t('inbox.empty')}</p>
                        ) : (
                            <ul className={styles.inboxList}>
                                {pendingInbox.map((proposal) => (
                                    <li key={proposal.id} className={styles.inboxItem}>
                                        <div>
                                            <span className={styles.inboxMain}>
                                                {proposal.competitionName} · {proposal.athleteName}
                                            </span>
                                            <time className={styles.inboxTime} dateTime={proposal.proposedAt}>
                                                {new Date(proposal.proposedAt).toLocaleString()}
                                            </time>
                                        </div>
                                        <button
                                            type="button"
                                            className={styles.inboxAction}
                                            onClick={() => setOpenedCompetitionId(proposal.competitionId)}
                                        >
                                            {t('inbox.open')}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                )}

                {isLoading ? (
                    <div className={styles.loading}>
                        <Loader2 size={18} className={styles.spinner} />
                        {t('loading')}
                    </div>
                ) : error ? (
                    <p className={styles.errorText}>{error}</p>
                ) : competitions.length === 0 ? (
                    <div className={styles.empty}>
                        <History size={24} aria-hidden="true" />
                        {/* [Track 4.263] New athlete without any seasons — guide them to add first competition */}
                        {activeTab === 'history' && !isCoach && seasons.length === 0
                            ? t('empty.newAthlete')
                            : t('empty')}
                    </div>
                ) : (
                    <section className={styles.registry}>
                        <h2 className={styles.sectionTitle}>
                            {isCoach ? t('registry.coachTitle') : t('registry.athleteTitle')}
                        </h2>
                        <div className={styles.cards}>
                            {competitions.map((competition) => {
                                const participantSummary = participantsByCompetition[competition.id] ?? {
                                    total: 0,
                                    confirmed: 0,
                                    finished: 0,
                                    withdrawn: 0,
                                };
                                const pendingCount = pendingByCompetition[competition.id] ?? 0;
                                const highlighted = highlightedCompetitionId === competition.id;
                                return (
                                    <CompetitionCard
                                        key={competition.id}
                                        competition={competition}
                                        isCoach={isCoach}
                                        seasonName={competition.season_id ? (seasonNameById[competition.season_id] ?? t('fallbacks.unknownSeason')) : (competition.owner_type === 'athlete' || competition.owner_type === 'group' ? t('fallbacks.personalComp') : t('fallbacks.unknownSeason'))}
                                        highlighted={highlighted}
                                        pendingCount={pendingCount}
                                        participantSummary={participantSummary}
                                        athletes={athletes}
                                        athleteScopeId={athleteScopeId}
                                        openByDefault={openedCompetitionId === competition.id || highlighted}
                                        onUpdated={loadCompetitions}
                                    />
                                );
                            })}
                        </div>
                    </section>
                )}

                <div className={styles.trainingHint}>
                    <Link href={`/training${seasonFilter ? `?seasonId=${seasonFilter}` : ''}`}>
                        {t('actions.backToTraining')}
                    </Link>
                </div>
            </PageWrapper>
        </main>
    );
}
