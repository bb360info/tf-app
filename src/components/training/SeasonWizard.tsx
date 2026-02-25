'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/lib/pocketbase/AuthProvider';
import {
    createSeason,
    createPhasesForSeason,
    createCompetition,
    PHASE_SEQUENCE,
    PHASE_COLORS,
    PHASE_LABELS,
    validatePhasesCoverage,
} from '@/lib/pocketbase/services/seasons';
import { listMyAthletes, type AthleteRecord } from '@/lib/pocketbase/services/athletes';
import { listMyGroups, type GroupWithRelations } from '@/lib/pocketbase/services/groups';
import type { PhaseType } from '@/lib/pocketbase/types';
import { toLocalISODate } from '@/lib/utils/dateHelpers';
import { X, ChevronUp, Diamond, Minus } from 'lucide-react';
import styles from './SeasonWizard.module.css';

type WizardStep = 'basics' | 'phases' | 'competitions' | 'review';

interface PhaseData {
    phase_type: PhaseType;
    start_date: string;
    end_date: string;
    focus: string;
}

interface CompetitionData {
    name: string;
    date: string;
    priority: 'A' | 'B' | 'C';
    location: string;
}

interface Props {
    onClose: () => void;
    onCreated: () => void;
    initialGroupId?: string;
}

const STEPS: WizardStep[] = ['basics', 'phases', 'competitions', 'review'];

