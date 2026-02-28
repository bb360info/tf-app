'use client';

/**
 * SeasonParticipants — Season-level assignment panel.
 * Shows who the season is assigned to (athlete or group),
 * their phase progress, and allows changing the participant.
 * Track 4.265 Phase 4.
 */

import { useState, useEffect } from 'react';
import { Users, UserCog, ChevronDown } from 'lucide-react';
import type { SeasonWithRelations, SeasonParticipantInfo } from '@/lib/pocketbase/services/seasons';
import type { PhaseRecord } from '@/lib/pocketbase/services/seasons';
import { PHASE_LABELS } from '@/lib/pocketbase/services/seasons';
import styles from './SeasonParticipants.module.css';

// ─── Types ─────────────────────────────────────────────────────────

interface WeekPlanStatus {
    week_number?: number;
    status: 'published' | 'draft';
}

interface SeasonParticipantsProps {
    season: SeasonWithRelations;
    participantInfo: SeasonParticipantInfo;
    phases: PhaseRecord[];
    allWeekPlansByPhase: Record<string, WeekPlanStatus[]>;
    onParticipantChanged: () => void;
    t: (key: string, params?: Record<string, string | number>) => string;
    locale: 'ru' | 'en' | 'cn';
}

// ─── Sub-components ────────────────────────────────────────────────

function AvatarInitials({ name }: { name: string }) {
    const initials = name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');
    return (
        <div className={styles.avatar} aria-hidden="true">
            {initials || '?'}
        </div>
    );
}

function AthleteParticipantView({ name }: { name: string }) {
    return (
        <div className={styles.participantInfo}>
            <AvatarInitials name={name} />
            <span className={styles.participantName}>{name}</span>
        </div>
    );
}

function GroupParticipantView({ name, memberCount, t }: { name: string; memberCount: number; t: (key: string, params?: Record<string, string | number>) => string }) {
    return (
        <div className={styles.participantInfo}>
            <div className={styles.groupIcon} aria-hidden="true">
                <Users size={18} />
            </div>
            <div>
                <div className={styles.participantName}>{name}</div>
                {memberCount > 0 && (
                    <div className={styles.memberCount}>{t('training.memberCount', { n: memberCount })}</div>
                )}
            </div>
        </div>
    );
}

function NoParticipantView({
    onAssign,
    t,
}: {
    onAssign: () => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}) {
    return (
        <div className={styles.emptyState}>
            <Users size={24} className={styles.emptyIcon} aria-hidden="true" />
            <p className={styles.emptyText}>{t('training.noParticipants')}</p>
            <button className={styles.assignBtn} onClick={onAssign}>
                {t('training.assignParticipant')}
            </button>
        </div>
    );
}

// ─── Change Participant Form ──────────────────────────────────────

