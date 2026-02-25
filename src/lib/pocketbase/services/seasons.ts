/**
 * PocketBase Service: Seasons, Training Phases, Competitions
 * CRUD operations for the training periodization system.
 */

import pb from '../client';
import { Collections } from '../collections';
import type {
    SeasonsRecord,
    TrainingPhasesRecord,
    CompetitionsRecord,
    PhaseType,
} from '../types';
import type { RecordModel } from 'pocketbase';

// ─── Type Helpers ────────────────────────────────────────────────

export type SeasonWithRelations = SeasonsRecord &
    RecordModel & {
        expand?: {
            'training_phases(season_id)'?: (TrainingPhasesRecord & RecordModel)[];
            'competitions(season_id)'?: (CompetitionsRecord & RecordModel)[];
        };
    };

export type PhaseRecord = TrainingPhasesRecord & RecordModel;
export type CompetitionRecord = CompetitionsRecord & RecordModel;

// ─── Seasons ─────────────────────────────────────────────────────

/** List all seasons for the current coach, filtered by athlete if provided */
export async function listSeasons(athleteId?: string): Promise<SeasonWithRelations[]> {
    const user = pb.authStore.record;
    if (!user?.id) throw new Error('Not authenticated');

    let filter = pb.filter('coach_id = {:coachId} && deleted_at = ""', { coachId: user.id });
    // Pass the real athleteId (from athletes collection) to filter by specific athlete.
    // The 'self' special case has been removed — callers must pass the actual athlete record ID.
    if (athleteId) {
        filter += ' && ' + pb.filter('athlete_id = {:athleteId}', { athleteId });
    }

    const records = await pb.collection(Collections.SEASONS).getFullList<SeasonWithRelations>({
        sort: '-start_date',
        expand: 'training_phases(season_id),competitions(season_id)',
        filter,
    });
    return records;
}

/**
 * List seasons visible to an athlete (read-only).
 * Returns seasons where athlete_id matches the given athleteId.
 * Used by AthleteSeasonsList component.
 */
export async function listSeasonsForAthlete(athleteId: string): Promise<SeasonWithRelations[]> {
    return pb.collection(Collections.SEASONS).getFullList<SeasonWithRelations>({
        filter: pb.filter('athlete_id = {:aid} && deleted_at = ""', { aid: athleteId }),
        sort: '-start_date',
        expand: 'training_phases(season_id),competitions(season_id)',
    });
}

/** Get a single season with phases and competitions */
export async function getSeason(id: string): Promise<SeasonWithRelations> {
    return pb.collection(Collections.SEASONS).getOne<SeasonWithRelations>(id, {
        expand: 'training_phases(season_id),competitions(season_id)',
    });
}

/** Create a new season */
export async function createSeason(data: {
    name: string;
    start_date: string;
    end_date: string;
    coach_id: string;
    athlete_id?: string;
    group_id?: string;
}): Promise<SeasonWithRelations> {
    return pb.collection(Collections.SEASONS).create<SeasonWithRelations>(data);
}

/** Update a season */
export async function updateSeason(
    id: string,
    data: Partial<Pick<SeasonsRecord, 'name' | 'start_date' | 'end_date'>>
): Promise<SeasonWithRelations> {
    return pb.collection(Collections.SEASONS).update<SeasonWithRelations>(id, data);
}

/** Soft-delete a season */
export async function deleteSeason(id: string): Promise<void> {
    await pb.collection(Collections.SEASONS).update(id, {
        deleted_at: new Date().toISOString(),
    });
}

// ─── Training Phases ──────────────────────────────────────────────

/** List phases for a season, ordered by `order` */
export async function listPhases(seasonId: string): Promise<PhaseRecord[]> {
    return pb.collection(Collections.TRAINING_PHASES).getFullList<PhaseRecord>({
        filter: pb.filter('season_id = {:seasonId} && deleted_at = ""', { seasonId }),
        sort: 'order',
    });
}

/** Create a training phase */
export async function createPhase(data: {
    season_id: string;
    phase_type: PhaseType;
    order: number;
    start_date?: string;
    end_date?: string;
    focus?: string;
}): Promise<PhaseRecord> {
    return pb.collection(Collections.TRAINING_PHASES).create<PhaseRecord>(data);
}

/** Update a training phase */
export async function updatePhase(
    id: string,
    data: Partial<Pick<TrainingPhasesRecord, 'phase_type' | 'order' | 'start_date' | 'end_date' | 'focus'>>
): Promise<PhaseRecord> {
    return pb.collection(Collections.TRAINING_PHASES).update<PhaseRecord>(id, data);
}