export default function SeasonWizard({ onClose, onCreated, initialGroupId }: Props) {
    const t = useTranslations();
    const locale = useLocale() as 'ru' | 'en' | 'cn';
    const { user, isLoading: authLoading } = useAuth();

    const [step, setStep] = useState<WizardStep>('basics');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Basics
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
    const [groups, setGroups] = useState<GroupWithRelations[]>([]);
    const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
    const [targetType, setTargetType] = useState<'athlete' | 'group'>(initialGroupId ? 'group' : 'athlete');
    const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId ?? '');

    // Load athletes for coaches
    useEffect(() => {
        if (user?.role === 'coach') {
            listMyAthletes().then(setAthletes).catch(console.error);
            listMyGroups().then(setGroups).catch(console.error);
        }
    }, [user?.role]);

    // Phases
    const [phases, setPhases] = useState<PhaseData[]>([]);

    // Competitions
    const [competitions, setCompetitions] = useState<CompetitionData[]>([]);

    const stepIndex = STEPS.indexOf(step);

    const goNext = () => {
        if (stepIndex < STEPS.length - 1) {
            setStep(STEPS[stepIndex + 1]);
        }
    };

    const goBack = () => {
        if (stepIndex > 0) {
            setStep(STEPS[stepIndex - 1]);
        }
    };

    // Auto-generate default phases based on season dates
    const generateDefaultPhases = useCallback(() => {
        if (!startDate || !endDate) return;

        const start = new Date(startDate);
        const end = new Date(endDate);
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        if (totalDays < 28) return;

        // Distribute proportionally: GPP 30%, SPP 25%, PRE_COMP 15%, COMP 20%, TRANSITION 10%
        const ratios = [0.30, 0.25, 0.15, 0.20, 0.10];
        const generated: PhaseData[] = [];
        let cursor = new Date(start);

        for (let i = 0; i < PHASE_SEQUENCE.length; i++) {
            const days = Math.max(7, Math.round(totalDays * ratios[i]));
            const phaseStart = new Date(cursor);
            const phaseEnd = new Date(cursor);

            if (i === PHASE_SEQUENCE.length - 1) {
                // Last phase ends at season end
                phaseEnd.setTime(end.getTime());
            } else {
                phaseEnd.setDate(phaseEnd.getDate() + days - 1);
                if (phaseEnd > end) phaseEnd.setTime(end.getTime());
            }

            generated.push({
                phase_type: PHASE_SEQUENCE[i],
                start_date: toLocalISODate(phaseStart),
                end_date: toLocalISODate(phaseEnd),
                focus: '',
            });

            cursor = new Date(phaseEnd);
            cursor.setDate(cursor.getDate() + 1);

            if (cursor > end) break;
        }

        setPhases(generated);
    }, [startDate, endDate]);

    const addPhase = () => {
        const lastPhase = phases[phases.length - 1];
        const newStart = lastPhase
            ? (() => {
                const d = new Date(lastPhase.end_date);
                d.setDate(d.getDate() + 1);
                return toLocalISODate(d);
            })()
            : startDate;

        setPhases([...phases, {
            phase_type: 'GPP',
            start_date: newStart || '',
            end_date: endDate || '',
            focus: '',
        }]);
    };

    const removePhase = (index: number) => {
        setPhases(phases.filter((_, i) => i !== index));
    };

    const updatePhase = (index: number, updates: Partial<PhaseData>) => {
        setPhases(phases.map((p, i) => i === index ? { ...p, ...updates } : p));
    };

    const addCompetition = () => {
        setCompetitions([...competitions, {
            name: '',
            date: '',
            priority: 'B',
            location: '',
        }]);
    };

    const removeCompetition = (index: number) => {
        setCompetitions(competitions.filter((_, i) => i !== index));
    };

    const updateCompetition = (index: number, updates: Partial<CompetitionData>) => {
        setCompetitions(competitions.map((c, i) => i === index ? { ...c, ...updates } : c));
    };

    const handleSave = async () => {
        if (authLoading) {
            setError(t('errors.authLoading'));
            return;
        }
        if (!user) {
            console.error('Cannot create season: user is null. Auth state:', { user });
            setError(t('errors.notLoggedIn'));
            return;
        }
        setSaving(true);
        setError(null);

        try {
            // 1. Create season
            const season = await createSeason({
                name,
                start_date: new Date(startDate).toISOString(),
                end_date: new Date(endDate).toISOString(),
                coach_id: user.id,
                athlete_id: targetType === 'athlete' ? (selectedAthleteId || undefined) : undefined,
                group_id: targetType === 'group' ? (selectedGroupId || undefined) : undefined,
            });

            // 2. Create phases
            if (phases.length > 0) {
                await createPhasesForSeason(
                    season.id,
                    phases.map(p => ({
                        phase_type: p.phase_type,
                        start_date: new Date(p.start_date).toISOString(),
                        end_date: new Date(p.end_date).toISOString(),
                        focus: p.focus || undefined,
                    }))
                );
            }

            // 3. Create competitions
            for (const comp of competitions) {
                if (comp.name && comp.date) {
                    await createCompetition({
                        season_id: season.id,
                        name: comp.name,
                        date: new Date(comp.date).toISOString(),
                        priority: comp.priority,
                        location: comp.location || undefined,
                    });
                }
            }

            onCreated();
        } catch (err: unknown) {
            console.error('Failed to create season:', err);
            const pbErr = err as { response?: { data?: { message?: string } }; message?: string };
            const message = pbErr?.response?.data?.message || pbErr?.message || t('errors.unknown');
            setError(t('training.createFailed', { message }));
        } finally {
            setSaving(false);
        }
    };

    // Validation
    // Coach must select an athlete (self-athlete removed in Track 4.12)
    const athleteRequired = user?.role === 'coach' && targetType === 'athlete' && athletes.length > 0;
    const groupRequired = user?.role === 'coach' && targetType === 'group' && groups.length > 0;
    const isBasicsValid = name.trim().length > 0 && startDate && endDate && new Date(startDate) < new Date(endDate)
        && (!athleteRequired || selectedAthleteId !== '')
        && (!groupRequired || selectedGroupId !== '');
    const phaseValidation = phases.length > 0
        ? validatePhasesCoverage(startDate, endDate, phases)
        : { valid: phases.length === 0, errors: [] };

    const canSave = isBasicsValid && phases.length > 0 && phaseValidation.valid;

    return (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={styles.modal}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>{t('training.wizardTitle')}</h2>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close"><X size={16} aria-hidden="true" /></button>
                </div>

                {/* Step indicator */}
                <div className={styles.steps}>
                    {STEPS.map((s, i) => (
                        <div
                            key={s}
                            className={`${styles.stepDot} ${i <= stepIndex ? styles.stepActive : ''} ${i === stepIndex ? styles.stepCurrent : ''}`}
                        >
                            <span className={styles.stepNumber}>{i + 1}</span>
                            <span className={styles.stepLabel}>{t(`training.step_${s}`)}</span>
                        </div>
                    ))}
                </div>

                {/* Body */}
                <div className={styles.body}>
                    {step === 'basics' && (
                        <div className={styles.stepContent}>
                            {user?.role === 'coach' && (
                                <>
                                    <div className={styles.fieldRow}>
                                        <button
                                            type="button"
                                            className={`${styles.targetBtn} ${targetType === 'athlete' ? styles.targetBtnActive : ''}`}
                                            onClick={() => setTargetType('athlete')}
                                        >
                                            {t('training.assignToAthlete')}
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.targetBtn} ${targetType === 'group' ? styles.targetBtnActive : ''}`}
                                            onClick={() => setTargetType('group')}
                                        >
                                            {t('training.assignToGroup')}
                                        </button>
                                    </div>

                                    {targetType === 'athlete' ? (
                                        <div className={styles.field}>
                                            <label className={styles.label}>{t('training.assignToAthlete')}</label>
                                            {athletes.length > 0 ? (
                                                <select
                                                    className={styles.select}
                                                    value={selectedAthleteId}
                                                    onChange={e => setSelectedAthleteId(e.target.value)}
                                                >
                                                    <option value="" disabled>{t('training.selectAthlete')}</option>
                                                    {athletes.map(a => (
                                                        <option key={a.id} value={a.id}>{a.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <p className={styles.hint}>{t('training.noAthletesHint')}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className={styles.field}>
                                            <label className={styles.label}>{t('training.assignToGroup')}</label>
                                            {groups.length > 0 ? (
                                                <select
                                                    className={styles.select}
                                                    value={selectedGroupId}
                                                    onChange={e => setSelectedGroupId(e.target.value)}
                                                >
                                                    <option value="" disabled>{t('training.selectGroup')}</option>
                                                    {groups.map(group => (
                                                        <option key={group.id} value={group.id}>{group.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <p className={styles.hint}>{t('groups.noGroups')}</p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            <div className={styles.field}>
                                <label className={styles.label}>{t('training.seasonName')}</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder={t('training.seasonNamePlaceholder')}
                                    autoFocus
                                />
                            </div>
                            <div className={styles.fieldRow}>
                                <div className={styles.field}>
                                    <label className={styles.label}>{t('training.startDate')}</label>
                                    <input
                                        type="date"
                                        className={styles.input}
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label}>{t('training.endDate')}</label>
                                    <input
                                        type="date"
                                        className={styles.input}
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'phases' && (
                        <div className={styles.stepContent}>
                            {phases.length === 0 && (
                                <div className={styles.phaseEmptyState}>
                                    <p>{t('training.phasesHint')}</p>
                                    <button
                                        className={styles.generateBtn}
                                        onClick={generateDefaultPhases}
                                        disabled={!startDate || !endDate}
                                    >
                                        ✨ {t('training.autoGenerate')}
                                    </button>
                                </div>
                            )}

                            {phases.map((phase, i) => (
                                <div key={i} className={styles.phaseCard} style={{ borderLeftColor: PHASE_COLORS[phase.phase_type] }}>
                                    <div className={styles.phaseHeader}>
                                        <select
                                            className={styles.select}
                                            value={phase.phase_type}
                                            onChange={e => updatePhase(i, { phase_type: e.target.value as PhaseType })}
                                        >
                                            {PHASE_SEQUENCE.map(pt => (
                                                <option key={pt} value={pt}>
                                                    {PHASE_LABELS[pt][locale]} ({pt})
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            className={styles.removeBtn}
                                            onClick={() => removePhase(i)}
                                            aria-label="Remove phase"
                                        >
                                            <X size={14} aria-hidden="true" />
                                        </button>
                                    </div>
                                    <div className={styles.fieldRow}>
                                        <input
                                            type="date"
                                            className={styles.inputSmall}
                                            value={phase.start_date}
                                            onChange={e => updatePhase(i, { start_date: e.target.value })}
                                        />
                                        <span className={styles.dateSep}>→</span>
                                        <input
                                            type="date"
                                            className={styles.inputSmall}
                                            value={phase.end_date}
                                            onChange={e => updatePhase(i, { end_date: e.target.value })}
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        className={styles.inputSmall}
                                        value={phase.focus}
                                        onChange={e => updatePhase(i, { focus: e.target.value })}
                                        placeholder={t('training.focusPlaceholder')}
                                    />
                                </div>
                            ))}

                            <button className={styles.addBtn} onClick={addPhase}>
                                + {t('training.addPhase')}
                            </button>

                            {phaseValidation.errors.length > 0 && (
                                <div className={styles.validationErrors}>
                                    {phaseValidation.errors.map((err, i) => (
                                        <p key={i} className={styles.validationError}>{err}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'competitions' && (
                        <div className={styles.stepContent}>
                            <p className={styles.hint}>{t('training.competitionsHint')}</p>

                            {competitions.map((comp, i) => (
                                <div key={i} className={styles.compCard}>
                                    <div className={styles.compHeader}>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            value={comp.name}
                                            onChange={e => updateCompetition(i, { name: e.target.value })}
                                            placeholder={t('training.compName')}
                                        />
                                        <button
                                            className={styles.removeBtn}
                                            onClick={() => removeCompetition(i)}
                                            aria-label="Remove"
                                        >
                                            <X size={14} aria-hidden="true" />
                                        </button>
                                    </div>
                                    <div className={styles.fieldRow}>
                                        <input
                                            type="date"
                                            className={styles.inputSmall}
                                            value={comp.date}
                                            onChange={e => updateCompetition(i, { date: e.target.value })}
                                        />
                                        <select
                                            className={styles.selectSmall}
                                            value={comp.priority}
                                            onChange={e => updateCompetition(i, { priority: e.target.value as 'A' | 'B' | 'C' })}
                                        >
                                            <option value="A">^ A — {t('training.priorityA')}</option>
                                            <option value="B">♦ B — {t('training.priorityB')}</option>
                                            <option value="C">— C — {t('training.priorityC')}</option>
                                        </select>
                                    </div>
                                    <input
                                        type="text"
                                        className={styles.inputSmall}
                                        value={comp.location}
                                        onChange={e => updateCompetition(i, { location: e.target.value })}
                                        placeholder={t('training.compLocation')}
                                    />
                                </div>
                            ))}

                            <button className={styles.addBtn} onClick={addCompetition}>
                                + {t('training.addCompetition')}
                            </button>
                        </div>
                    )}

                    {step === 'review' && (
                        <div className={styles.stepContent}>
                            <div className={styles.reviewSection}>
                                <h3 className={styles.reviewLabel}>{t('training.seasonName')}</h3>
                                <p className={styles.reviewValue}>{name}</p>
                            </div>
                            <div className={styles.reviewSection}>
                                <h3 className={styles.reviewLabel}>{t('training.dates')}</h3>
                                <p className={styles.reviewValue}>
                                    {startDate} → {endDate}
                                </p>
                            </div>
                            <div className={styles.reviewSection}>
                                <h3 className={styles.reviewLabel}>{t('training.phases')} ({phases.length})</h3>
                                {phases.map((p, i) => (
                                    <div key={i} className={styles.reviewPhase} style={{ borderLeftColor: PHASE_COLORS[p.phase_type] }}>
                                        <strong>{PHASE_LABELS[p.phase_type][locale]}</strong>
                                        <span>{p.start_date} → {p.end_date}</span>
                                        {p.focus && <em>{p.focus}</em>}
                                    </div>
                                ))}
                            </div>
                            {competitions.length > 0 && (
                                <div className={styles.reviewSection}>
                                    <h3 className={styles.reviewLabel}>{t('training.competitions')} ({competitions.length})</h3>
                                    {competitions.map((c, i) => (
                                        <div key={i} className={styles.reviewComp}>
                                            <span className={styles.competitionChip} data-priority={c.priority}>
                                                {c.priority === 'A' ? <ChevronUp size={12} /> : c.priority === 'B' ? <Diamond size={11} /> : <Minus size={12} />}
                                            </span>
                                            {c.name} — {c.date}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Gantt preview */}
                            <div className={styles.reviewSection}>
                                <h3 className={styles.reviewLabel}>{t('training.timeline')}</h3>
                                <GanttPreview
                                    phases={phases}
                                    competitions={competitions}
                                    startDate={startDate}
                                    endDate={endDate}
                                    locale={locale}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    {error && <p className={styles.error}>{error}</p>}

                    <div className={styles.footerActions}>
                        {stepIndex > 0 && (
                            <button className={styles.backBtn} onClick={goBack} disabled={saving}>
                                ← {t('training.back')}
                            </button>
                        )}
                        <div className={styles.spacer} />
                        {stepIndex < STEPS.length - 1 ? (
                            <button
                                className={styles.nextBtn}
                                onClick={goNext}
                                disabled={step === 'basics' && !isBasicsValid}
                            >
                                {t('training.next')} →
                            </button>
                        ) : (
                            <button
                                className={styles.saveBtn}
                                onClick={handleSave}
                                disabled={!canSave || saving}
                            >
                                {saving ? t('app.loading') : t('training.createSeason')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Inline Gantt Preview ─────────────────────────────────────────

function GanttPreview({
    phases,
    competitions,
    startDate,
    endDate,
    locale,
}: {
    phases: PhaseData[];
    competitions: CompetitionData[];
    startDate: string;
    endDate: string;
    locale: 'ru' | 'en' | 'cn';
}) {
    const totalStart = new Date(startDate).getTime();
    const totalEnd = new Date(endDate).getTime();
    const totalDuration = totalEnd - totalStart;

    if (totalDuration <= 0) return null;

    const getPercent = (dateStr: string) => {
        const t = new Date(dateStr).getTime();
        return Math.max(0, Math.min(100, ((t - totalStart) / totalDuration) * 100));
    };

    return (
        <div className={styles.gantt}>
            <div className={styles.ganttTrack}>
                {phases.map((p, i) => {
                    const left = getPercent(p.start_date);
                    const right = getPercent(p.end_date);
                    const width = Math.max(2, right - left);
                    return (
                        <div
                            key={i}
                            className={styles.ganttPhase}
                            style={{
                                left: `${left}%`,
                                width: `${width}%`,
                                backgroundColor: PHASE_COLORS[p.phase_type],
                            }}
                            title={PHASE_LABELS[p.phase_type][locale]}
                        >
                            <span className={styles.ganttLabel}>
                                {PHASE_LABELS[p.phase_type][locale]}
                            </span>
                        </div>
                    );
                })}
            </div>
            {competitions.filter(c => c.date).map((c, i) => {
                const pos = getPercent(c.date);
                return (
                    <div
                        key={i}
                        className={styles.ganttMarker}
                        style={{ left: `${pos}%` }}
                        title={`${c.name} (${c.priority})`}
                    >
                        <span className={styles.competitionChip} data-priority={c.priority}>
                            {c.priority === 'A' ? <ChevronUp size={12} /> : c.priority === 'B' ? <Diamond size={11} /> : <Minus size={12} />}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
