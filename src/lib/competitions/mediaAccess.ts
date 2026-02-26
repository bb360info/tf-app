import type { MediaModerationStatus, MediaVisibility } from '@/lib/pocketbase/types';

interface CompetitionMediaAccessItem {
    visibility: MediaVisibility;
    moderation_status: MediaModerationStatus;
    uploader_athlete_id: string;
    subject_athlete_id?: string;
}

interface AthleteMediaAccessContext {
    athleteId: string | null;
    isParticipant: boolean;
}

export function canAthleteViewCompetitionMedia(
    item: CompetitionMediaAccessItem,
    context: AthleteMediaAccessContext
): boolean {
    if (item.moderation_status !== 'visible') return false;

    if (item.visibility === 'public' || item.visibility === 'team') {
        return true;
    }

    if (!context.athleteId) return false;

    if (item.visibility === 'participants') {
        return context.isParticipant;
    }

    return item.uploader_athlete_id === context.athleteId
        || item.subject_athlete_id === context.athleteId;
}

export function canAthleteEditCompetitionMedia(
    item: Pick<CompetitionMediaAccessItem, 'uploader_athlete_id'>,
    athleteId: string | null
): boolean {
    if (!athleteId) return false;
    return item.uploader_athlete_id === athleteId;
}