/** Soft-delete a phase */
export async function deletePhase(id: string): Promise<void> {
    await pb.collection(Collections.TRAINING_PHASES).update(id, {
        deleted_at: new Date().toISOString(),
    });
}

/** Batch-create phases for a season (used in wizard) */
export async function createPhasesForSeason(
    seasonId: string,
    phases: Array<{
        phase_type: PhaseType;
        start_date: string;
        end_date: string;
        focus?: string;
    }>
): Promise<PhaseRecord[]> {
    const results: PhaseRecord[] = [];
    for (let i = 0; i < phases.length; i++) {
        const phase = await createPhase({
            season_id: seasonId,
            phase_type: phases[i].phase_type,
            order: i,
            start_date: phases[i].start_date,
            end_date: phases[i].end_date,
            focus: phases[i].focus,
        });
        results.push(phase);
    }
    return results;
}

// ─── Competitions ─────────────────────────────────────────────────

/** List competitions for a season, ordered by date */
export async function listCompetitions(seasonId: string): Promise<CompetitionRecord[]> {
    return pb.collection(Collections.COMPETITIONS).getFullList<CompetitionRecord>({
        filter: pb.filter('season_id = {:seasonId} && deleted_at = ""', { seasonId }),
        sort: 'date',
    });
}

/** Create a competition */
export async function createCompetition(data: {
    season_id: string;
    name: string;
    date: string;
    priority: 'A' | 'B' | 'C';
    location?: string;
    notes?: string;
}): Promise<CompetitionRecord> {
    return pb.collection(Collections.COMPETITIONS).create<CompetitionRecord>(data);
}

/** Update a competition */
export async function updateCompetition(
    id: string,
    data: Partial<Pick<CompetitionsRecord, 'name' | 'date' | 'priority' | 'location' | 'notes'>>
): Promise<CompetitionRecord> {
    return pb.collection(Collections.COMPETITIONS).update<CompetitionRecord>(id, data);
}

/** Soft-delete a competition */
export async function deleteCompetition(id: string): Promise<void> {
    await pb.collection(Collections.COMPETITIONS).update(id, {
        deleted_at: new Date().toISOString(),
    });
}

// ─── Validation Helpers ───────────────────────────────────────────

/** Standard phase sequence for high jump periodization */
export const PHASE_SEQUENCE: PhaseType[] = ['GPP', 'SPP', 'PRE_COMP', 'COMP', 'TRANSITION'];

/** Phase display colors (CSS custom property names) */
export const PHASE_COLORS: Record<PhaseType, string> = {
    GPP: '#3B82F6',        // Blue
    SPP: '#8B5CF6',        // Purple
    PRE_COMP: '#F59E0B',   // Amber
    COMP: '#EF4444',       // Red
    TRANSITION: '#6B7280', // Gray
};

/** Phase short labels */
export const PHASE_LABELS: Record<PhaseType, { ru: string; en: string; cn: string }> = {
    GPP: { ru: 'ОФП', en: 'GPP', cn: '一般体能' },
    SPP: { ru: 'СФП', en: 'SPP', cn: '专项体能' },
    PRE_COMP: { ru: 'Предсор.', en: 'Pre-Comp', cn: '赛前' },
    COMP: { ru: 'Сорев.', en: 'Comp', cn: '比赛' },
    TRANSITION: { ru: 'Переход', en: 'Transition', cn: '过渡' },
};

/** Validate that phases cover the season without gaps */
export function validatePhasesCoverage(
    seasonStart: string,
    seasonEnd: string,
    phases: Array<{ start_date: string; end_date: string; phase_type: PhaseType }>
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (phases.length === 0) {
        errors.push('At least one phase is required');
        return { valid: false, errors };
    }

    // Sort by start_date
    const sorted = [...phases].sort((a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    // Check that first phase starts at season start
    if (sorted[0].start_date !== seasonStart) {
        errors.push('First phase must start at the season start date');
    }

    // Check that last phase ends at season end
    if (sorted[sorted.length - 1].end_date !== seasonEnd) {
        errors.push('Last phase must end at the season end date');
    }

    // Check for gaps and overlaps
    for (let i = 1; i < sorted.length; i++) {
        const prevEnd = new Date(sorted[i - 1].end_date);
        const currStart = new Date(sorted[i].start_date);
        const dayAfterPrev = new Date(prevEnd);
        dayAfterPrev.setDate(dayAfterPrev.getDate() + 1);

        if (currStart.getTime() !== dayAfterPrev.getTime()) {
            if (currStart < prevEnd) {
                errors.push(`Phases ${i} and ${i + 1} overlap`);
            } else {
                errors.push(`Gap between phases ${i} and ${i + 1}`);
            }
        }
    }

    return { valid: errors.length === 0, errors };
}
