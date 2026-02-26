import type { RecordModel } from 'pocketbase';
import pb from '../client';
import { Collections } from '../collections';
import type { CompetitionParticipantsRecord, ParticipantStatus } from '../types';

export type CompetitionParticipantRecord = CompetitionParticipantsRecord & RecordModel;

export interface CompetitionParticipantInput {
    competition_id: string;
    athlete_id: string;
    status: ParticipantStatus;
    lane_or_order?: string;
    bib_number?: string;
    result_note?: string;
}
export async function listCompetitionParticipants(
    competitionId: string
): Promise<CompetitionParticipantRecord[]> {
    return pb.collection(Collections.COMPETITION_PARTICIPANTS).getFullList<CompetitionParticipantRecord>({
        filter: pb.filter('competition_id = {:competitionId} && deleted_at = ""', { competitionId }),
        expand: 'athlete_id',
    });
}

export async function listCompetitionParticipantsForCompetitions(
    competitionIds: string[]
): Promise<CompetitionParticipantRecord[]> {
    if (competitionIds.length === 0) return [];

    const params: Record<string, string> = {};
    const idClauses = competitionIds.map((competitionId, index) => {
        const key = `competitionId${index}`;
        params[key] = competitionId;
        return `competition_id = {:${key}}`;
    });

    return pb.collection(Collections.COMPETITION_PARTICIPANTS).getFullList<CompetitionParticipantRecord>({
        filter: pb.filter(`deleted_at = "" && (${idClauses.join(' || ')})`, params),
        expand: 'athlete_id',
    });
}

export async function upsertCompetitionParticipant(
    input: CompetitionParticipantInput
): Promise<CompetitionParticipantRecord> {
    const existing = await pb
        .collection(Collections.COMPETITION_PARTICIPANTS)
        .getFirstListItem<CompetitionParticipantRecord>(
            pb.filter('competition_id = {:competitionId} && athlete_id = {:athleteId} && deleted_at = ""', {
                competitionId: input.competition_id,
                athleteId: input.athlete_id,
            })
        )
        .catch(() => null);

    if (!existing) {
        return pb.collection(Collections.COMPETITION_PARTICIPANTS).create<CompetitionParticipantRecord>(input);
    }

    return pb.collection(Collections.COMPETITION_PARTICIPANTS).update<CompetitionParticipantRecord>(existing.id, {
        status: input.status,
        lane_or_order: input.lane_or_order,
        bib_number: input.bib_number,
        result_note: input.result_note,
    });
}

export async function removeCompetitionParticipant(id: string): Promise<void> {
    await pb.collection(Collections.COMPETITION_PARTICIPANTS).update(id, {
        deleted_at: new Date().toISOString(),
    });
}
