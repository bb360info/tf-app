import type { RecordModel } from 'pocketbase';
import pb from '../client';
import { Collections } from '../collections';
import type {
    CompetitionMediaKind,
    CompetitionMediaRecord,
    MediaModerationStatus,
    MediaVisibility,
} from '../types';

export type CompetitionMediaItem = CompetitionMediaRecord & RecordModel;

export interface UploadCompetitionMediaInput {
    competition_id: string;
    uploader_athlete_id: string;
    file: File;
    subject_athlete_id?: string;
    kind?: CompetitionMediaKind;
    visibility: MediaVisibility;
    caption?: string;
}

export interface ModerateCompetitionMediaInput {
    moderation_status: MediaModerationStatus;
    moderated_by: string;
    moderation_reason?: string;
}

export interface ListCompetitionMediaOptions {
    isCoach: boolean;
    athleteId?: string;
}

export interface UpdateCompetitionMediaInput {
    kind?: CompetitionMediaKind;
    visibility?: MediaVisibility;
    caption?: string;
    subject_athlete_id?: string;
}

export async function listCompetitionMedia(
    competitionId: string,
    options: ListCompetitionMediaOptions
): Promise<CompetitionMediaItem[]> {
    const clauses = ['competition_id = {:competitionId}', 'deleted_at = ""'];
    const params: Record<string, string> = { competitionId };

    if (!options.isCoach) {
        clauses.push('moderation_status = {:moderationStatus}');
        params.moderationStatus = 'visible';

        if (options.athleteId) {
            clauses.push(
                '(visibility = "public" || visibility = "team" || ' +
                '(visibility = "participants" && competition_id.competition_participants_via_competition_id.athlete_id ?= {:athleteId}) || ' +
                '(visibility = "private" && (uploader_athlete_id = {:athleteId} || subject_athlete_id = {:athleteId})))'
            );
            params.athleteId = options.athleteId;
        } else {
            clauses.push('(visibility = "public" || visibility = "team")');
        }
    }

    return pb.collection(Collections.COMPETITION_MEDIA).getFullList<CompetitionMediaItem>({
        filter: pb.filter(clauses.join(' && '), params),
        sort: '-id',
        expand: 'uploader_athlete_id,subject_athlete_id',
    });
}

export async function uploadCompetitionMedia(
    input: UploadCompetitionMediaInput
): Promise<CompetitionMediaItem> {
    return pb.collection(Collections.COMPETITION_MEDIA).create<CompetitionMediaItem>(input);
}

export async function moderateCompetitionMedia(
    id: string,
    input: ModerateCompetitionMediaInput
): Promise<CompetitionMediaItem> {
    return pb.collection(Collections.COMPETITION_MEDIA).update<CompetitionMediaItem>(id, {
        ...input,
        moderated_at: new Date().toISOString(),
    });
}

export async function updateCompetitionMedia(
    id: string,
    input: UpdateCompetitionMediaInput
): Promise<CompetitionMediaItem> {
    return pb.collection(Collections.COMPETITION_MEDIA).update<CompetitionMediaItem>(id, input);
}

export async function removeCompetitionMedia(id: string): Promise<void> {
    await pb.collection(Collections.COMPETITION_MEDIA).update(id, {
        deleted_at: new Date().toISOString(),
    });
}
