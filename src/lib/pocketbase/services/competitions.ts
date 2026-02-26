import type { RecordModel } from 'pocketbase';
import pb from '../client';
import { Collections } from '../collections';
import type {
    CompetitionOwnerType,
    CompetitionStatus,
    CompetitionsRecord,
    Discipline,
    SeasonType,
} from '../types';

export type CompetitionRecord = CompetitionsRecord & RecordModel;

export interface CompetitionFilters {
    seasonId?: string;
    athleteId?: string;       // OR-логика: athlete_id=me ∪ competition_participants
    groupId?: string;         // [Track 4.263] filter by group competition
    ownerType?: CompetitionOwnerType; // [Track 4.263] filter by ownership type
    discipline?: Discipline;
    seasonType?: SeasonType;
    status?: CompetitionStatus;
    fromDate?: string;
    toDate?: string;
}

export interface CompetitionMutationInput {
    owner_type: CompetitionOwnerType; // [Track 4.263] required discriminator
    season_id?: string;   // [CHANGED: required→optional — set when owner_type='season']
    athlete_id?: string;  // [NEW — set when owner_type='athlete']
    group_id?: string;    // [NEW — set when owner_type='group']
    name: string;
    date: string;
    priority: 'A' | 'B' | 'C';
    discipline?: Discipline;
    season_type?: SeasonType;
    website?: string;
    status?: CompetitionStatus;
    official_result?: number;
    official_updated_by?: string;
    official_updated_at?: string;
    location?: string;
    notes?: string;
}

export async function listCompetitions(filters: CompetitionFilters = {}): Promise<CompetitionRecord[]> {
    const clauses: string[] = ['deleted_at = ""'];
    const params: Record<string, string> = {};

    if (filters.seasonId) {
        clauses.push('season_id = {:seasonId}');
        params.seasonId = filters.seasonId;
    }
    if (filters.discipline) {
        clauses.push('discipline = {:discipline}');
        params.discipline = filters.discipline;
    }
    if (filters.seasonType) {
        clauses.push('season_type = {:seasonType}');
        params.seasonType = filters.seasonType;
    }
    if (filters.status) {
        clauses.push('status = {:status}');
        params.status = filters.status;
    }
    if (filters.athleteId) {
        // [Track 4.263 Kaizen fix] OR-логика: прямой владелец ∪ участник
        clauses.push('(athlete_id = {:aid} || competition_participants_via_competition_id.athlete_id ?= {:aid})');
        params.aid = filters.athleteId;
    }
    if (filters.groupId) {
        clauses.push('group_id = {:groupId}');
        params.groupId = filters.groupId;
    }
    if (filters.ownerType) {
        clauses.push('owner_type = {:ownerType}');
        params.ownerType = filters.ownerType;
    }
    if (filters.fromDate) {
        clauses.push('date >= {:fromDate}');
        params.fromDate = filters.fromDate;
    }
    if (filters.toDate) {
        clauses.push('date <= {:toDate}');
        params.toDate = filters.toDate;
    }

    return pb.collection(Collections.COMPETITIONS).getFullList<CompetitionRecord>({
        sort: '-date',
        filter: pb.filter(clauses.join(' && '), params),
    });
}

export async function getCompetition(id: string): Promise<CompetitionRecord> {
    return pb.collection(Collections.COMPETITIONS).getOne<CompetitionRecord>(id);
}

export async function createCompetition(input: CompetitionMutationInput): Promise<CompetitionRecord> {
    return pb.collection(Collections.COMPETITIONS).create<CompetitionRecord>(input);
}

export async function updateCompetition(
    id: string,
    input: Partial<CompetitionMutationInput>
): Promise<CompetitionRecord> {
    return pb.collection(Collections.COMPETITIONS).update<CompetitionRecord>(id, input);
}

export async function archiveCompetition(id: string): Promise<void> {
    await pb.collection(Collections.COMPETITIONS).update(id, {
        deleted_at: new Date().toISOString(),
    });
}

