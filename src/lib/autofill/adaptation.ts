/**
 * Auto-Adaptation Service
 * Adjusts plan exercise sets based on athlete readiness score.
 *
 * Rule: if auto_adaptation_enabled && readinessScore < 60 → reduce sets by 20-30%
 */

import type { PlanExerciseWithExpand } from '@/lib/pocketbase/services/plans';

// ─── Types ────────────────────────────────────────────────────────

export interface AdaptationResult {
    adapted: boolean;
    factor: number; // 1.0 = no change, 0.8 = -20%, 0.7 = -30%
    exercises: PlanExerciseWithExpand[];
}

// ─── Constants ────────────────────────────────────────────────────

const THRESHOLD_MODERATE = 60; // below this → apply adaptation
const THRESHOLD_LOW = 40;      // below this → stronger reduction
const FACTOR_MODERATE = 0.8;   // -20%
const FACTOR_LOW = 0.7;        // -30%

// ─── Adaptation Logic ─────────────────────────────────────────────

/**
 * Apply auto-adaptation to plan exercises based on readiness score.
 *
 * @param exercises    - List of plan exercises for the week
 * @param readiness    - Readiness score 0-100 (from daily check-in)
 * @param enabled      - Whether auto-adaptation is enabled in coach preferences
 * @returns AdaptationResult with (possibly) adjusted exercises and metadata
 */
export function applyAdaptation(
    exercises: PlanExerciseWithExpand[],
    readiness: number,
    enabled: boolean
): AdaptationResult {
    // Bail early if feature is disabled or readiness is sufficient
    if (!enabled || readiness >= THRESHOLD_MODERATE) {
        return { adapted: false, factor: 1.0, exercises };
    }

    const factor = readiness < THRESHOLD_LOW ? FACTOR_LOW : FACTOR_MODERATE;

    const adaptedExercises = exercises.map((ex) => ({
        ...ex,
        // Reduce sets, minimum 1
        sets: ex.sets ? Math.max(1, Math.round(ex.sets * factor)) : ex.sets,
    }));

    return {
        adapted: true,
        factor,
        exercises: adaptedExercises,
    };
}

/**
 * Human-readable description of the adaptation factor.
 * Used for badge tooltip.
 */
export function adaptationLabel(factor: number): string {
    if (factor >= 1.0) return '';
    const pct = Math.round((1 - factor) * 100);
    return `-${pct}%`;
}

// ─── Pre-Competition Volume Reduction ─────────────────────────────

const PRECOMP_DAYS = 2;         // days before competition to reduce
const PRECOMP_FACTOR = 0.6;     // -40% sets

export interface PreCompReductionResult {
    reduced: boolean;
    competitionName?: string;
    competitionDate?: string;
    exercises: PlanExerciseWithExpand[];
}

interface CompetitionLike {
    name: string;
    date: string;
}

/**
 * Auto-reduce volume if a competition is within `PRECOMP_DAYS` of a training day.
 *
 * @param exercises      - Plan exercises for a specific day
 * @param competitions   - Competitions in the current season
 * @param trainingDate   - ISO date string of the training day (e.g. "2026-03-15")
 */
export function applyPreCompReduction(
    exercises: PlanExerciseWithExpand[],
    competitions: CompetitionLike[],
    trainingDate: string
): PreCompReductionResult {
    if (competitions.length === 0 || exercises.length === 0) {
        return { reduced: false, exercises };
    }

    const trainingMs = new Date(trainingDate).getTime();

    // Find closest upcoming competition within PRECOMP_DAYS
    const upcoming = competitions
        .map((c) => ({
            ...c,
            ms: new Date(c.date).getTime(),
        }))
        .filter((c) => {
            const daysUntil = (c.ms - trainingMs) / 86_400_000;
            return daysUntil >= 0 && daysUntil <= PRECOMP_DAYS;
        })
        .sort((a, b) => a.ms - b.ms);

    if (upcoming.length === 0) {
        return { reduced: false, exercises };
    }

    const comp = upcoming[0];

    const reduced = exercises.map((ex) => ({
        ...ex,
        sets: ex.sets ? Math.max(1, Math.round(ex.sets * PRECOMP_FACTOR)) : ex.sets,
    }));

    return {
        reduced: true,
        competitionName: comp.name,
        competitionDate: comp.date,
        exercises: reduced,
    };
}
