import { z } from 'zod/v4';
import { DisciplineSchema, SeasonTypeSchema } from './core';

// ─── Shared ────────────────────────────────────────────────────────

const pbId = z.string().min(1);

// ─── Competitions ──────────────────────────────────────────────────

export const CompetitionPrioritySchema = z.enum(['A', 'B', 'C']);
export const CompetitionStatusSchema = z.enum(['planned', 'confirmed', 'completed', 'cancelled']);
export const ParticipantStatusSchema = z.enum(['planned', 'confirmed', 'withdrawn', 'dns', 'dnf', 'finished']);
export const ProposalStatusSchema = z.enum(['pending', 'approved', 'rejected', 'superseded']);
export const ProposalKindSchema = z.enum(['result', 'metadata', 'pre_event_info', 'media_meta']);
export const CompetitionMediaKindSchema = z.enum(['photo', 'video', 'document']);
export const MediaVisibilitySchema = z.enum(['team', 'participants', 'private', 'public']);
export const MediaModerationStatusSchema = z.enum(['visible', 'hidden']);

// [Track 4.263] Polymorphic ownership
export const CompetitionOwnerTypeSchema = z.enum(['season', 'athlete', 'group']);

export const CompetitionsSchema = z.object({
    owner_type: CompetitionOwnerTypeSchema,                  // [NEW, required]
    season_id: z.string().min(1).optional(),                 // [CHANGED: required→optional]
    athlete_id: z.string().min(1).optional(),                // [NEW]
    group_id: z.string().min(1).optional(),                  // [NEW]
    name: z.string().min(1).max(255),
    date: z.iso.datetime(),
    priority: CompetitionPrioritySchema,
    discipline: DisciplineSchema.optional(),
    season_type: SeasonTypeSchema.optional(),
    website: z.string().url().max(1000).optional(),
    status: CompetitionStatusSchema.optional(),
    official_result: z.number().min(0).max(30).optional(),
    official_updated_by: pbId.optional(),
    official_updated_at: z.iso.datetime().optional(),
    location: z.string().optional(),
    notes: z.string().optional(),
}).refine(
    (v) => {
        if (v.owner_type === 'season') return !!v.season_id;
        if (v.owner_type === 'athlete') return !!v.athlete_id;
        if (v.owner_type === 'group') return !!v.group_id;
        return false;
    },
    { message: 'Required FK field must be set for the given owner_type' }
);

export const CompetitionParticipantsSchema = z.object({
    competition_id: pbId,
    athlete_id: pbId,
    status: ParticipantStatusSchema,
    lane_or_order: z.string().max(50).optional(),
    bib_number: z.string().max(50).optional(),
    result_note: z.string().max(1000).optional(),
});

export const CompetitionProposalsSchema = z.object({
    competition_id: pbId,
    athlete_id: pbId,
    kind: ProposalKindSchema,
    payload: z.record(z.string(), z.unknown()),
    status: ProposalStatusSchema,
    proposed_at: z.iso.datetime().optional(),
    athlete_comment: z.string().max(2000).optional(),
    review_comment: z.string().max(2000).optional(),
    reviewed_fields: z.record(z.string(), z.unknown()).optional(),
    reviewed_by: pbId.optional(),
    reviewed_at: z.iso.datetime().optional(),
});

export const CompetitionProposalResultPayloadSchema = z.object({
    official_result: z.number().min(0).max(30),
});

export const CompetitionProposalMetadataPayloadSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    date: z.string().min(1).optional(),
    discipline: DisciplineSchema.optional(),
    season_type: SeasonTypeSchema.optional(),
    status: CompetitionStatusSchema.optional(),
    website: z.string().url().max(1000).optional(),
    location: z.string().max(255).optional(),
    notes: z.string().max(2000).optional(),
});

export const CompetitionProposalPreEventPayloadSchema = z.object({
    status: ParticipantStatusSchema.optional(),
    lane_or_order: z.string().max(50).optional(),
    bib_number: z.string().max(50).optional(),
    result_note: z.string().max(1000).optional(),
});

export const CompetitionProposalMediaMetaPayloadSchema = z.object({
    kind: CompetitionMediaKindSchema.optional(),
    visibility: MediaVisibilitySchema.optional(),
    caption: z.string().max(2000).optional(),
});

export const CompetitionProposalPayloadSchema = z.union([
    CompetitionProposalResultPayloadSchema,
    CompetitionProposalMetadataPayloadSchema,
    CompetitionProposalPreEventPayloadSchema,
    CompetitionProposalMediaMetaPayloadSchema,
]);

export const CompetitionMediaSchema = z.object({
    competition_id: pbId,
    uploader_athlete_id: pbId,
    subject_athlete_id: pbId.optional(),
    file: z.string().min(1),
    kind: CompetitionMediaKindSchema.optional(),
    visibility: MediaVisibilitySchema,
    moderation_status: MediaModerationStatusSchema,
    caption: z.string().max(2000).optional(),
    moderated_by: pbId.optional(),
    moderation_reason: z.string().max(2000).optional(),
    moderated_at: z.iso.datetime().optional(),
});

// ─── Achievements ──────────────────────────────────────────────────

export const AchievementTypeSchema = z.enum([
    'streak_3d', 'streak_7d', 'streak_30d', 'streak_100d',
    'first_workout', 'workouts_10', 'workouts_50', 'workouts_100',
    'first_test', 'first_pb', 'pb_5', 'all_tests',
    'first_competition',
]);

export const AchievementsSchema = z.object({
    athlete_id: pbId,
    type: AchievementTypeSchema,
    earned_at: z.iso.datetime(),
    title: z.string().optional(),
    description: z.string().optional(),
});

// ─── Notifications ─────────────────────────────────────────────────

export const NotificationTypeSchema = z.enum([
    'plan_published',
    'checkin_reminder',
    'achievement',
    'system',
    'low_readiness',
    'coach_note',
    'invite_accepted',
    'competition_upcoming',
]);

export const NotificationsSchema = z.object({
    user_id: pbId,
    type: NotificationTypeSchema,
    message: z.string().min(1),
    read: z.boolean(),
    link: z.string().optional(),
    message_key: z.string().optional(),
    message_params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    priority: z.enum(['normal', 'urgent']).optional(),
    expires_at: z.string().optional(),
    delivered: z.boolean().optional(),
});

// ─── Error Logs ────────────────────────────────────────────────────

export const ErrorLogsSchema = z.object({
    user_id: z.string().optional(),
    error: z.string().min(1),
    stack: z.string().optional(),
    device_info: z.string().optional(),
    url: z.string().optional(),
});
