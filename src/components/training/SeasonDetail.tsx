'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowLeft, Calendar, AlertTriangle, AlertCircle, UserCog, ChevronUp, Diamond, Minus, MapPin, Send, Users, Wind, Pencil } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import {
    getSeason,
    updateSeason,
    getSeasonParticipantInfo,
    PHASE_COLORS,
    PHASE_LABELS,
    type SeasonWithRelations,
    type PhaseRecord,
} from '@/lib/pocketbase/services/seasons';
import { validatePeaking, type PeakingWarning } from '@/lib/pocketbase/services/peaking';
import type { PhaseType, TrainingPhasesRecord } from '@/lib/pocketbase/types';
import type { RecordModel } from 'pocketbase';
import dynamic from 'next/dynamic';
import { usePhaseAssignment } from '@/lib/hooks/usePhaseAssignment';
import { useToast } from '@/lib/hooks/useToast';
import { SeasonParticipants } from './SeasonParticipants';
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
    initialWeek?: number; // for dot-navigation [Phase 6]
}

export default function SeasonDetail({ seasonId, onBack, readinessScore }: Props) {
    const t = useTranslations();
    const locale = useLocale() as 'ru' | 'en' | 'cn';
    const { showToast } = useToast();
    const [season, setSeason] = useState<SeasonWithRelations | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPhase, setSelectedPhase] = useState<SelectedPhase | null>(null);
    const [viewMode, setViewMode] = useState<'week' | 'multi'>('week');
    const [peakingWarnings, setPeakingWarnings] = useState<PeakingWarning[]>([]);
    // [Task 3.1] Inline season edit
    const [isEditingSeason, setIsEditingSeason] = useState(false);
    const [editName, setEditName] = useState('');
    const [editStartDate, setEditStartDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');
    const [savingSeason, setSavingSeason] = useState(false);
    // [BugFix #5] Collect allWeekPlans from each PhaseCard to pass to SeasonParticipants.
    // PhaseCard reports via onPlansLoaded callback — aggregated here keyed by phase.id.
    const [allWeekPlansByPhase, setAllWeekPlansByPhase] = useState<Record<string, { week_number?: number; status: 'published' | 'draft' }[]>>({});
    const handlePhasePlansLoaded = useCallback((phaseId: string, plans: { week_number?: number; status: 'published' | 'draft' }[]) => {
        setAllWeekPlansByPhase(prev => ({ ...prev, [phaseId]: plans }));
    }, []);

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

    /** [Task 3.1] Start inline editing — pre-fill inputs from current season */
    const handleStartEdit = useCallback(() => {
        if (!season) return;
        setEditName(season.name ?? '');
        // stored as ISO date string YYYY-MM-DD (midday UTC) — strip time part
        setEditStartDate((season.start_date ?? '').substring(0, 10));
        setEditEndDate((season.end_date ?? '').substring(0, 10));
        setIsEditingSeason(true);
    }, [season]);

    /** [Task 3.1] Save season name + dates inline */
    const handleSaveSeason = useCallback(async () => {
        if (!season) return;
        if (new Date(editStartDate) >= new Date(editEndDate)) {
            showToast({ message: t('training.invalidDateRange', { defaultMessage: 'End date must be after start date' }), type: 'error' });
            return;
        }
        setSavingSeason(true);
        try {
            const updated = await updateSeason(season.id, {
                name: editName.trim() || season.name,
                // midday UTC trick — avoids timezone-induced date shift
                start_date: `${editStartDate}T12:00:00.000Z`,
                end_date: `${editEndDate}T12:00:00.000Z`,
            });
            setSeason(updated);
            setIsEditingSeason(false);
            showToast({ message: t('training.editSeasonSaved', { defaultMessage: 'Season saved!' }), type: 'success' });
        } catch (err) {
            const { logError } = await import('@/lib/utils/errors');
            logError(err, { component: 'SeasonDetail', action: 'handleSaveSeason' });
            showToast({ message: t('errors.networkError'), type: 'error' });
        } finally {
            setSavingSeason(false);
        }
    }, [season, editName, editStartDate, editEndDate, t, showToast]);

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

    const handleManagePlans = (phase: TrainingPhasesRecord & RecordModel, weekNum?: number) => {
        setViewMode('week'); // Reset to week view by default
        setSelectedPhase({
            id: phase.id,
            phaseType: phase.phase_type,
            name: PHASE_LABELS[phase.phase_type][locale],
            maxWeeks: getPhaseWeeks(phase),
            startDate: phase.start_date,
            initialWeek: weekNum,
        });
    };

    /** Publish a single week's plan from MultiWeekView [Phase 6]
     *  [Phase 7] Now calls loadSeason() so PhaseCard status-map + progress bar refresh immediately.
     */
    const handlePublishWeekInView = useCallback(async (_weekNum: number, planId: string) => {
        const { publishPlan } = await import('@/lib/pocketbase/services/plans');
        await publishPlan(planId);
        await loadSeason(); // refresh PhaseCard after publish from MultiWeekView
    }, [loadSeason]);

    // If MultiWeekView is active
    if (selectedPhase && viewMode === 'multi') {
        return (
            <MultiWeekViewLazy
                phaseId={selectedPhase.id}
                phaseName={selectedPhase.name}
                maxWeeks={selectedPhase.maxWeeks}
                startDate={selectedPhase.startDate} // Use phase start date, not season!
                onSelectWeek={(weekNum: number) => {
                    // Navigate to specific week in WeekConstructor [Phase 6]
                    setSelectedPhase((prev) => prev ? { ...prev, initialWeek: weekNum } : prev);
                    setViewMode('week');
                }}
                onPublishWeek={handlePublishWeekInView} // [Phase 6]
                onBack={() => {
                    setViewMode('week');
                    setSelectedPhase(null);
                    void loadSeason(); // [Track 4.267] Refresh data after edits
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
                initialWeek={selectedPhase.initialWeek} // [Phase 6] open on specific week
                readinessScore={readinessScore}
                onBack={() => {
                    setViewMode('week');
                    setSelectedPhase(null);
                    void loadSeason(); // [Track 4.267] Refresh data after edits
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
                {isEditingSeason ? (
                    <div className={styles.seasonEditRow}>
                        <input
                            className={styles.seasonNameInput}
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            placeholder={season.name}
                            aria-label={t('training.editSeason')}
                            autoFocus
                        />
                        <div className={styles.seasonEditDates}>
                            <input
                                type="date"
                                className={styles.seasonDateInput}
                                value={editStartDate}
                                onChange={e => setEditStartDate(e.target.value)}
                                aria-label={t('training.startDate')}
                            />
                            <span className={styles.seasonDateSep}>—</span>
                            <input
                                type="date"
                                className={styles.seasonDateInput}
                                value={editEndDate}
                                onChange={e => setEditEndDate(e.target.value)}
                                aria-label={t('training.endDate')}
                            />
                        </div>
                        <div className={styles.seasonEditActions}>
                            <button
                                className={styles.seasonSaveBtn}
                                onClick={handleSaveSeason}
                                disabled={savingSeason || !editName.trim()}
                                aria-label={t('training.editSeasonSave')}
                            >
                                {savingSeason ? '...' : t('training.editSeasonSave')}
                            </button>
                            <button
                                className={styles.seasonCancelBtn}
                                onClick={() => setIsEditingSeason(false)}
                                aria-label={t('training.editSeasonCancel')}
                            >
                                {t('training.editSeasonCancel')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className={styles.seasonTitleRow}>
                            <h1 className={styles.title}>{season.name}</h1>
                            <button
                                className={styles.seasonEditBtn}
                                onClick={handleStartEdit}
                                aria-label={t('training.editSeason')}
                                title={t('training.editSeason')}
                            >
                                <Pencil size={16} />
                            </button>
                        </div>
                        <p className={styles.dates}>
                            {formatDate(season.start_date)} — {formatDate(season.end_date)}
                        </p>
                    </>
                )}
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

            {/* Season Participants Panel */}
            <SeasonParticipants
                season={season}
                participantInfo={getSeasonParticipantInfo(season)}
                phases={sortedPhases as PhaseRecord[]}
                allWeekPlansByPhase={allWeekPlansByPhase} /* [BugFix #5] populated by PhaseCard callbacks */
                onParticipantChanged={loadSeason}
                t={(key, params) => t(key, params)}
                locale={locale}
            />

            {/* Phases List */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    {t('training.phases')} ({sortedPhases.length})
                </h2>
                <div className={styles.cardList}>
                    {sortedPhases.map((phase) => (
                        <PhaseCard
                            key={`${phase.id}-${season.updated ?? ''}`}
                            phase={phase}
                            locale={locale}
                            formatDate={formatDate}
                            onManagePlans={(weekNum?: number) => handleManagePlans(phase, weekNum)}
                            weeksCount={getPhaseWeeks(phase)}
                            t={t}
                            onPlansLoaded={handlePhasePlansLoaded}
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
    onPlansLoaded,
}: {
    phase: { phase_type: PhaseType; start_date?: string; end_date?: string; focus?: string } & RecordModel;
    locale: 'ru' | 'en' | 'cn';
    formatDate: (d: string) => string;
    onManagePlans: (weekNum?: number) => void;
    weeksCount: number;
    t: ReturnType<typeof useTranslations>;
    /** [BugFix #5] Called when plans are loaded — lets SeasonDetail pass data to SeasonParticipants */
    onPlansLoaded?: (phaseId: string, plans: { week_number?: number; status: 'published' | 'draft' }[]) => void;
}) {
    // All assignment state/logic extracted to hook (Track 4.265 Phase 4)
    const assign = usePhaseAssignment(phase.id);

    // [BugFix #5] Report plans to parent so SeasonParticipants can show real progress
    useEffect(() => {
        if (!assign.loadingAssignments && onPlansLoaded) {
            onPlansLoaded(phase.id, assign.allWeekPlans);
        }
    }, [assign.loadingAssignments, assign.allWeekPlans, onPlansLoaded, phase.id]);

    // Default Warmup Template selector [Phase 6 / A2 from Phase 5]
    const [showWarmupSelector, setShowWarmupSelector] = useState(false);
    const [warmupTemplates, setWarmupTemplates] = useState<{ id: string; name_ru?: string; name_en?: string; name_cn?: string }[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [warmupApplying, setWarmupApplying] = useState(false);
    const [warmupApplyConfirm, setWarmupApplyConfirm] = useState(false); // [Phase 7: inline confirm replaces window.confirm]
    const [warmupApplyResult, setWarmupApplyResult] = useState<number | null>(null);

    const handleToggleWarmupSelector = async () => {
        if (!showWarmupSelector && warmupTemplates.length === 0) {
            try {
                const { listTemplates } = await import('@/lib/pocketbase/services/templates');
                const tpls = await listTemplates('warmup');
                setWarmupTemplates(tpls);
                if (tpls.length > 0) setSelectedTemplateId(tpls[0].id);
            } catch (err) {
                console.error('[PhaseCard] Failed to load warmup templates:', err);
            }
        }
        setWarmupApplyConfirm(false);
        setWarmupApplyResult(null);
        setShowWarmupSelector((v) => !v);
    };

    /** [Phase 7] Replaces window.confirm — shows inline confirm row first */
    const handleApplyWarmupToPhase = () => {
        if (!selectedTemplateId) return;
        setWarmupApplyConfirm(true);
    };

    /** [Phase 7] Actual apply — called after inline confirm */
    const doApplyWarmupToPhase = async () => {
        setWarmupApplying(true);
        setWarmupApplyConfirm(false);
        try {
            const { stampWarmupToAllDays } = await import('@/lib/pocketbase/services/templates');
            const result = await stampWarmupToAllDays(selectedTemplateId, phase.id);
            setWarmupApplyResult(result.applied);
            setShowWarmupSelector(false);
        } catch (err) {
            console.error('[PhaseCard] stampWarmupToAllDays failed:', err);
        } finally {
            setWarmupApplying(false);
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

            {/* Weekly Status Map — dots navigate to specific week [Phase 6] */}
            {weeksCount > 0 && (
                <div className={styles.weekStatusMap} aria-label={t('training.weeklyStatus')}>
                    {Array.from({ length: weeksCount }, (_, i) => {
                        const weekNum = i + 1;
                        const plan = assign.allWeekPlans.find(p => p.week_number != null && p.week_number === weekNum);
                        const status = plan ? plan.status : 'empty';
                        return (
                            <button
                                key={weekNum}
                                className={`${styles.weekDot} ${styles[`weekDot_${status}`]}`}
                                onClick={() => onManagePlans(weekNum)}
                                title={`${t('training.week', { n: weekNum })}: ${status === 'published' ? t('training.weekStatusPublished') : status === 'draft' ? t('training.weekStatusDraft') : t('training.weekStatusEmpty')}`}
                                aria-label={`${t('training.week', { n: weekNum })}: ${status}`}
                            />
                        );
                    })}
                </div>
            )}

            {/* Phase Progress Bar [Phase 6] */}
            {assign.allWeekPlans.length > 0 && (() => {
                const publishedCount = assign.allWeekPlans.filter(p => p.status === 'published').length;
                const totalPlans = assign.allWeekPlans.length;
                const percent = Math.round((publishedCount / totalPlans) * 100);
                return (
                    <>
                        <div className={styles.phaseProgressBar}>
                            <div
                                className={styles.phaseProgressFill}
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                        <p className={styles.phaseProgressLabel}>
                            {publishedCount}/{totalPlans} {t('training.plansPublished')}
                        </p>
                    </>
                );
            })()}

            <div className={styles.phaseActions}>
                <button className={styles.managePlansBtn} onClick={() => onManagePlans()}>
                    <Calendar size={14} />
                    {t('training.managePlans')} ({weeksCount} {t('training.weeks')})
                </button>

                {/* Default Warmup Template selector [Phase 6] */}
                <button
                    className={styles.applyWarmupBtn}
                    onClick={handleToggleWarmupSelector}
                    title={t('training.applyWarmupToPhase')}
                    aria-expanded={showWarmupSelector}
                >
                    <Wind size={14} />
                    {t('training.applyWarmupToPhase')}
                </button>
                {showWarmupSelector && !warmupApplyConfirm && (
                    <div className={styles.warmupSelectorRow}>
                        {warmupTemplates.length === 0 ? (
                            <span className={styles.warmupNoTemplates}>{t('training.selectWarmupTemplate')}</span>
                        ) : (
                            <>
                                <select
                                    className={styles.warmupSelect}
                                    value={selectedTemplateId}
                                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                                >
                                    {warmupTemplates.map((tpl) => (
                                        <option key={tpl.id} value={tpl.id}>
                                            {locale === 'en' ? (tpl.name_en || tpl.name_ru) :
                                                locale === 'cn' ? (tpl.name_cn || tpl.name_ru) :
                                                    tpl.name_ru}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    className={styles.warmupApplyBtn}
                                    onClick={handleApplyWarmupToPhase}
                                    disabled={warmupApplying || !selectedTemplateId}
                                >
                                    {warmupApplying ? '...' : t('training.applyWarmupToPhaseApply')}
                                </button>
                            </>
                        )}
                    </div>
                )}
                {/* [Phase 7] Inline confirm replaces window.confirm — consistent UX, works on iOS Safari */}
                {warmupApplyConfirm && (
                    <div className={styles.publishConfirm}>
                        <span className={styles.publishConfirmText}>
                            {t('training.warmupApplyConfirm')}
                        </span>
                        <button
                            className={styles.publishConfirmBtn}
                            onClick={doApplyWarmupToPhase}
                            disabled={warmupApplying}
                        >
                            {warmupApplying ? '...' : t('training.confirmYes')}
                        </button>
                        <button
                            className={styles.publishCancelBtn}
                            onClick={() => setWarmupApplyConfirm(false)}
                        >
                            {t('training.confirmNo')}
                        </button>
                    </div>
                )}
                {warmupApplyResult !== null && (
                    <p className={styles.phaseProgressLabel} style={{ color: 'var(--color-success)' }}>
                        {t('training.warmupApplied')} ({warmupApplyResult})
                    </p>
                )}
                {assign.overrideCount > 0 && (
                    <span className={styles.overrideBadge} title={t('training.overrides')}>
                        <UserCog size={11} />
                        {assign.overrideCount} {t('training.overrides')}
                    </span>
                )}
                {assign.draftCount > 0 && !assign.showPublishConfirm && (
                    <button
                        className={styles.publishAllBtn}
                        onClick={() => assign.setShowPublishConfirm(true)}
                        disabled={assign.publishingAll}
                        title={t('training.publishAllDrafts', { count: assign.draftCount })}
                    >
                        <Send size={14} />
                        {t('training.publishAllDrafts', { count: assign.draftCount })}
                    </button>
                )}
                {assign.showPublishConfirm && (
                    <div className={styles.publishConfirm}>
                        <span className={styles.publishConfirmText}>
                            {t('training.publishConfirm', { count: assign.draftCount })}
                        </span>
                        <button
                            className={styles.publishConfirmBtn}
                            onClick={assign.handlePublishAll}
                            disabled={assign.publishingAll}
                        >
                            {assign.publishingAll ? t('training.publishing') : t('training.confirmYes')}
                        </button>
                        <button
                            className={styles.publishCancelBtn}
                            onClick={() => assign.setShowPublishConfirm(false)}
                        >
                            {t('training.confirmNo')}
                        </button>
                    </div>
                )}
            </div>

            {/* Assignment status — read-only (full assign UI moved to SeasonParticipants) */}
            {
                !assign.loadingAssignments && assign.assignments.length > 0 && (
                    <div className={styles.assignmentsList}>
                        {assign.assignments.map(a => (
                            <div key={a.id} className={styles.assignmentBadge}>
                                <Users size={12} aria-hidden="true" />
                                <span>
                                    {(a as RecordModel & { _planWeek?: number })._planWeek
                                        ? `[${t('training.week', { n: (a as RecordModel & { _planWeek?: number })._planWeek ?? 0 })}] `
                                        : ''}
                                    {(a as RecordModel & { group_id?: string }).group_id
                                        ? t('training.assignedToGroup', {
                                            name: (a as RecordModel & { expand?: { group_id?: { name?: string } } }).expand?.group_id?.name ?? 'Unknown',
                                        })
                                        : t('training.assignedToAthlete', {
                                            name: (a as RecordModel & { expand?: { athlete_id?: { name?: string } } }).expand?.athlete_id?.name ?? 'Unknown',
                                        })
                                    }
                                </span>
                            </div>
                        ))}
                    </div>
                )
            }
        </div >
    );
}
