import { listCompetitions } from './competitions';
import type { Discipline, SeasonType } from '../types';

export interface PRProjection {
    discipline: Discipline;
    season_type: SeasonType;
    result: number;
    date: string;
    competition_id: string;
    competition_name: string;
}

/**
 * Calculates current Personal Records (PRs) from completed competitions.
 * Only competitions with an official_result are considered.
 * For all jump disciplines (high, long, triple), higher result is better.
 */
export async function getPRProjection(athleteId: string): Promise<PRProjection[]> {
    // Fetch all completed competitions for the athlete
    const competitions = await listCompetitions({
        athleteId,
        status: 'completed'
    });

    const prMap = new Map<string, PRProjection>();

    for (const comp of competitions) {
        // Skip if no official result or missing required fields
        if (!comp.official_result || !comp.discipline || !comp.season_type) {
            continue;
        }

        const key = `${comp.discipline}_${comp.season_type}`;
        const existing = prMap.get(key);

        // For jump disciplines, higher is better. Update if this result is better.
        if (!existing || comp.official_result > existing.result) {
            prMap.set(key, {
                discipline: comp.discipline,
                season_type: comp.season_type,
                result: comp.official_result,
                date: comp.date,
                competition_id: comp.id,
                competition_name: comp.name
            });
        } else if (comp.official_result === existing.result) {
            // Tie-breaker: keep the older date (first time achieved)
            if (new Date(comp.date) < new Date(existing.date)) {
                prMap.set(key, {
                    ...existing,
                    date: comp.date,
                    competition_id: comp.id,
                    competition_name: comp.name
                });
            }
        }
    }

    return Array.from(prMap.values());
}

export interface PRTimelinePoint {
    date: string;
    result: number;
    competition_id: string;
    competition_name: string;
    season_type: SeasonType;
    is_pr: boolean;
}

/**
 * Returns all competition results for a given discipline, marking which ones were PRs at the time.
 */
export async function getPRTimeline(athleteId: string, discipline: Discipline): Promise<PRTimelinePoint[]> {
    const competitions = await listCompetitions({
        athleteId,
        discipline,
        status: 'completed'
    });

    // Sort chronologically (oldest first) to calculate PR progression
    const sorted = competitions
        .filter(c => c.official_result && c.season_type)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let currentBestIndoor = 0;
    let currentBestOutdoor = 0;

    return sorted.map(comp => {
        const result = comp.official_result!;
        const isIndoor = comp.season_type === 'indoor';
        let isPR = false;

        if (isIndoor) {
            if (result > currentBestIndoor) {
                isPR = true;
                currentBestIndoor = result;
            }
        } else {
            if (result > currentBestOutdoor) {
                isPR = true;
                currentBestOutdoor = result;
            }
        }

        return {
            date: comp.date,
            result,
            competition_id: comp.id,
            competition_name: comp.name,
            season_type: comp.season_type as SeasonType,
            is_pr: isPR,
        };
    });
}
