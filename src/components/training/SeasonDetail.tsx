'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowLeft, Calendar, AlertTriangle, AlertCircle, Users, UserCog, ChevronUp, Diamond, Minus, MapPin } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import {
    getSeason,
    PHASE_COLORS,
    PHASE_LABELS,
    type SeasonWithRelations,
} from '@/lib/pocketbase/services/seasons';
import { validatePeaking, type PeakingWarning } from '@/lib/pocketbase/services/peaking';
import type { PhaseType, TrainingPhasesRecord } from '@/lib/pocketbase/types';
import type { RecordModel } from 'pocketbase';
import dynamic from 'next/dynamic';
import styles from './SeasonDetail.module.css';

const WeekConstructorLazy = dynamic(() => import('./WeekConstructor'), {
    loading: () => <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>,
});
const MultiWeekViewLazy = dynamic(() => import('./MultiWeekView'), {
    loading: () => <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>,
});

interface Props {
    seasonId: string;
    onBack: () => void;
    readinessScore?: number;
}

interface SelectedPhase {
    id: string;
    phaseType: PhaseType;
    name: string;
    maxWeeks: number;
    startDate?: string;
}

export default function SeasonDetail({ seasonId, onBack, readinessScore }: Props) {
    const t = useTranslations();
    const locale = useLocale() as 'ru' | 'en' | 'cn';
    const [season, setSeason] = useState<SeasonWithRelations | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPhase, setSelectedPhase] = useState<SelectedPhase | null>(null);
    const [viewMode, setViewMode] = useState<'week' | 'multi'>('week');
    const [peakingWarnings, setPeakingWarnings] = useState<PeakingWarning[]>([]);

    const loadSeason = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getSeason(seasonId);
            setSeason(data);
            // Compute peaking warnings
            setPeakingWarnings(validatePeaking(data));
        } catch (err) {
            const { logError } = await import('@/lib/utils/errors');
            logError(err, { component: 'SeasonDetail', action: 'loadSeason' });
            setError(t('errors.networkError'));
        } finally {
            setLoading(false);
        }
    }, [seasonId, t]);

    useEffect(() => {
        loadSeason();
    }, [loadSeason]);

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

    // Calculate calendar weeks spanned by a phase
    const getPhaseWeeks = (phase: TrainingPhasesRecord & RecordModel) => {
        if (!phase.start_date || !phase.end_date) return 4; // default

        const start = new Date(phase.start_date);
        const end = new Date(phase.end_date);

        // Find Monday on or before start
        const startDay = start.getDay();
        const startDistance = startDay === 0 ? -6 : 1 - startDay;
        const startMon = new Date(start);
        startMon.setDate(start.getDate() + startDistance);
        startMon.setHours(0, 0, 0, 0);

        // Find Monday on or before end
        const endDay = end.getDay();
        const endDistance = endDay === 0 ? -6 : 1 - endDay;
        const endMon = new Date(end);
        endMon.setDate(end.getDate() + endDistance);
        endMon.setHours(0, 0, 0, 0);

        const diffWeeks = Math.round((endMon.getTime() - startMon.getTime()) / (7 * 24 * 60 * 60 * 1000));
        return Math.max(1, diffWeeks + 1);
    };

    const handleManagePlans = (phase: TrainingPhasesRecord & RecordModel) => {
        setViewMode('week'); // Reset to week view by default
        setSelectedPhase({
            id: phase.id,
            phaseType: phase.phase_type,
            name: PHASE_LABELS[phase.phase_type][locale],
            maxWeeks: getPhaseWeeks(phase),
            startDate: phase.start_date,
        });
    };

    // If MultiWeekView is active
    if (selectedPhase && viewMode === 'multi') {
        return (
            <MultiWeekViewLazy
                phaseId={selectedPhase.id}
                phaseName={selectedPhase.name}
                maxWeeks={selectedPhase.maxWeeks}
                startDate={selectedPhase.startDate} // Use phase start date, not season!
                onSelectWeek={(_weekNum: number) => {
                    // Note: WeekConstructor maintains its own week state.
                    // We should ideally pass initialWeek, but for now just switching view
                    setViewMode('week');
                }}
                onBack={() => {
                    setViewMode('week');
                    setSelectedPhase(null);
                }}
            />
        );
    }

    // If WeekConstructor is open (default viewMode='week')
    if (selectedPhase) {
        return (
            <WeekConstructorLazy
                phaseId={selectedPhase.id}
                phaseType={selectedPhase.phaseType}
                phaseName={selectedPhase.name}
                maxWeeks={selectedPhase.maxWeeks}
                startDate={selectedPhase.startDate} // Use phase start date
                readinessScore={readinessScore}
                onBack={() => {
                    setViewMode('week');
                    setSelectedPhase(null);
                }}
                onSwitchToMultiView={() => setViewMode('multi')}
            />
        );
    }

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <span className={styles.spinner} />
                    {t('app.loading')}
                </div>
            </div>
        );
    }

    if (error || !season) {
        return (
            <div className={styles.container}>
                <button className={styles.backBtn} onClick={onBack}>
                    <ArrowLeft size={16} /> {t('training.backToSeasons')}
                </button>
                <div className={styles.emptyState}>
                    <p className={styles.errorText}>{error ?? t('errors.unknown')}</p>
                    <button className={styles.retryBtn} onClick={loadSeason}>
                        {t('training.retry')}
                    </button>
                </div>
            </div>
        );
    }

    const phases = season.expand?.['training_phases(season_id)'] ?? [];
    const competitions = season.expand?.['competitions(season_id)'] ?? [];
    const sortedPhases = [...phases].sort((a, b) => a.order - b.order);
    const sortedCompetitions = [...competitions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Gantt calculations
    const totalStart = new Date(season.start_date).getTime();
    const totalEnd = new Date(season.end_date).getTime();
    const totalDuration = totalEnd - totalStart;
    const getPercent = (dateStr: string) => {
        const ts = new Date(dateStr).getTime();
        return Math.max(0, Math.min(100, ((ts - totalStart) / totalDuration) * 100));
    };

    return (
        <div className={styles.container}>
            <button className={styles.backBtn} onClick={onBack}>
                <ArrowLeft size={16} /> {t('training.backToSeasons')}
            </button>

            <div className={styles.header}>
                <h1 className={styles.title}>{season.name}</h1>
                <p className={styles.dates}>
                    {formatDate(season.start_date)} — {formatDate(season.end_date)}
                </p>
            </div>

            {/* Gantt Timeline */}
            {sortedPhases.length > 0 && (
                <div className={styles.ganttContainer}>
                    <div className={styles.ganttTrack}>
                        {sortedPhases.map((phase) => {
                            if (!phase.start_date || !phase.end_date) return null;
                            const left = getPercent(phase.start_date);
                            const right = getPercent(phase.end_date);
                            const width = Math.max(3, right - left);
                            return (
                                <div
                                    key={phase.id}
                                    className={styles.ganttPhase}
                                    style={{
                                        left: `${left}%`,
                                        width: `${width}%`,
                                        backgroundColor: PHASE_COLORS[phase.phase_type],
                                    }}
                                    title={`${PHASE_LABELS[phase.phase_type][locale]}: ${formatDate(phase.start_date)} - ${formatDate(phase.end_date)}`}
                                >
                                    <span className={styles.ganttLabel}>
                                        {PHASE_LABELS[phase.phase_type][locale]}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {sortedCompetitions.length > 0 && (
                        <div className={styles.ganttMarkers}>
                            {sortedCompetitions.map((comp) => {
                                const pos = getPercent(comp.date);
                                return (
                                    <div
                                        key={comp.id}
                                        className={styles.ganttMarker}
                                        style={{ left: `${pos}%` }}
                                        title={`${comp.name} (${comp.priority}) — ${formatDate(comp.date)}`}
                                    >
                                        <span className={styles.competitionChip} data-priority={comp.priority}>
                                            {comp.priority === 'A' ? <ChevronUp size={12} /> : comp.priority === 'B' ? <Diamond size={11} /> : <Minus size={12} />}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Phases List */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    {t('training.phases')} ({sortedPhases.length})
                </h2>
                <div className={styles.cardList}>
                    {sortedPhases.map((phase) => (
                        <PhaseCard
                            key={phase.id}
                            phase={phase}
                            locale={locale}
                            formatDate={formatDate}
                            onManagePlans={() => handleManagePlans(phase)}
                            weeksCount={getPhaseWeeks(phase)}
                            t={t}
                        />
                    ))}
                </div>
            </section>

            {/* Competitions */}
            {sortedCompetitions.length > 0 && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        {t('training.competitions')} ({sortedCompetitions.length})
                    </h2>
                    <div className={styles.cardList}>
                        {sortedCompetitions.map((comp) => (
                            <div key={comp.id} className={styles.card}>
                                <div className={styles.compHeader}>
                                    <span className={`${styles.priorityBadge} ${styles[`priority${comp.priority}`]}`}>
                                        <span className={styles.competitionChip} data-priority={comp.priority}>
                                            {comp.priority === 'A' ? <ChevronUp size={12} /> : comp.priority === 'B' ? <Diamond size={11} /> : <Minus size={12} />}
                                        </span>
                                        {comp.priority}
                                    </span>
                                    <h3 className={styles.cardTitle}>{comp.name}</h3>
                                </div>
                                <p className={styles.cardDates}>{formatDate(comp.date)}</p>
                                {comp.location && (
                                    <p className={styles.cardMeta}><MapPin size={14} aria-hidden="true" /> {comp.location}</p>
                                )}
                                <Link href={`/competitions?seasonId=${season.id}&competitionId=${comp.id}`} className={styles.competitionLink}>
                                    {t('training.competitionsOpen')}
                                </Link>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Peaking Warnings */}
            {peakingWarnings.length > 0 && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle} style={{ color: 'var(--color-warning)' }}>
                        <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                        {t('training.peakingWarnings')} ({peakingWarnings.length})
                    </h2>
                    <div className={styles.cardList}>
                        {peakingWarnings.map((w, i) => (
                            <div
                                key={i}
                                className={styles.card}
                                style={{
                                    borderLeft: `4px solid ${w.level === 'error'
                                        ? 'var(--color-error)'
                                        : 'var(--color-warning)'
                                        }`,
                                    gap: 4,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {w.level === 'error' ? (
                                        <AlertCircle size={16} color="var(--color-error)" />
                                    ) : (
                                        <AlertTriangle size={16} color="var(--color-warning)" />
                                    )}
                                    <strong className={styles.cardTitle}>{w.competitionName}</strong>
                                </div>
                                <p className={styles.cardMeta}>
                                    {t(`training.${w.messageKey}`, {
                                        days: String(w.daysFound ?? ''),
                                        required: String(w.daysRequired ?? ''),
                                    })}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}



// ─── Phase Card ──────────────────────────────────────────────────

function PhaseCard({
    phase,
    locale,
    formatDate,
    onManagePlans,
    weeksCount,
    t,
}: {
    phase: { phase_type: PhaseType; start_date?: string; end_date?: string; focus?: string } & RecordModel;
    locale: 'ru' | 'en' | 'cn';
    formatDate: (d: string) => string;
    onManagePlans: () => void;
    weeksCount: number;
    t: ReturnType<typeof useTranslations>;
}) {
    const [showAssign, setShowAssign] = useState(false);
    const [assignType, setAssignType] = useState<'group' | 'athlete'>('group');
    const [selectedId, setSelectedId] = useState('');
    const [options, setOptions] = useState<{ id: string; name: string }[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [assignOk, setAssignOk] = useState(false);
    const [assignError, setAssignError] = useState<string | null>(null);
    const [overrideCount, setOverrideCount] = useState(0);

    const [publishedPlans, setPublishedPlans] = useState<Array<{ id: string; week_number: number | undefined }>>([]);
    const [allWeekPlans, setAllWeekPlans] = useState<Array<{ week_number: number | undefined; status: 'published' | 'draft' }>>([]);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [assignments, setAssignments] = useState<RecordModel[]>([]);
    const [loadingAssignments, setLoadingAssignments] = useState(false);

    // Initial load of published plans and their assignments
    const loadAssignments = useCallback(async () => {
        setLoadingAssignments(true);
        try {
            const { listPlansForPhase } = await import('@/lib/pocketbase/services/plans');
            const plans = await listPlansForPhase(phase.id);
            const pubs = plans.filter((p) => p.status === 'published').map(p => ({
                id: p.id,
                week_number: p.week_number
            }));

            setPublishedPlans(pubs);

            // For Weekly Status Map: track all plans (published + draft)
            setAllWeekPlans(plans.map(p => ({ week_number: p.week_number, status: p.status as 'published' | 'draft' })));

            if (pubs.length > 0) {
                const { listActivePlanAssignments } = await import('@/lib/pocketbase/services/planAssignments');
                let allAssigns: RecordModel[] = [];
                for (const p of pubs) {
                    const assigns = await listActivePlanAssignments(p.id);
                    const enriched = assigns.map(a => ({ ...a, _planWeek: p.week_number }));
                    allAssigns = [...allAssigns, ...enriched];
                }
                setAssignments(allAssigns);

                // If previously selected plan is no longer valid or nothing selected, select the first one
                setSelectedPlanId(prev => {
                    if (!prev || !pubs.find(p => p.id === prev)) return pubs[0].id;
                    return prev;
                });
            } else {
                setAssignments([]);
                setSelectedPlanId('');
            }
        } catch {
            /* non-critical */
        } finally {
            setLoadingAssignments(false);
        }
    }, [phase.id]);

    useEffect(() => {
        loadAssignments();
    }, [loadAssignments]);

    // Load override count for badge (non-blocking)
    useEffect(() => {
        if (!phase.id) return;
        import('@/lib/pocketbase/services/plans')
            .then(({ countOverridesForPhase }) => countOverridesForPhase(phase.id))
            .then(setOverrideCount)
            .catch(() => { });
    }, [phase.id]);

    // Load groups or athletes when panel opens or type changes
    const loadOptions = async (type: 'group' | 'athlete') => {
        setLoadingOptions(true);
        setOptions([]);
        setSelectedId('');
        try {
            if (type === 'group') {
                const { listMyGroups } = await import('@/lib/pocketbase/services/groups');
                const groups = await listMyGroups();
                setOptions(groups.map((g) => ({ id: g.id, name: g.name })));
            } else {
                const { listMyAthletes } = await import('@/lib/pocketbase/services/athletes');
                const athletes = await listMyAthletes();
                setOptions(athletes.map((a) => ({ id: a.id, name: a.name })));
            }
        } catch {
            /* non-critical: assign options enrichment */
            setOptions([]);
        } finally {
            setLoadingOptions(false);
        }
    };

    const handleToggleAssign = () => {
        const next = !showAssign;
        setShowAssign(next);
        if (next) loadOptions(assignType);
    };

    const handleTypeChange = (type: 'group' | 'athlete') => {
        setAssignType(type);
        setAssignError(null);
        loadOptions(type);
    };

    const handleAssign = async () => {
        if (!selectedId || !selectedPlanId || assigning) return;
        setAssigning(true);
        setAssignError(null);
        try {
            const { listPlansForPhase } = await import('@/lib/pocketbase/services/plans');
            const plans = await listPlansForPhase(phase.id);
            const published = plans.find((p) => p.id === selectedPlanId && p.status === 'published');
            if (!published) {
                setAssignError(t('training.noPublishedPlan'));
                setAssigning(false);
                return;
            }

            const { assignPlanToGroup, assignPlanToAthlete } = await import('@/lib/pocketbase/services/planAssignments');
            if (assignType === 'group') {
                await assignPlanToGroup(published.id, selectedId);
            } else {
                await assignPlanToAthlete(published.id, selectedId);
            }
            setAssignOk(true);
            setTimeout(() => {
                setShowAssign(false);
                setAssignOk(false);
                setSelectedId('');
                setAssignError(null);
                loadAssignments();
            }, 1000);
        } catch (err) {
            setAssignError(err instanceof Error ? err.message : t('errors.assignFailed'));
        } finally {
            setAssigning(false);
        }
    };

    const handleUnassign = async (assignId: string) => {
        try {
            const { unassignPlan } = await import('@/lib/pocketbase/services/planAssignments');
            await unassignPlan(assignId);
            loadAssignments();
        } catch (e) {
            console.error('Failed to unassign', e);
        }
    };

    return (
        <div
            className={styles.card}
            style={{ borderLeft: `4px solid ${PHASE_COLORS[phase.phase_type]}` }}
        >
            <div className={styles.phaseHeader}>
                <span
                    className={styles.phaseBadge}
                    style={{ backgroundColor: PHASE_COLORS[phase.phase_type] }}
                >
                    {PHASE_LABELS[phase.phase_type][locale]}
                </span>
                <span className={styles.phaseType}>{phase.phase_type}</span>
            </div>
            {phase.start_date && phase.end_date && (
                <p className={styles.cardDates}>
                    {formatDate(phase.start_date)} — {formatDate(phase.end_date)}
                </p>
            )}
            {phase.focus && (
                <p className={styles.cardMeta}>{phase.focus}</p>
            )}

            {/* Weekly Status Map */}
            {weeksCount > 0 && (
                <div className={styles.weekStatusMap} aria-label={t('training.weeklyStatus')}>
                    {Array.from({ length: weeksCount }, (_, i) => {
                        const weekNum = i + 1;
                        const plan = allWeekPlans.find(p => p.week_number != null && p.week_number === weekNum);
                        const status = plan ? plan.status : 'empty';
                        return (
                            <button
                                key={weekNum}
                                className={`${styles.weekDot} ${styles[`weekDot_${status}`]}`}
                                onClick={onManagePlans}
                                title={`${t('training.week', { n: weekNum })}: ${status === 'published' ? t('training.weekStatusPublished') : status === 'draft' ? t('training.weekStatusDraft') : t('training.weekStatusEmpty')}`}
                                aria-label={`${t('training.week', { n: weekNum })}: ${status}`}
                            />
                        );
                    })}
                </div>
            )}

            <div className={styles.phaseActions}>
                <button className={styles.managePlansBtn} onClick={onManagePlans}>
                    <Calendar size={14} />
                    {t('training.managePlans')} ({weeksCount} {t('training.weeks')})
                </button>
                {overrideCount > 0 && (
                    <span className={styles.overrideBadge} title={t('training.overrides')}>
                        <UserCog size={11} />
                        {overrideCount} {t('training.overrides')}
                    </span>
                )}
                <button
                    className={styles.assignBtn}
                    onClick={handleToggleAssign}
                    title={t('training.assign')}
                >
                    <Users size={14} />
                    {t('training.assign')}
                </button>
            </div>

            {/* Active Assignments */}
            {!loadingAssignments && assignments.length > 0 && (
                <div className={styles.assignmentsList}>
                    {assignments.map(a => (
                        <div key={a.id} className={styles.assignmentBadge}>
                            <span>
                                {a._planWeek ? `[${t('training.week', { n: a._planWeek })}] ` : ''}
                                {a.group_id
                                    ? t('training.assignedToGroup', { name: a.expand?.group_id?.name || 'Unknown' })
                                    : t('training.assignedToAthlete', { name: a.expand?.athlete_id?.name || 'Unknown' })
                                }
                            </span>
                            <button
                                className={styles.unassignBtn}
                                onClick={() => handleUnassign(a.id)}
                                title={t('training.unassign')}
                                aria-label={t('training.unassign')}
                            >
                                &times;
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showAssign && (
                <div className={styles.assignPanel}>
                    {/* Radio: Group vs Athlete */}
                    <div className={styles.assignTypeRow}>
                        <button
                            className={`${styles.assignTypeBtn} ${assignType === 'group' ? styles.assignTypeBtnActive : ''}`}
                            onClick={() => handleTypeChange('group')}
                        >
                            <Users size={13} />
                            {t('training.assignToGroup')}
                        </button>
                        <button
                            className={`${styles.assignTypeBtn} ${assignType === 'athlete' ? styles.assignTypeBtnActive : ''}`}
                            onClick={() => handleTypeChange('athlete')}
                        >
                            {t('training.assignToAthlete')}
                        </button>
                    </div>

                    <div className={styles.assignRow} style={{ marginBottom: 16 }}>
                        <select
                            className={styles.assignSelect}
                            value={selectedPlanId}
                            onChange={(e) => setSelectedPlanId(e.target.value)}
                            disabled={publishedPlans.length === 0}
                        >
                            {publishedPlans.length === 0 ? (
                                <option value="">{t('training.noPublishedPlan')}</option>
                            ) : (
                                publishedPlans.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {t('training.week', { n: p.week_number ?? '?' })}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    {/* Dropdown for athlete/group */}
                    <div className={styles.assignRow}>
                        <select
                            className={styles.assignSelect}
                            value={selectedId}
                            onChange={(e) => { setSelectedId(e.target.value); setAssignError(null); }}
                            disabled={loadingOptions || options.length === 0}
                        >
                            <option value="">
                                {loadingOptions
                                    ? '...'
                                    : options.length === 0
                                        ? (assignType === 'group' ? t('training.noGroups') : t('training.noAthletes'))
                                        : assignType === 'group'
                                            ? t('training.selectGroup')
                                            : t('training.selectAthlete')
                                }
                            </option>
                            {options.map((opt) => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                        <button
                            className={styles.assignConfirmBtn}
                            onClick={handleAssign}
                            disabled={!selectedId || !selectedPlanId || assigning}
                        >
                            {assignOk ? '✓' : assigning ? '...' : t('training.assign')}
                        </button>
                    </div>
                    {selectedPlanId && selectedId && (
                        <p className={styles.assignPreview}>
                            {t('training.assigningPreview', { plan: t('training.week', { n: publishedPlans.find(p => p.id === selectedPlanId)?.week_number ?? '?' }) })}
                        </p>
                    )}
                    {assignError && (
                        <p className={styles.assignError}>{assignError}</p>
                    )}
                </div>
            )}
        </div>
    );
}