function ChangeParticipantForm({
    currentType,
    onSave,
    onCancel,
    t,
}: {
    currentType: 'athlete' | 'group' | 'none';
    onSave: (type: 'athlete' | 'group', id: string) => Promise<void>;
    onCancel: () => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}) {
    const [type, setType] = useState<'athlete' | 'group'>(
        currentType === 'none' ? 'group' : currentType
    );
    const [options, setOptions] = useState<{ id: string; name: string }[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadOptions = async (targetType: 'athlete' | 'group') => {
        setLoading(true);
        setOptions([]);
        setSelectedId('');
        try {
            if (targetType === 'group') {
                const { listMyGroups } = await import('@/lib/pocketbase/services/groups');
                const groups = await listMyGroups();
                setOptions(groups.map((g) => ({ id: g.id, name: g.name })));
            } else {
                const { listMyAthletes } = await import('@/lib/pocketbase/services/athletes');
                const athletes = await listMyAthletes();
                setOptions(athletes.map((a) => ({ id: a.id, name: a.name })));
            }
        } catch {
            setOptions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleTypeChange = (newType: 'athlete' | 'group') => {
        setType(newType);
        setError(null);
        void loadOptions(newType);
    };

    // Load initial options on mount
    useEffect(() => { void loadOptions(type); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSave = async () => {
        if (!selectedId || saving) return;
        setSaving(true);
        setError(null);
        try {
            await onSave(type, selectedId);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('errors.unknown'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.changeForm}>
            {/* Type toggle */}
            <div className={styles.typeToggle} role="group">
                <button
                    className={`${styles.typeBtn} ${type === 'group' ? styles.typeBtnActive : ''}`}
                    onClick={() => handleTypeChange('group')}
                    type="button"
                >
                    <Users size={13} aria-hidden="true" />
                    {t('training.assignToGroup')}
                </button>
                <button
                    className={`${styles.typeBtn} ${type === 'athlete' ? styles.typeBtnActive : ''}`}
                    onClick={() => handleTypeChange('athlete')}
                    type="button"
                >
                    {t('training.assignToAthlete')}
                </button>
            </div>

            {/* Select */}
            <select
                className={styles.select}
                value={selectedId}
                onChange={(e) => { setSelectedId(e.target.value); setError(null); }}
                disabled={loading || options.length === 0}
                aria-label={type === 'group' ? t('training.selectGroup') : t('training.selectAthlete')}
            >
                <option value="">
                    {loading ? '...' : options.length === 0
                        ? (type === 'group' ? t('training.noGroups') : t('training.noAthletes'))
                        : (type === 'group' ? t('training.selectGroup') : t('training.selectAthlete'))
                    }
                </option>
                {options.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                ))}
            </select>

            {error && <p className={styles.errorText}>{error}</p>}

            {/* Actions */}
            <div className={styles.formActions}>
                <button
                    className={styles.saveBtn}
                    onClick={() => void handleSave()}
                    disabled={!selectedId || saving}
                    type="button"
                >
                    {saving ? '...' : t('common.save')}
                </button>
                <button
                    className={styles.cancelBtn}
                    onClick={onCancel}
                    type="button"
                >
                    {t('common.cancel')}
                </button>
            </div>
        </div>
    );
}

// ─── Phase Progress ────────────────────────────────────────────────

function PhaseProgress({
    phases,
    allWeekPlansByPhase,
    locale,
}: {
    phases: PhaseRecord[];
    allWeekPlansByPhase: Record<string, WeekPlanStatus[]>;
    locale: 'ru' | 'en' | 'cn';
}) {
    if (phases.length === 0) return null;
    return (
        <div className={styles.phaseProgress}>
            {phases.map((phase) => {
                const plans = allWeekPlansByPhase[phase.id] ?? [];
                const total = plans.length;
                const published = plans.filter((p) => p.status === 'published').length;
                const pct = total > 0 ? Math.round((published / total) * 100) : 0;
                return (
                    <div key={phase.id} className={styles.phaseProgressRow}>
                        <span className={styles.phaseLabel} title={phase.phase_type}>
                            {PHASE_LABELS[phase.phase_type][locale]}
                        </span>
                        <div className={styles.progressBar} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={styles.progressText}>{published}/{total}</span>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────

export function SeasonParticipants({
    season,
    participantInfo,
    phases,
    allWeekPlansByPhase,
    onParticipantChanged,
    t,
    locale,
}: SeasonParticipantsProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [showChangeForm, setShowChangeForm] = useState(false);
    const [saving, setSaving] = useState(false);

    const hasParticipant = participantInfo.type !== 'none';

    const handleSave = async (type: 'athlete' | 'group', id: string) => {
        setSaving(true);
        try {
            const { updateSeasonParticipant, clearSeasonAssignments } = await import('@/lib/pocketbase/services/seasons');
            // [BugFix #1] Deactivate stale plan_assignments BEFORE changing participant.
            // Without this, old assignments remain active for the previous athlete/group,
            // causing new athlete to see no plans and old athlete to still see plans.
            await clearSeasonAssignments(season.id);
            if (type === 'group') {
                await updateSeasonParticipant(season.id, { group_id: id, athlete_id: null });
            } else {
                await updateSeasonParticipant(season.id, { athlete_id: id, group_id: null });
            }
            setShowChangeForm(false);
            onParticipantChanged();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.container}>
            {/* Header — collapsible */}
            <button
                className={styles.header}
                onClick={() => setIsOpen((v) => !v)}
                aria-expanded={isOpen}
                type="button"
            >
                <Users size={15} aria-hidden="true" />
                <span className={styles.headerTitle}>{t('training.participants')}</span>
                {participantInfo.type === 'group' && (
                    <span className={styles.memberBadge}>
                        {participantInfo.memberCount > 0 && `${participantInfo.memberCount}`}
                    </span>
                )}
                <ChevronDown
                    size={14}
                    className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                    aria-hidden="true"
                />
            </button>

            {/* Body */}
            {isOpen && (
                <div className={styles.body}>
                    {/* Participant view */}
                    {participantInfo.type === 'athlete' && (
                        <AthleteParticipantView name={participantInfo.name} />
                    )}
                    {participantInfo.type === 'group' && (
                        <GroupParticipantView
                            name={participantInfo.name}
                            memberCount={participantInfo.memberCount}
                            t={t}
                        />
                    )}
                    {participantInfo.type === 'none' && !showChangeForm && (
                        <NoParticipantView onAssign={() => setShowChangeForm(true)} t={t} />
                    )}

                    {/* Phase progress bars */}
                    {hasParticipant && (
                        <PhaseProgress
                            phases={phases}
                            allWeekPlansByPhase={allWeekPlansByPhase}
                            locale={locale}
                        />
                    )}

                    {/* Change / assign form */}
                    {showChangeForm && (
                        <ChangeParticipantForm
                            currentType={participantInfo.type}
                            onSave={handleSave}
                            onCancel={() => setShowChangeForm(false)}
                            t={t}
                        />
                    )}

                    {/* Change button (only when participant exists and form is hidden) */}
                    {hasParticipant && !showChangeForm && (
                        <button
                            className={styles.changeBtn}
                            onClick={() => setShowChangeForm(true)}
                            disabled={saving}
                            type="button"
                        >
                            <UserCog size={13} aria-hidden="true" />
                            {t('training.changeParticipant')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
