import { describe, expect, it } from 'vitest';
import { canAthleteEditCompetitionMedia, canAthleteViewCompetitionMedia } from '@/lib/competitions/mediaAccess';

const baseItem = {
    visibility: 'team' as const,
    moderation_status: 'visible' as const,
    uploader_athlete_id: 'athlete-owner',
    subject_athlete_id: 'athlete-subject',
};

describe('canAthleteViewCompetitionMedia', () => {
    it('hides media with hidden moderation status for all athletes', () => {
        const canView = canAthleteViewCompetitionMedia(
            { ...baseItem, moderation_status: 'hidden' },
            { athleteId: 'athlete-owner', isParticipant: true }
        );

        expect(canView).toBe(false);
    });

    it('allows public/team visibility without athlete scope', () => {
        expect(
            canAthleteViewCompetitionMedia(
                { ...baseItem, visibility: 'public' },
                { athleteId: null, isParticipant: false }
            )
        ).toBe(true);

        expect(
            canAthleteViewCompetitionMedia(
                { ...baseItem, visibility: 'team' },
                { athleteId: null, isParticipant: false }
            )
        ).toBe(true);
    });

    it('allows participants visibility only for participants', () => {
        expect(
            canAthleteViewCompetitionMedia(
                { ...baseItem, visibility: 'participants' },
                { athleteId: 'athlete-random', isParticipant: true }
            )
        ).toBe(true);

        expect(
            canAthleteViewCompetitionMedia(
                { ...baseItem, visibility: 'participants' },
                { athleteId: 'athlete-random', isParticipant: false }
            )
        ).toBe(false);
    });

    it('allows private visibility only for uploader or subject athlete', () => {
        expect(
            canAthleteViewCompetitionMedia(
                { ...baseItem, visibility: 'private' },
                { athleteId: 'athlete-owner', isParticipant: true }
            )
        ).toBe(true);

        expect(
            canAthleteViewCompetitionMedia(
                { ...baseItem, visibility: 'private' },
                { athleteId: 'athlete-subject', isParticipant: true }
            )
        ).toBe(true);

        expect(
            canAthleteViewCompetitionMedia(
                { ...baseItem, visibility: 'private' },
                { athleteId: 'athlete-other', isParticipant: true }
            )
        ).toBe(false);
    });
});

describe('canAthleteEditCompetitionMedia', () => {
    it('allows edit only for uploader athlete', () => {
        expect(canAthleteEditCompetitionMedia(baseItem, 'athlete-owner')).toBe(true);
        expect(canAthleteEditCompetitionMedia(baseItem, 'athlete-other')).toBe(false);
    });

    it('denies edit when athlete scope is missing', () => {
        expect(canAthleteEditCompetitionMedia(baseItem, null)).toBe(false);
    });
});
