'use client';

/**
 * CoachLogViewer — Plan vs Fact comparison for a training session.
 *
 * Shows planned exercises side-by-side (or stacked on mobile) with actual logged results.
 * Uses compliance.ts getExerciseComparison logic, but is PB-aware (receives data from parent).
 *
 * Status colors:
 *   matched → success (green)
 *   partial  → warning (amber)
 *   missed   → error (red)
 *   added    → accent (blue)
 */

import { useMemo } from 'react';
import { CheckCircle2, AlertCircle, XCircle, PlusCircle, TrendingUp, MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PlanExercisesRecord, ExercisesRecord } from '@/lib/pocketbase/types';
import { getExerciseComparison } from '@/lib/pocketbase/services/compliance';
import type { ExerciseComparisonRow } from '@/lib/pocketbase/services/compliance';
import styles from './CoachLogViewer.module.css';


// ─── Input Types ──────────────────────────────────────────────────

type PlanExForViewer = Partial<PlanExercisesRecord> & {
    id: string;
    expand?: { exercise_id?: Partial<ExercisesRecord> & { id: string; name_en: string } };
};

type LogExForViewer = {
    id: string;
    exercise_id: string;
    sets_data: Array<{ set: number; reps?: number; weight?: number; time?: number; distance?: number }>;
    expand?: { exercise_id?: { id: string; name_en: string } };
    skip_reason?: string;   // Equipment | Pain | Time | CoachDecision | Other (Phase 5)
};

interface Props {
    planExercises: PlanExForViewer[];
    logExercises: LogExForViewer[];
    /** Overall compliance % (pre-calculated by parent) */
    compliance?: number;
    className?: string;
    /** Athlete session notes — training_logs.notes (Phase 5) */
    athleteNotes?: string;
}


// ─── Status Icon ─────────────────────────────────────────────────

function StatusIcon({ status }: { status: ExerciseComparisonRow['status'] }) {
    switch (status) {
        case 'matched':
            return <CheckCircle2 size={14} className={styles.iconMatched} />;
        case 'partial':
            return <AlertCircle size={14} className={styles.iconPartial} />;
        case 'missed':
            return <XCircle size={14} className={styles.iconMissed} />;
        case 'added':
            return <PlusCircle size={14} className={styles.iconAdded} />;
    }
}

// ─── Component ───────────────────────────────────────────────────

export function CoachLogViewer({ planExercises, logExercises, compliance, className, athleteNotes }: Props) {
    const t = useTranslations('coachLog');

    const rows = useMemo(
        () => getExerciseComparison({ planExercises, logExercises }),
        [planExercises, logExercises]
    );

    // Build skip_reason map: exerciseId → reason
    const skipReasonByExerciseId = useMemo(() => {
        const m = new Map<string, string>();
        for (const le of logExercises) {
            if (le.skip_reason) m.set(le.exercise_id, le.skip_reason);
        }
        return m;
    }, [logExercises]);

    if (rows.length === 0) {
        return (
            <div className={`${styles.root} ${className ?? ''}`}>
                <p className={styles.empty}>{t('noData')}</p>
            </div>
        );
    }

    const complianceLevel =
        compliance === undefined ? 'none' :
            compliance >= 80 ? 'high' :
                compliance >= 50 ? 'medium' : 'low';

    return (
        <div className={`${styles.root} ${className ?? ''}`}>
            {/* Header with compliance */}
            {compliance !== undefined && (
                <div className={styles.header}>
                    <span className={styles.headerTitle}>{t('title')}</span>
                    <span className={styles.complianceChip} data-level={complianceLevel}>
                        <TrendingUp size={12} aria-hidden="true" />
                        {compliance}%
                    </span>
                </div>
            )}

            {/* Table (desktop) / Cards (mobile via CSS) */}
            <div className={styles.tableWrap} role="table" aria-label={t('title')}>
                {/* Header row */}
                <div className={styles.thead} role="rowgroup">
                    <div className={styles.headerRow} role="row">
                        <span role="columnheader">{t('exercise')}</span>
                        <span role="columnheader">{t('planned')}</span>
                        <span role="columnheader">{t('actual')}</span>
                        <span role="columnheader">{t('status')}</span>
                    </div>
                </div>

                {/* Data rows */}
                <div role="rowgroup">
                    {rows.map((row) => (
                        <div
                            key={row.exerciseId}
                            className={`${styles.row} ${styles[`row_${row.status}`]}`}
                            role="row"
                            data-status={row.status}
                        >
                            <span className={styles.exerciseName} role="cell" title={row.exerciseName}>
                                {row.exerciseName}
                                {skipReasonByExerciseId.has(row.exerciseId) && (
                                    <span className={styles.skipNote}>
                                        ⚠️ {t('skipLabel')}: {skipReasonByExerciseId.get(row.exerciseId)}
                                    </span>
                                )}
                            </span>
                            <span className={styles.cell} role="cell">
                                {row.plannedSets > 0 ? `${row.plannedSets} ${t('sets')}` : '—'}
                            </span>
                            <span className={styles.cell} role="cell">
                                {row.actualSets > 0 ? `${row.actualSets} ${t('sets')}` : '—'}
                            </span>
                            <span className={styles.statusCell} role="cell">
                                <StatusIcon status={row.status} />
                                <span className={styles.statusLabel}>{t(`status_${row.status}`)}</span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Athlete session notes */}
            {athleteNotes && (
                <div className={styles.athleteNotes}>
                    <MessageSquare size={13} aria-hidden="true" />
                    <p>{athleteNotes}</p>
                </div>
            )}
        </div>
    );
}
