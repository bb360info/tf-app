import type { RecordModel } from 'pocketbase';
import pb from '../client';
import { Collections } from '../collections';
import type {
    CompetitionProposalsRecord,
    ProposalKind,
    ProposalStatus,
} from '../types';

export type CompetitionProposalRecord = CompetitionProposalsRecord & RecordModel;

export interface CreateCompetitionProposalInput {
    competition_id: string;
    athlete_id: string;
    kind: ProposalKind;
    payload: Record<string, unknown>;
    athlete_comment?: string;
}

export interface ReviewCompetitionProposalInput {
    status: Extract<ProposalStatus, 'approved' | 'rejected' | 'superseded'>;
    reviewed_by: string;
    review_comment?: string;
    reviewed_fields?: Record<string, unknown>;
}

export async function listPendingCompetitionProposals(): Promise<CompetitionProposalRecord[]> {
    return pb.collection(Collections.COMPETITION_PROPOSALS).getFullList<CompetitionProposalRecord>({
        filter: pb.filter('status = {:status} && deleted_at = ""', { status: 'pending' }),
        sort: '-proposed_at',
        expand: 'competition_id,athlete_id',
    });
}

export async function listCompetitionProposals(competitionId: string): Promise<CompetitionProposalRecord[]> {
    return pb.collection(Collections.COMPETITION_PROPOSALS).getFullList<CompetitionProposalRecord>({
        filter: pb.filter('competition_id = {:competitionId} && deleted_at = ""', { competitionId }),
        sort: '-proposed_at',
        expand: 'competition_id,athlete_id,reviewed_by',
    });
}

export async function countPendingCompetitionProposals(): Promise<number> {
    const result = await pb.collection(Collections.COMPETITION_PROPOSALS).getList(1, 1, {
        filter: pb.filter('status = {:status} && deleted_at = ""', { status: 'pending' }),
    });
    return result.totalItems;
}

export async function createCompetitionProposal(
    input: CreateCompetitionProposalInput
): Promise<CompetitionProposalRecord> {
    return pb.collection(Collections.COMPETITION_PROPOSALS).create<CompetitionProposalRecord>({
        ...input,
        status: 'pending',
        proposed_at: new Date().toISOString(),
    });
}

export async function reviewCompetitionProposal(
    proposalId: string,
    input: ReviewCompetitionProposalInput
): Promise<CompetitionProposalRecord> {
    return pb.collection(Collections.COMPETITION_PROPOSALS).update<CompetitionProposalRecord>(proposalId, {
        ...input,
        reviewed_at: new Date().toISOString(),
    });
}
