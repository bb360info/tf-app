'use client';

/**
 * usePhaseAssignment — manages all assignment state and logic for a phase.
 * Extracted from PhaseCard (SeasonDetail.tsx) — Phase 4, Track 4.265.
 */

import { useState, useCallback, useEffect } from 'react';
import type { RecordModel } from 'pocketbase';

export interface WeekPlanStatus {
    week_number?: number;
    status: 'published' | 'draft';
}

export interface PublishedPlanRef {
    id: string;
    week_number?: number;
}

export interface UsePhaseAssignmentReturn {
    // assign panel state
    showAssign: boolean;
    assignType: 'group' | 'athlete';
    selectedId: string;
    setSelectedId: (id: string) => void;
    options: { id: string; name: string }[];
    loadingOptions: boolean;
    assigning: boolean;
    assignOk: boolean;
    assignError: string | null;
    // publish all state
    publishingAll: boolean;
    showPublishConfirm: boolean;
    setShowPublishConfirm: (v: boolean) => void;
    draftCount: number;
    // data
    publishedPlans: PublishedPlanRef[];
    allWeekPlans: WeekPlanStatus[];
    assignments: RecordModel[];
    loadingAssignments: boolean;
    selectedPlanId: string;
    setSelectedPlanId: (id: string) => void;
    overrideCount: number;
    // handlers
    handleToggleAssign: () => void;
    handleTypeChange: (type: 'group' | 'athlete') => void;
    handleAssign: (tFn: (key: string, params?: Record<string, string | number>) => string) => Promise<void>;
    handleUnassign: (assignId: string) => Promise<void>;
    handlePublishAll: () => Promise<void>;
    reload: () => Promise<void>;
}

export function usePhaseAssignment(phaseId: string): UsePhaseAssignmentReturn {
    const [showAssign, setShowAssign] = useState(false);
    const [assignType, setAssignType] = useState<'group' | 'athlete'>('group');
    const [selectedId, setSelectedId] = useState('');
    const [options, setOptions] = useState<{ id: string; name: string }[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [assignOk, setAssignOk] = useState(false);
    const [assignError, setAssignError] = useState<string | null>(null);
    const [overrideCount, setOverrideCount] = useState(0);
    const [publishingAll, setPublishingAll] = useState(false);
    const [showPublishConfirm, setShowPublishConfirm] = useState(false);
    const [publishedPlans, setPublishedPlans] = useState<PublishedPlanRef[]>([]);
    const [allWeekPlans, setAllWeekPlans] = useState<WeekPlanStatus[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [assignments, setAssignments] = useState<RecordModel[]>([]);
    const [loadingAssignments, setLoadingAssignments] = useState(false);

    const loadAssignments = useCallback(async () => {
        setLoadingAssignments(true);
        try {
            const { listPlansForPhase } = await import('@/lib/pocketbase/services/plans');
            const plans = await listPlansForPhase(phaseId);
            const pubs = plans
                .filter((p) => p.status === 'published')
                .map((p) => ({ id: p.id, week_number: p.week_number as number | undefined }));

            setPublishedPlans(pubs);
            setAllWeekPlans(
                plans.map((p) => ({
                    week_number: p.week_number as number | undefined,
                    status: p.status as 'published' | 'draft',
                }))
            );

            if (pubs.length > 0) {
                const { listActivePlanAssignments } = await import('@/lib/pocketbase/services/planAssignments');
                let allAssigns: RecordModel[] = [];
                for (const p of pubs) {
                    const assigns = await listActivePlanAssignments(p.id);
                    const enriched = assigns.map((a) => ({ ...a, _planWeek: p.week_number }));
                    allAssigns = [...allAssigns, ...enriched];
                }
                setAssignments(allAssigns);
                setSelectedPlanId((prev) => {
                    if (!prev || !pubs.find((p) => p.id === prev)) return pubs[0].id;
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
    }, [phaseId]);

    useEffect(() => {
        loadAssignments();
    }, [loadAssignments]);

    // Override count badge (non-blocking)
    useEffect(() => {
        if (!phaseId) return;
        import('@/lib/pocketbase/services/plans')
            .then(({ countOverridesForPhase }) => countOverridesForPhase(phaseId))
            .then(setOverrideCount)
            .catch(() => { });
    }, [phaseId]);

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
            setOptions([]);
        } finally {
            setLoadingOptions(false);
        }
    };

    const handleToggleAssign = () => {
        const next = !showAssign;
        setShowAssign(next);
        if (next) void loadOptions(assignType);
    };

    const handleTypeChange = (type: 'group' | 'athlete') => {
        setAssignType(type);
        setAssignError(null);
        void loadOptions(type);
    };

    const handleAssign = async (
        tFn: (key: string, params?: Record<string, string | number>) => string
    ) => {
        if (!selectedId || !selectedPlanId || assigning) return;
        setAssigning(true);
        setAssignError(null);
        try {
            const { listPlansForPhase } = await import('@/lib/pocketbase/services/plans');
            const plans = await listPlansForPhase(phaseId);
            const published = plans.find((p) => p.id === selectedPlanId && p.status === 'published');
            if (!published) {
                setAssignError(tFn('training.noPublishedPlan'));
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
                void loadAssignments();
            }, 1000);
        } catch (err) {
            setAssignError(err instanceof Error ? err.message : tFn('errors.assignFailed'));
        } finally {
            setAssigning(false);
        }
    };

    const handleUnassign = async (assignId: string) => {
        try {
            const { unassignPlan } = await import('@/lib/pocketbase/services/planAssignments');
            await unassignPlan(assignId);
            void loadAssignments();
        } catch (e) {
            console.error('Failed to unassign', e);
        }
    };

    const handlePublishAll = async () => {
        if (publishingAll) return;
        setPublishingAll(true);
        setShowPublishConfirm(false);
        try {
            const { publishAllDrafts } = await import('@/lib/pocketbase/services/plans');
            await publishAllDrafts(phaseId);
            await loadAssignments();
        } catch (err) {
            console.error('publishAllDrafts failed:', err);
        } finally {
            setPublishingAll(false);
        }
    };

    const draftCount = allWeekPlans.filter((p) => p.status === 'draft').length;

    return {
        showAssign,
        assignType,
        selectedId,
        setSelectedId,
        options,
        loadingOptions,
        assigning,
        assignOk,
        assignError,
        publishingAll,
        showPublishConfirm,
        setShowPublishConfirm,
        draftCount,
        publishedPlans,
        allWeekPlans,
        assignments,
        loadingAssignments,
        selectedPlanId,
        setSelectedPlanId,
        overrideCount,
        handleToggleAssign,
        handleTypeChange,
        handleAssign,
        handleUnassign,
        handlePublishAll,
        reload: loadAssignments,
    };
}
