/**
 * PocketBase Service: Peaking Validation
 * Validates that PRE_COMP phases are correctly placed before A-priority competitions.
 */

import type { SeasonWithRelations } from './seasons';

// ─── Types ────────────────────────────────────────────────────────

export type PeakingWarningLevel = 'error' | 'warning';

export interface PeakingWarning {
    competitionId: string;
    competitionName: string;
    competitionDate: string;
    level: PeakingWarningLevel;
    /** i18n key, e.g. 'peaking.noPreComp', 'peaking.tooShort' */
    messageKey: string;
    /** Days found (for tooShort) */
    daysFound?: number;
    /** Minimum required days */
    daysRequired?: number;
}

// Minimum days between PRE_COMP end → competition for A-priority meets
const MIN_PEAKING_DAYS_A = 14; // 2 weeks
const MIN_PEAKING_DAYS_BC = 7; // 1 week

// ─── Validator ────────────────────────────────────────────────────

/**
 * Validates peaking structure in a season.
 * Returns list of warnings to display in SeasonDetail.
 */
export function validatePeaking(season: SeasonWithRelations): PeakingWarning[] {
    const warnings: PeakingWarning[] = [];

    const phases = season.expand?.['training_phases(season_id)'] ?? [];
    const competitions = season.expand?.['competitions(season_id)'] ?? [];

    if (competitions.length === 0) return [];

    // Sort phases by order
    const sortedPhases = [...phases].sort((a, b) => a.order - b.order);

    for (const comp of competitions) {
        const compDate = new Date(comp.date).getTime();
        const minDays = comp.priority === 'A' ? MIN_PEAKING_DAYS_A : MIN_PEAKING_DAYS_BC;

        // Find the last PRE_COMP phase that ends before the competition
        const preCompPhases = sortedPhases.filter(
            (p) =>
                p.phase_type === 'PRE_COMP' &&
                p.end_date &&
                new Date(p.end_date).getTime() < compDate
        );

        if (preCompPhases.length === 0) {
            // No PRE_COMP phase before this competition
            warnings.push({
                competitionId: comp.id,
                competitionName: comp.name,
                competitionDate: comp.date,
                level: comp.priority === 'A' ? 'error' : 'warning',
                messageKey: 'peaking.noPreComp',
            });
            continue;
        }

        // Get the closest PRE_COMP phase before competition
        const closestPreComp = preCompPhases.reduce((closest, phase) => {
            const closestEnd = new Date(closest.end_date!).getTime();
            const phaseEnd = new Date(phase.end_date!).getTime();
            return phaseEnd > closestEnd ? phase : closest;
        });

        // Check gap between PRE_COMP end and competition
        const preCompEnd = new Date(closestPreComp.end_date!).getTime();
        const gapDays = Math.floor((compDate - preCompEnd) / 86400000);

        if (gapDays > minDays) {
            // Too much gap — taper ended too early
            warnings.push({
                competitionId: comp.id,
                competitionName: comp.name,
                competitionDate: comp.date,
                level: 'warning',
                messageKey: 'peaking.gapTooLong',
                daysFound: gapDays,
                daysRequired: minDays,
            });
        }

        // Check PRE_COMP phase duration (min 1 week)
        if (closestPreComp.start_date && closestPreComp.end_date) {
            const phaseDuration = Math.floor(
                (new Date(closestPreComp.end_date).getTime() - new Date(closestPreComp.start_date).getTime()) / 86400000
            );
            if (phaseDuration < 7) {
                warnings.push({
                    competitionId: comp.id,
                    competitionName: comp.name,
                    competitionDate: comp.date,
                    level: 'warning',
                    messageKey: 'peaking.phaseTooShort',
                    daysFound: phaseDuration,
                    daysRequired: 7,
                });
            }
        }
    }

    return warnings;
}

/**
 * Returns true if there are any error-level peaking warnings.
 */
export function hasCriticalPeakingIssues(warnings: PeakingWarning[]): boolean {
    return warnings.some((w) => w.level === 'error');
}

/**
 * Get the next upcoming competition for a season.
 * Returns null if no future competitions exist.
 * Used for CompetitionCountdown on AthleteDashboard.
 */
export function getNextCompetition(
    season: SeasonWithRelations
): (import('../types').CompetitionsRecord & import('pocketbase').RecordModel) | null {
    const competitions = season.expand?.['competitions(season_id)'] ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = competitions
        .filter((c) => new Date(c.date) >= today)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return upcoming[0] ?? null;
}
