'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarClock, Check, ChevronDown, ChevronUp, CircleDashed, PencilLine, Save, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { type AthleteRecord } from '@/lib/pocketbase/services/athletes';
import pb from '@/lib/pocketbase/client';
import {
    listCompetitionMedia,
    moderateCompetitionMedia,
    updateCompetitionMedia,
    uploadCompetitionMedia,
    type CompetitionMediaItem,
} from '@/lib/pocketbase/services/competitionMedia';
import { listCompetitionParticipants, removeCompetitionParticipant, type CompetitionParticipantRecord, upsertCompetitionParticipant } from '@/lib/pocketbase/services/competitionParticipants';
import { createCompetitionProposal, listCompetitionProposals, reviewCompetitionProposal, type CompetitionProposalRecord } from '@/lib/pocketbase/services/competitionProposals';
import { type CompetitionRecord, updateCompetition } from '@/lib/pocketbase/services/competitions';
import { canAthleteEditCompetitionMedia, canAthleteViewCompetitionMedia } from '@/lib/competitions/mediaAccess';
import {
    type CompetitionStatus,
    type Discipline,
    type MediaVisibility,
    type ParticipantStatus,
    type ProposalKind,
    type SeasonType,
} from '@/lib/pocketbase/types';
import {
    CompetitionProposalMediaMetaPayloadSchema,
    CompetitionProposalMetadataPayloadSchema,
    CompetitionProposalPreEventPayloadSchema,
    CompetitionProposalResultPayloadSchema,
} from '@/lib/validation';
import styles from './CompetitionCard.module.css';

type ParticipantSummary = {
    total: number;
    confirmed: number;
    finished: number;
    withdrawn: number;
};

interface CompetitionCardProps {
    competition: CompetitionRecord;
    isCoach: boolean;
    seasonName: string;
    highlighted: boolean;
    pendingCount: number;
    participantSummary: ParticipantSummary;
    athletes: AthleteRecord[];
    athleteScopeId: string | null;
    openByDefault?: boolean;
    onUpdated: () => Promise<void>;
}

const DISCIPLINE_VALUES: Discipline[] = ['high_jump', 'long_jump', 'triple_jump'];
const SEASON_TYPE_VALUES: SeasonType[] = ['indoor', 'outdoor'];
const STATUS_VALUES: CompetitionStatus[] = ['planned', 'confirmed', 'completed', 'cancelled'];
const PARTICIPANT_STATUS_VALUES: ParticipantStatus[] = ['planned', 'confirmed', 'withdrawn', 'dns', 'dnf', 'finished'];
const PROPOSAL_KIND_VALUES: ProposalKind[] = ['result', 'metadata', 'pre_event_info', 'media_meta'];
const MEDIA_KIND_VALUES = ['photo', 'video', 'document'] as const;
const MEDIA_VISIBILITY_VALUES = ['team', 'participants', 'private', 'public'] as const;

function asTrimmedValue(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function summarizeStatus(summary: ParticipantSummary): string {
    return `${summary.confirmed}/${summary.total}`;
}

function withoutUndefined<T extends Record<string, unknown>>(input: T): Partial<T> {
    return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}

export function CompetitionCard({
    competition,
    isCoach,
    seasonName,
    highlighted,
    pendingCount,
    participantSummary,
    athletes,
    athleteScopeId,
    openByDefault = false,
    onUpdated,
}: CompetitionCardProps) {
    const t = useTranslations('competitions');
    const tCommon = useTranslations();
    const { user } = useAuth();

    const [isOpen, setIsOpen] = useState(openByDefault);
    const [loadError, setLoadError] = useState('');

    const [officialResult, setOfficialResult] = useState(competition.official_result?.toString() ?? '');
    const [status, setStatus] = useState<CompetitionStatus>((competition.status ?? 'planned') as CompetitionStatus);
    const [discipline, setDiscipline] = useState<Discipline | ''>((competition.discipline ?? '') as Discipline | '');
    const [seasonType, setSeasonType] = useState<SeasonType | ''>((competition.season_type ?? '') as SeasonType | '');
    const [website, setWebsite] = useState(competition.website ?? '');
    const [location, setLocation] = useState(competition.location ?? '');
    const [notes, setNotes] = useState(competition.notes ?? '');

    const [participants, setParticipants] = useState<CompetitionParticipantRecord[]>([]);
    const [proposals, setProposals] = useState<CompetitionProposalRecord[]>([]);
    const [mediaItems, setMediaItems] = useState<CompetitionMediaItem[]>([]);

    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [isSavingOfficial, setIsSavingOfficial] = useState(false);
    const [isSavingParticipant, setIsSavingParticipant] = useState(false);
    const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const [isSavingMediaMeta, setIsSavingMediaMeta] = useState(false);
    const [isModeratingMediaId, setIsModeratingMediaId] = useState('');

    // [Track 4.263] Group participation derived state (isGroupComp only depends on competition prop)
    const isGroupComp = competition.owner_type === 'group';

    const [newParticipantAthleteId, setNewParticipantAthleteId] = useState('');
    const [newParticipantStatus, setNewParticipantStatus] = useState<ParticipantStatus>('planned');

    const [proposalKind, setProposalKind] = useState<ProposalKind>('result');
    const [proposalComment, setProposalComment] = useState('');
    const [proposalResult, setProposalResult] = useState('');
    const [proposalMetadataLocation, setProposalMetadataLocation] = useState('');
    const [proposalMetadataWebsite, setProposalMetadataWebsite] = useState('');
    const [proposalMetadataNotes, setProposalMetadataNotes] = useState('');
    const [proposalMetadataStatus, setProposalMetadataStatus] = useState<CompetitionStatus | ''>('');
    const [proposalMetadataDiscipline, setProposalMetadataDiscipline] = useState<Discipline | ''>('');
    const [proposalMetadataSeasonType, setProposalMetadataSeasonType] = useState<SeasonType | ''>('');
    const [proposalPreEventStatus, setProposalPreEventStatus] = useState<ParticipantStatus | ''>('');
    const [proposalPreEventLane, setProposalPreEventLane] = useState('');
    const [proposalPreEventBib, setProposalPreEventBib] = useState('');
    const [proposalPreEventNote, setProposalPreEventNote] = useState('');
    const [proposalMediaKind, setProposalMediaKind] = useState('');
    const [proposalMediaVisibility, setProposalMediaVisibility] = useState('');
    const [proposalMediaCaption, setProposalMediaCaption] = useState('');
    const [uploadMediaFile, setUploadMediaFile] = useState<File | null>(null);
    const [uploadMediaKind, setUploadMediaKind] = useState('');
    const [uploadMediaVisibility, setUploadMediaVisibility] = useState<'team' | 'participants' | 'private' | 'public'>('team');
    const [uploadMediaCaption, setUploadMediaCaption] = useState('');
    const [uploadSubjectAthleteId, setUploadSubjectAthleteId] = useState('');
    const [uploadFileInputKey, setUploadFileInputKey] = useState(0);
    const [editingMediaId, setEditingMediaId] = useState('');
    const [mediaEditKind, setMediaEditKind] = useState('');
    const [mediaEditVisibility, setMediaEditVisibility] = useState<MediaVisibility>('team');
    const [mediaEditCaption, setMediaEditCaption] = useState('');
    const [moderationReasonByMediaId, setModerationReasonByMediaId] = useState<Record<string, string>>({});

    const [selectedProposalId, setSelectedProposalId] = useState('');
    const [reviewComment, setReviewComment] = useState('');
    const [correctionResult, setCorrectionResult] = useState('');
    const [correctionStatus, setCorrectionStatus] = useState<CompetitionStatus | ''>('');
    const [correctionLocation, setCorrectionLocation] = useState('');
    const [correctionWebsite, setCorrectionWebsite] = useState('');
    const [correctionNotes, setCorrectionNotes] = useState('');

    useEffect(() => {
        setOfficialResult(competition.official_result?.toString() ?? '');
        setStatus((competition.status ?? 'planned') as CompetitionStatus);
        setDiscipline((competition.discipline ?? '') as Discipline | '');
        setSeasonType((competition.season_type ?? '') as SeasonType | '');
        setWebsite(competition.website ?? '');
        setLocation(competition.location ?? '');
        setNotes(competition.notes ?? '');
    }, [competition]);

    useEffect(() => {
        if (openByDefault) {
            setIsOpen(true);
        }
    }, [openByDefault]);

    useEffect(() => {
        if (!isOpen) return;
        let isCancelled = false;
        const load = async () => {
            setIsLoadingDetails(true);
            setLoadError('');
            try {
                const [loadedParticipants, loadedProposals, loadedMedia] = await Promise.all([
                    listCompetitionParticipants(competition.id),
                    listCompetitionProposals(competition.id),
                    listCompetitionMedia(competition.id, {
                        isCoach,
                        athleteId: athleteScopeId ?? undefined,
                    }),
                ]);
                if (isCancelled) return;
                setParticipants(loadedParticipants);
                setProposals(loadedProposals);
                setMediaItems(loadedMedia);
            } catch {
                if (!isCancelled) {
                    setLoadError(t('errors.loadCardDetails'));
                }
            } finally {
                if (!isCancelled) {
                    setIsLoadingDetails(false);
                }
            }
        };
        void load();
        return () => {
            isCancelled = true;
        };
    }, [athleteScopeId, competition.id, isCoach, isOpen, t]);

    const pendingProposals = useMemo(
        () => proposals.filter((proposal) => proposal.status === 'pending'),
        [proposals]
    );

    const selectedProposal = useMemo(
        () => proposals.find((proposal) => proposal.id === selectedProposalId) ?? null,
        [proposals, selectedProposalId]
    );

    const participantAthleteIds = useMemo(
        () => new Set(participants.map((participant) => participant.athlete_id)),
        [participants]
    );

    // [Track 4.263] iAmParticipant needs participantAthleteIds above ↑
    const iAmParticipant = Boolean(athleteScopeId && participantAthleteIds.has(athleteScopeId));

    const participantOptions = useMemo(
        () => participants.map((participant) => {
            const expanded = participant.expand?.athlete_id as { name?: string } | undefined;
            const fallback = athletes.find((item) => item.id === participant.athlete_id)?.name;
            return {
                id: participant.athlete_id,
                name: expanded?.name ?? fallback ?? t('fallbacks.unknownAthlete'),
            };
        }),
        [athletes, participants, t]
    );

    const visibleMediaItems = useMemo(() => {
        if (isCoach) return mediaItems;
        return mediaItems.filter((item) => canAthleteViewCompetitionMedia(item, {
            athleteId: athleteScopeId,
            isParticipant: athleteScopeId ? participantAthleteIds.has(athleteScopeId) : false,
        }));
    }, [athleteScopeId, isCoach, mediaItems, participantAthleteIds]);

    const postEventCtaLabel = useMemo(() => {
        const isPostEvent = (competition.status ?? 'planned') === 'completed';
        if (!isPostEvent) return '';
        if (competition.official_result == null) {
            return isCoach ? t('card.ctaAddResultCoach') : t('card.ctaAddResultAthlete');
        }
        return t('card.ctaSuggestCorrection');
    }, [competition.official_result, competition.status, isCoach, t]);

    const refreshCardData = async () => {
        const [loadedParticipants, loadedProposals, loadedMedia] = await Promise.all([
            listCompetitionParticipants(competition.id),
            listCompetitionProposals(competition.id),
            listCompetitionMedia(competition.id, {
                isCoach,
                athleteId: athleteScopeId ?? undefined,
            }),
        ]);
        setParticipants(loadedParticipants);
        setProposals(loadedProposals);
        setMediaItems(loadedMedia);
    };

    const handleUploadMedia = async (event: FormEvent) => {
        event.preventDefault();
        if (isCoach || !athleteScopeId || !uploadMediaFile) return;
        const subjectAthleteId = uploadSubjectAthleteId || athleteScopeId;

        if (!participantAthleteIds.has(subjectAthleteId)) {
            setLoadError(t('errors.mediaSubjectNotParticipant'));
            return;
        }

        const maxBytes = 50 * 1024 * 1024;
        if (uploadMediaFile.size > maxBytes) {
            setLoadError(t('errors.mediaFileTooLarge'));
            return;
        }

        const isAcceptedType = uploadMediaFile.type.startsWith('image/')
            || uploadMediaFile.type.startsWith('video/')
            || uploadMediaFile.type === 'application/pdf';
        if (!isAcceptedType) {
            setLoadError(t('errors.mediaInvalidFileType'));
            return;
        }

        setIsUploadingMedia(true);
        setLoadError('');
        try {
            await uploadCompetitionMedia({
                competition_id: competition.id,
                uploader_athlete_id: athleteScopeId,
                file: uploadMediaFile,
                kind: uploadMediaKind ? (uploadMediaKind as 'photo' | 'video' | 'document') : undefined,
                visibility: uploadMediaVisibility,
                caption: asTrimmedValue(uploadMediaCaption),
                subject_athlete_id: subjectAthleteId,
            });
            setUploadMediaFile(null);
            setUploadMediaKind('');
            setUploadMediaVisibility('team');
            setUploadMediaCaption('');
            setUploadSubjectAthleteId(athleteScopeId);
            setUploadFileInputKey((prev) => prev + 1);
            await refreshCardData();
            await onUpdated();
        } catch {
            setLoadError(t('errors.mediaUploadFailed'));
        } finally {
            setIsUploadingMedia(false);
        }
    };

    useEffect(() => {
        if (isCoach || !athleteScopeId) return;
        if (!participantAthleteIds.has(athleteScopeId)) return;
        setUploadSubjectAthleteId((prev) => prev || athleteScopeId);
    }, [athleteScopeId, isCoach, participantAthleteIds]);

    const canEditMedia = (media: CompetitionMediaItem): boolean => {
        if (isCoach) return true;
        return canAthleteEditCompetitionMedia(media, athleteScopeId);
    };

    const startEditingMedia = (media: CompetitionMediaItem) => {
        setEditingMediaId(media.id);
        setMediaEditKind(media.kind ?? '');
        setMediaEditVisibility(media.visibility);
        setMediaEditCaption(media.caption ?? '');
    };

    const resetMediaEdit = () => {
        setEditingMediaId('');
        setMediaEditKind('');
        setMediaEditVisibility('team');
        setMediaEditCaption('');
    };

    const handleSaveMediaMeta = async (mediaId: string) => {
        setIsSavingMediaMeta(true);
        setLoadError('');
        try {
            await updateCompetitionMedia(mediaId, {
                kind: mediaEditKind ? (mediaEditKind as 'photo' | 'video' | 'document') : undefined,
                visibility: mediaEditVisibility,
                caption: asTrimmedValue(mediaEditCaption),
            });
            resetMediaEdit();
            await refreshCardData();
            await onUpdated();
        } catch {
            setLoadError(t('errors.mediaMetaSaveFailed'));
        } finally {
            setIsSavingMediaMeta(false);
        }
    };

    const handleModerateMedia = async (
        media: CompetitionMediaItem,
        moderationStatus: 'visible' | 'hidden'
    ) => {
        if (!isCoach || !user?.id) return;
        const reason = asTrimmedValue(moderationReasonByMediaId[media.id] ?? '');
        if (moderationStatus === 'hidden' && !reason) {
            setLoadError(t('errors.mediaModerationReasonRequired'));
            return;
        }

        setIsModeratingMediaId(media.id);
        setLoadError('');
        try {
            await moderateCompetitionMedia(media.id, {
                moderation_status: moderationStatus,
                moderated_by: user.id,
                moderation_reason: reason,
            });
            setModerationReasonByMediaId((prev) => {
                const next = { ...prev };
                delete next[media.id];
                return next;
            });
            await refreshCardData();
            await onUpdated();
        } catch {
            setLoadError(t('errors.mediaModerationFailed'));
        } finally {
            setIsModeratingMediaId('');
        }
    };

    const handleSaveOfficial = async (event: FormEvent) => {
        event.preventDefault();
        if (!isCoach || !user?.id) return;
        setIsSavingOfficial(true);
        setLoadError('');
        try {
            const parsedResult = officialResult.trim() === '' ? undefined : Number(officialResult);
            await updateCompetition(competition.id, {
                official_result: Number.isFinite(parsedResult) ? parsedResult : undefined,
                status,
                discipline: discipline || undefined,
                season_type: seasonType || undefined,
                website: asTrimmedValue(website),
                location: asTrimmedValue(location),
                notes: asTrimmedValue(notes),
                official_updated_by: user.id,
                official_updated_at: new Date().toISOString(),
            });
            await onUpdated();
        } catch {
            setLoadError(t('errors.saveOfficialFailed'));
        } finally {
            setIsSavingOfficial(false);
        }
    };

    const handleAddParticipant = async () => {
        if (!isCoach || !newParticipantAthleteId) return;
        setIsSavingParticipant(true);
        setLoadError('');
        try {
            await upsertCompetitionParticipant({
                competition_id: competition.id,
                athlete_id: newParticipantAthleteId,
                status: newParticipantStatus,
            });
            setNewParticipantAthleteId('');
            setNewParticipantStatus('planned');
            await refreshCardData();
            await onUpdated();
        } catch {
            setLoadError(t('errors.participantSaveFailed'));
        } finally {
            setIsSavingParticipant(false);
        }
    };

    const handleUpdateParticipantStatus = async (participant: CompetitionParticipantRecord, nextStatus: ParticipantStatus) => {
        if (!isCoach) return;
        setIsSavingParticipant(true);
        setLoadError('');
        try {
            await upsertCompetitionParticipant({
                competition_id: participant.competition_id,
                athlete_id: participant.athlete_id,
                status: nextStatus,
                lane_or_order: participant.lane_or_order,
                bib_number: participant.bib_number,
                result_note: participant.result_note,
            });
            await refreshCardData();
            await onUpdated();
        } catch {
            setLoadError(t('errors.participantSaveFailed'));
        } finally {
            setIsSavingParticipant(false);
        }
    };

    const handleRemoveParticipant = async (participantId: string) => {
        if (!isCoach) return;
        setIsSavingParticipant(true);
        setLoadError('');
        try {
            await removeCompetitionParticipant(participantId);
            await refreshCardData();
            await onUpdated();
        } catch {
            setLoadError(t('errors.participantDeleteFailed'));
        } finally {
            setIsSavingParticipant(false);
        }
    };

    // [Track 4.263] Toggle participation for group competitions (athlete only)
    const handleToggleGroupParticipation = async () => {
        if (!athleteScopeId || isCoach) return;
        setIsSavingParticipant(true);
        setLoadError('');
        try {
            if (iAmParticipant) {
                const myRecord = participants.find((p) => p.athlete_id === athleteScopeId);
                if (myRecord) await removeCompetitionParticipant(myRecord.id);
            } else {
                await upsertCompetitionParticipant({
                    competition_id: competition.id,
                    athlete_id: athleteScopeId,
                    status: 'planned',
                });
            }
            await refreshCardData();
            await onUpdated();
        } catch {
            setLoadError(t('errors.participantSaveFailed'));
        } finally {
            setIsSavingParticipant(false);
        }
    };

    const buildProposalPayload = () => {
        if (proposalKind === 'result') {
            const resultPayload = {
                official_result: Number(proposalResult),
            };
            const parsed = CompetitionProposalResultPayloadSchema.safeParse(resultPayload);
            if (!parsed.success) return null;
            return parsed.data;
        }

        if (proposalKind === 'metadata') {
            const metadataPayload = {
                status: proposalMetadataStatus || undefined,
                discipline: proposalMetadataDiscipline || undefined,
                season_type: proposalMetadataSeasonType || undefined,
                website: asTrimmedValue(proposalMetadataWebsite),
                location: asTrimmedValue(proposalMetadataLocation),
                notes: asTrimmedValue(proposalMetadataNotes),
            };
            const parsed = CompetitionProposalMetadataPayloadSchema.safeParse(metadataPayload);
            if (!parsed.success) return null;
            return parsed.data;
        }

        if (proposalKind === 'pre_event_info') {
            const preEventPayload = {
                status: proposalPreEventStatus || undefined,
                lane_or_order: asTrimmedValue(proposalPreEventLane),
                bib_number: asTrimmedValue(proposalPreEventBib),
                result_note: asTrimmedValue(proposalPreEventNote),
            };
            const parsed = CompetitionProposalPreEventPayloadSchema.safeParse(preEventPayload);
            if (!parsed.success) return null;
            return parsed.data;
        }

        const mediaPayload = {
            kind: proposalMediaKind ? proposalMediaKind : undefined,
            visibility: proposalMediaVisibility ? proposalMediaVisibility : undefined,
            caption: asTrimmedValue(proposalMediaCaption),
        };
        const parsed = CompetitionProposalMediaMetaPayloadSchema.safeParse(mediaPayload);
        if (!parsed.success) return null;
        return parsed.data;
    };

    const resetProposalForm = () => {
        setProposalComment('');
        setProposalResult('');
        setProposalMetadataLocation('');
        setProposalMetadataWebsite('');
        setProposalMetadataNotes('');
        setProposalMetadataStatus('');
        setProposalMetadataDiscipline('');
        setProposalMetadataSeasonType('');
        setProposalPreEventStatus('');
        setProposalPreEventLane('');
        setProposalPreEventBib('');
        setProposalPreEventNote('');
        setProposalMediaKind('');
        setProposalMediaVisibility('');
        setProposalMediaCaption('');
    };

    const handleSubmitProposal = async (event: FormEvent) => {
        event.preventDefault();
        if (isCoach || !athleteScopeId) return;
        const payload = buildProposalPayload();
        if (!payload) {
            setLoadError(t('errors.proposalValidationFailed'));
            return;
        }

        setIsSubmittingProposal(true);
        setLoadError('');
        try {
            await createCompetitionProposal({
                competition_id: competition.id,
                athlete_id: athleteScopeId,
                kind: proposalKind,
                payload,
                athlete_comment: asTrimmedValue(proposalComment),
            });
            resetProposalForm();
            await refreshCardData();
            await onUpdated();
        } catch {
            setLoadError(t('errors.proposalSubmitFailed'));
        } finally {
            setIsSubmittingProposal(false);
        }
    };

    const getPatchFromProposal = (proposal: CompetitionProposalRecord) => {
        if (proposal.kind === 'result') {
            const parsed = CompetitionProposalResultPayloadSchema.safeParse(proposal.payload);
            if (!parsed.success) return {};
            return { official_result: parsed.data.official_result };
        }
        if (proposal.kind === 'metadata') {
            const parsed = CompetitionProposalMetadataPayloadSchema.safeParse(proposal.payload);
            if (!parsed.success) return {};
            return parsed.data;
        }
        return {};
    };

    const handleReviewProposal = async (action: 'approve' | 'approve_with_corrections' | 'reject') => {
        if (!isCoach || !user?.id || !selectedProposal || selectedProposal.status !== 'pending') return;

        const proposalPatch = getPatchFromProposal(selectedProposal);
        const correctedResult = correctionResult.trim() ? Number(correctionResult) : undefined;
        const correctedPatch = {
            ...proposalPatch,
            ...(Number.isFinite(correctedResult) ? { official_result: correctedResult } : {}),
            ...(correctionStatus ? { status: correctionStatus } : {}),
            ...(asTrimmedValue(correctionLocation) ? { location: asTrimmedValue(correctionLocation) } : {}),
            ...(asTrimmedValue(correctionWebsite) ? { website: asTrimmedValue(correctionWebsite) } : {}),
            ...(asTrimmedValue(correctionNotes) ? { notes: asTrimmedValue(correctionNotes) } : {}),
        };

        const shouldApplyOfficial = action !== 'reject';
        const applyPatch = action === 'approve_with_corrections' ? correctedPatch : proposalPatch;

        setIsReviewing(true);
        setLoadError('');
        try {
            const officialBefore = {
                official_result: competition.official_result,
                status: competition.status,
                location: competition.location,
                website: competition.website,
                notes: competition.notes,
            };

            const finalPatch = withoutUndefined(applyPatch);

            if (shouldApplyOfficial && Object.keys(finalPatch).length > 0) {
                await updateCompetition(competition.id, {
                    ...finalPatch,
                    official_updated_by: user.id,
                    official_updated_at: new Date().toISOString(),
                });
            }

            if (shouldApplyOfficial && selectedProposal.kind === 'pre_event_info') {
                const parsedPreEvent = CompetitionProposalPreEventPayloadSchema.safeParse(selectedProposal.payload);
                if (parsedPreEvent.success) {
                    const existing = participants.find((item) => item.athlete_id === selectedProposal.athlete_id);
                    await upsertCompetitionParticipant({
                        competition_id: competition.id,
                        athlete_id: selectedProposal.athlete_id,
                        status: parsedPreEvent.data.status ?? existing?.status ?? 'planned',
                        lane_or_order: parsedPreEvent.data.lane_or_order,
                        bib_number: parsedPreEvent.data.bib_number,
                        result_note: parsedPreEvent.data.result_note,
                    });
                }
            }

            await reviewCompetitionProposal(selectedProposal.id, {
                status: action === 'reject' ? 'rejected' : 'approved',
                reviewed_by: user.id,
                review_comment: asTrimmedValue(reviewComment),
                reviewed_fields: {
                    action,
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                    applied_payload: shouldApplyOfficial ? finalPatch : {},
                    official_before: officialBefore,
                    official_after: shouldApplyOfficial
                        ? { ...officialBefore, ...finalPatch }
                        : officialBefore,
                    proposal_kind: selectedProposal.kind,
                    proposal_payload: selectedProposal.payload,
                },
            });

            setSelectedProposalId('');
            setReviewComment('');
            setCorrectionResult('');
            setCorrectionStatus('');
            setCorrectionLocation('');
            setCorrectionWebsite('');
            setCorrectionNotes('');

            await refreshCardData();
            await onUpdated();
        } catch {
            setLoadError(t('errors.reviewFailed'));
        } finally {
            setIsReviewing(false);
        }
    };

    return (
        <article className={`${styles.card} ${highlighted ? styles.cardHighlighted : ''}`}>
            <header className={styles.cardHeader}>
                <div className={styles.headerText}>
                    <h3 className={styles.cardTitle}>{competition.name}</h3>
                    <p className={styles.cardMeta}>{new Date(competition.date).toLocaleDateString()} · {seasonName}</p>
                </div>
                <span className={styles.statusChip}>{t(`status.${competition.status || 'planned'}`)}</span>
            </header>

            <div className={styles.metrics}>
                <span className={styles.metric}><Users size={14} /> {t('labels.participants')}: {participantSummary.total}</span>
                <span className={styles.metric}><Check size={14} /> {t('labels.confirmed')}: {summarizeStatus(participantSummary)}</span>
                <span className={styles.metric}><CircleDashed size={14} /> {t('labels.result')}: {competition.official_result ?? '—'}</span>
                {isCoach ? <span className={styles.metric}>{t('labels.pending')}: {pendingCount}</span> : null}
            </div>

            {postEventCtaLabel ? (
                <button type="button" className={styles.postEventCta} onClick={() => setIsOpen(true)}>
                    <CalendarClock size={16} />
                    {postEventCtaLabel}
                </button>
            ) : null}

            <button type="button" className={styles.toggleBtn} onClick={() => setIsOpen((prev) => !prev)}>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {isOpen ? t('card.hideDetails') : t('card.showDetails')}
            </button>

            {isOpen ? (
                <section className={styles.details}>
                    {isLoadingDetails ? <p className={styles.info}>{t('card.loadingDetails')}</p> : null}
                    {loadError ? <p className={styles.error}>{loadError}</p> : null}

                    {isCoach ? (
                        <>
                            <form className={styles.form} onSubmit={handleSaveOfficial}>
                                <h4 className={styles.sectionTitle}>{t('card.officialSection')}</h4>
                                <div className={styles.grid}>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="30"
                                        value={officialResult}
                                        onChange={(event) => setOfficialResult(event.target.value)}
                                        placeholder={t('card.fields.officialResult')}
                                        className={styles.input}
                                    />
                                    <select value={status} onChange={(event) => setStatus(event.target.value as CompetitionStatus)} className={styles.input}>
                                        {STATUS_VALUES.map((value) => (
                                            <option key={value} value={value}>{t(`status.${value}`)}</option>
                                        ))}
                                    </select>
                                    <select value={discipline} onChange={(event) => setDiscipline(event.target.value as Discipline | '')} className={styles.input}>
                                        <option value="">{t('filters.allDisciplines')}</option>
                                        {DISCIPLINE_VALUES.map((value) => (
                                            <option key={value} value={value}>
                                                {tCommon(`dashboard.newAthlete.discipline${value === 'high_jump' ? 'HighJump' : value === 'long_jump' ? 'LongJump' : 'TripleJump'}`)}
                                            </option>
                                        ))}
                                    </select>
                                    <select value={seasonType} onChange={(event) => setSeasonType(event.target.value as SeasonType | '')} className={styles.input}>
                                        <option value="">{t('filters.allSeasonTypes')}</option>
                                        {SEASON_TYPE_VALUES.map((value) => (
                                            <option key={value} value={value}>{value === 'indoor' ? tCommon('training.seasonIndoor') : tCommon('training.seasonOutdoor')}</option>
                                        ))}
                                    </select>
                                    <input
                                        value={website}
                                        onChange={(event) => setWebsite(event.target.value)}
                                        className={styles.input}
                                        placeholder={t('card.fields.website')}
                                    />
                                    <input
                                        value={location}
                                        onChange={(event) => setLocation(event.target.value)}
                                        className={styles.input}
                                        placeholder={t('card.fields.location')}
                                    />
                                </div>
                                <textarea
                                    value={notes}
                                    onChange={(event) => setNotes(event.target.value)}
                                    className={styles.textarea}
                                    placeholder={t('card.fields.notes')}
                                    rows={3}
                                />
                                <button type="submit" className={styles.primaryBtn} disabled={isSavingOfficial}>
                                    <Save size={16} />
                                    {isSavingOfficial ? t('card.saving') : t('card.saveOfficial')}
                                </button>
                            </form>

                            <section className={styles.participantsSection}>
                                <h4 className={styles.sectionTitle}>{t('card.participantsSection')}</h4>
                                <div className={styles.participantAddRow}>
                                    <select value={newParticipantAthleteId} onChange={(event) => setNewParticipantAthleteId(event.target.value)} className={styles.input}>
                                        <option value="">{t('card.selectAthlete')}</option>
                                        {athletes.map((athlete) => (
                                            <option key={athlete.id} value={athlete.id}>{athlete.name}</option>
                                        ))}
                                    </select>
                                    <select value={newParticipantStatus} onChange={(event) => setNewParticipantStatus(event.target.value as ParticipantStatus)} className={styles.input}>
                                        {PARTICIPANT_STATUS_VALUES.map((value) => (
                                            <option key={value} value={value}>{value}</option>
                                        ))}
                                    </select>
                                    <button type="button" className={styles.secondaryBtn} onClick={handleAddParticipant} disabled={isSavingParticipant}>
                                        <Users size={16} />
                                        {t('card.addParticipant')}
                                    </button>
                                </div>

                                <ul className={styles.participantList}>
                                    {participants.map((participant) => {
                                        const athleteName = athletes.find((item) => item.id === participant.athlete_id)?.name ?? t('fallbacks.unknownAthlete');
                                        return (
                                            <li key={participant.id} className={styles.participantItem}>
                                                <span>{athleteName}</span>
                                                <div className={styles.participantActions}>
                                                    <select
                                                        value={participant.status}
                                                        onChange={(event) => handleUpdateParticipantStatus(participant, event.target.value as ParticipantStatus)}
                                                        className={styles.input}
                                                    >
                                                        {PARTICIPANT_STATUS_VALUES.map((value) => (
                                                            <option key={value} value={value}>{value}</option>
                                                        ))}
                                                    </select>
                                                    <button type="button" className={styles.iconBtn} onClick={() => handleRemoveParticipant(participant.id)}>
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>

                            <section className={styles.reviewSection}>
                                <h4 className={styles.sectionTitle}>{t('card.reviewSection')}</h4>
                                {pendingProposals.length === 0 ? (
                                    <p className={styles.info}>{t('inbox.empty')}</p>
                                ) : (
                                    <ul className={styles.proposalList}>
                                        {pendingProposals.map((proposal) => {
                                            const athleteName = (proposal.expand?.athlete_id as { name?: string } | undefined)?.name ?? t('fallbacks.unknownAthlete');
                                            return (
                                                <li key={proposal.id} className={styles.proposalItem}>
                                                    <div>
                                                        <p className={styles.proposalTitle}>{athleteName} · {proposal.kind}</p>
                                                        <p className={styles.proposalMeta}>{new Date(proposal.proposed_at ?? proposal.created).toLocaleString()}</p>
                                                    </div>
                                                    <button type="button" className={styles.secondaryBtn} onClick={() => setSelectedProposalId(proposal.id)}>
                                                        <PencilLine size={16} />
                                                        {t('card.review')}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}

                                {selectedProposal ? (
                                    <div className={styles.reviewPanel}>
                                        <p className={styles.proposalMeta}>{t('card.selectedProposal')}</p>
                                        <pre className={styles.payloadPreview}>{JSON.stringify(selectedProposal.payload, null, 2)}</pre>
                                        <textarea
                                            value={reviewComment}
                                            onChange={(event) => setReviewComment(event.target.value)}
                                            className={styles.textarea}
                                            rows={2}
                                            placeholder={t('card.fields.reviewComment')}
                                        />
                                        <div className={styles.grid}>
                                            <input
                                                value={correctionResult}
                                                onChange={(event) => setCorrectionResult(event.target.value)}
                                                className={styles.input}
                                                placeholder={t('card.fields.correctionResult')}
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="30"
                                            />
                                            <select
                                                value={correctionStatus}
                                                onChange={(event) => setCorrectionStatus(event.target.value as CompetitionStatus | '')}
                                                className={styles.input}
                                            >
                                                <option value="">{t('card.fields.correctionStatus')}</option>
                                                {STATUS_VALUES.map((value) => (
                                                    <option key={value} value={value}>{t(`status.${value}`)}</option>
                                                ))}
                                            </select>
                                            <input
                                                value={correctionLocation}
                                                onChange={(event) => setCorrectionLocation(event.target.value)}
                                                className={styles.input}
                                                placeholder={t('card.fields.correctionLocation')}
                                            />
                                            <input
                                                value={correctionWebsite}
                                                onChange={(event) => setCorrectionWebsite(event.target.value)}
                                                className={styles.input}
                                                placeholder={t('card.fields.correctionWebsite')}
                                            />
                                        </div>
                                        <textarea
                                            value={correctionNotes}
                                            onChange={(event) => setCorrectionNotes(event.target.value)}
                                            className={styles.textarea}
                                            rows={2}
                                            placeholder={t('card.fields.correctionNotes')}
                                        />
                                        <div className={styles.reviewActions}>
                                            <button type="button" className={styles.primaryBtn} disabled={isReviewing} onClick={() => handleReviewProposal('approve')}>
                                                {t('card.approve')}
                                            </button>
                                            <button type="button" className={styles.secondaryBtn} disabled={isReviewing} onClick={() => handleReviewProposal('approve_with_corrections')}>
                                                {t('card.approveWithCorrections')}
                                            </button>
                                            <button type="button" className={styles.dangerBtn} disabled={isReviewing} onClick={() => handleReviewProposal('reject')}>
                                                {t('card.reject')}
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </section>
                        </>
                    ) : (
                        <>
                            {/* [Track 4.263] Group competition participation CTA for athletes */}
                            {isGroupComp && athleteScopeId ? (
                                <section className={styles.groupParticipationSection}>
                                    <button
                                        type="button"
                                        className={iAmParticipant ? styles.dangerBtn : styles.primaryBtn}
                                        onClick={() => void handleToggleGroupParticipation()}
                                        disabled={isSavingParticipant}
                                    >
                                        {iAmParticipant
                                            ? <><UserMinus size={16} /> {t('actions.leaveGroup')}</>
                                            : <><UserPlus size={16} /> {t('actions.joinGroup')}</>
                                        }
                                    </button>
                                </section>
                            ) : null}

                            <form className={styles.form} onSubmit={handleSubmitProposal}>
                                <h4 className={styles.sectionTitle}>{t('card.proposalSection')}</h4>
                                <select value={proposalKind} onChange={(event) => setProposalKind(event.target.value as ProposalKind)} className={styles.input}>
                                    {PROPOSAL_KIND_VALUES.map((value) => (
                                        <option key={value} value={value}>{t(`proposalKinds.${value}`)}</option>
                                    ))}
                                </select>

                                {proposalKind === 'result' ? (
                                    <input
                                        value={proposalResult}
                                        onChange={(event) => setProposalResult(event.target.value)}
                                        className={styles.input}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="30"
                                        placeholder={t('card.fields.proposedResult')}
                                    />
                                ) : null}

                                {proposalKind === 'metadata' ? (
                                    <div className={styles.grid}>
                                        <select value={proposalMetadataStatus} onChange={(event) => setProposalMetadataStatus(event.target.value as CompetitionStatus | '')} className={styles.input}>
                                            <option value="">{t('card.fields.statusOptional')}</option>
                                            {STATUS_VALUES.map((value) => (
                                                <option key={value} value={value}>{t(`status.${value}`)}</option>
                                            ))}
                                        </select>
                                        <select value={proposalMetadataDiscipline} onChange={(event) => setProposalMetadataDiscipline(event.target.value as Discipline | '')} className={styles.input}>
                                            <option value="">{t('filters.allDisciplines')}</option>
                                            {DISCIPLINE_VALUES.map((value) => (
                                                <option key={value} value={value}>
                                                    {tCommon(`dashboard.newAthlete.discipline${value === 'high_jump' ? 'HighJump' : value === 'long_jump' ? 'LongJump' : 'TripleJump'}`)}
                                                </option>
                                            ))}
                                        </select>
                                        <select value={proposalMetadataSeasonType} onChange={(event) => setProposalMetadataSeasonType(event.target.value as SeasonType | '')} className={styles.input}>
                                            <option value="">{t('filters.allSeasonTypes')}</option>
                                            {SEASON_TYPE_VALUES.map((value) => (
                                                <option key={value} value={value}>{value === 'indoor' ? tCommon('training.seasonIndoor') : tCommon('training.seasonOutdoor')}</option>
                                            ))}
                                        </select>
                                        <input value={proposalMetadataLocation} onChange={(event) => setProposalMetadataLocation(event.target.value)} className={styles.input} placeholder={t('card.fields.location')} />
                                        <input value={proposalMetadataWebsite} onChange={(event) => setProposalMetadataWebsite(event.target.value)} className={styles.input} placeholder={t('card.fields.website')} />
                                    </div>
                                ) : null}

                                {proposalKind === 'pre_event_info' ? (
                                    <div className={styles.grid}>
                                        <select value={proposalPreEventStatus} onChange={(event) => setProposalPreEventStatus(event.target.value as ParticipantStatus | '')} className={styles.input}>
                                            <option value="">{t('card.fields.participantStatusOptional')}</option>
                                            {PARTICIPANT_STATUS_VALUES.map((value) => (
                                                <option key={value} value={value}>{value}</option>
                                            ))}
                                        </select>
                                        <input value={proposalPreEventLane} onChange={(event) => setProposalPreEventLane(event.target.value)} className={styles.input} placeholder={t('card.fields.lane')} />
                                        <input value={proposalPreEventBib} onChange={(event) => setProposalPreEventBib(event.target.value)} className={styles.input} placeholder={t('card.fields.bib')} />
                                    </div>
                                ) : null}

                                {proposalKind === 'media_meta' ? (
                                    <div className={styles.grid}>
                                        <select value={proposalMediaKind} onChange={(event) => setProposalMediaKind(event.target.value)} className={styles.input}>
                                            <option value="">{t('card.fields.mediaKind')}</option>
                                            {MEDIA_KIND_VALUES.map((value) => (
                                                <option key={value} value={value}>{value}</option>
                                            ))}
                                        </select>
                                        <select value={proposalMediaVisibility} onChange={(event) => setProposalMediaVisibility(event.target.value)} className={styles.input}>
                                            <option value="">{t('card.fields.mediaVisibility')}</option>
                                            {MEDIA_VISIBILITY_VALUES.map((value) => (
                                                <option key={value} value={value}>{value}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : null}

                                {(proposalKind === 'metadata' || proposalKind === 'pre_event_info' || proposalKind === 'media_meta') ? (
                                    <textarea
                                        value={proposalKind === 'metadata' ? proposalMetadataNotes : proposalKind === 'pre_event_info' ? proposalPreEventNote : proposalMediaCaption}
                                        onChange={(event) => {
                                            if (proposalKind === 'metadata') setProposalMetadataNotes(event.target.value);
                                            if (proposalKind === 'pre_event_info') setProposalPreEventNote(event.target.value);
                                            if (proposalKind === 'media_meta') setProposalMediaCaption(event.target.value);
                                        }}
                                        className={styles.textarea}
                                        rows={3}
                                        placeholder={proposalKind === 'media_meta' ? t('card.fields.mediaCaption') : t('card.fields.notes')}
                                    />
                                ) : null}

                                <textarea
                                    value={proposalComment}
                                    onChange={(event) => setProposalComment(event.target.value)}
                                    className={styles.textarea}
                                    rows={2}
                                    placeholder={t('card.fields.athleteComment')}
                                />

                                <button type="submit" className={styles.primaryBtn} disabled={isSubmittingProposal || !athleteScopeId}>
                                    {isSubmittingProposal ? t('card.submittingProposal') : t('card.submitProposal')}
                                </button>
                            </form>
                        </>
                    )}

                    <section className={styles.mediaSection}>
                        <h4 className={styles.sectionTitle}>{t('card.mediaSection')}</h4>
                        {!isCoach ? (
                            <form className={styles.form} onSubmit={handleUploadMedia}>
                                <div className={styles.grid}>
                                    <input
                                        key={uploadFileInputKey}
                                        type="file"
                                        className={styles.input}
                                        onChange={(event) => setUploadMediaFile(event.target.files?.[0] ?? null)}
                                        accept="image/*,video/*,application/pdf"
                                        aria-label={t('card.fields.mediaFile')}
                                    />
                                    <select
                                        value={uploadMediaKind}
                                        onChange={(event) => setUploadMediaKind(event.target.value)}
                                        className={styles.input}
                                    >
                                        <option value="">{t('card.fields.mediaKind')}</option>
                                        {MEDIA_KIND_VALUES.map((value) => (
                                            <option key={value} value={value}>{value}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={uploadMediaVisibility}
                                        onChange={(event) => setUploadMediaVisibility(event.target.value as MediaVisibility)}
                                        className={styles.input}
                                    >
                                        {MEDIA_VISIBILITY_VALUES.map((value) => (
                                            <option key={value} value={value}>{value}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={uploadSubjectAthleteId}
                                        onChange={(event) => setUploadSubjectAthleteId(event.target.value)}
                                        className={styles.input}
                                    >
                                        <option value="">{t('card.fields.subjectAthlete')}</option>
                                        {participantOptions.map((participant) => (
                                            <option key={participant.id} value={participant.id}>
                                                {participant.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <textarea
                                    value={uploadMediaCaption}
                                    onChange={(event) => setUploadMediaCaption(event.target.value)}
                                    className={styles.textarea}
                                    rows={2}
                                    placeholder={t('card.fields.mediaCaption')}
                                />
                                <button type="submit" className={styles.primaryBtn} disabled={isUploadingMedia || !uploadMediaFile}>
                                    {isUploadingMedia ? t('card.uploadingMedia') : t('card.uploadMedia')}
                                </button>
                            </form>
                        ) : null}

                        {visibleMediaItems.length === 0 ? (
                            <p className={styles.info}>{t('card.noMedia')}</p>
                        ) : (
                            <ul className={styles.mediaList}>
                                {visibleMediaItems.map((item) => {
                                    const isEditing = editingMediaId === item.id;
                                    const uploaderName = (item.expand?.uploader_athlete_id as { name?: string } | undefined)?.name ?? t('fallbacks.unknownAthlete');
                                    const subjectName = (item.expand?.subject_athlete_id as { name?: string } | undefined)?.name;
                                    return (
                                        <li key={item.id} className={styles.mediaItem}>
                                            <div className={styles.mediaHeader}>
                                                <a
                                                    className={styles.mediaLink}
                                                    href={pb.files.getURL(item, item.file)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    {item.file}
                                                </a>
                                                <span className={styles.mediaMeta}>
                                                    {item.kind ?? t('card.fields.mediaKind')} · {item.visibility} · {item.moderation_status}
                                                </span>
                                                <span className={styles.mediaMeta}>
                                                    {t('card.uploadedBy')}: {uploaderName}
                                                    {subjectName ? ` · ${t('card.subjectAthlete')}: ${subjectName}` : ''}
                                                </span>
                                            </div>

                                            {isEditing ? (
                                                <div className={styles.mediaEditPanel}>
                                                    <div className={styles.grid}>
                                                        <select
                                                            value={mediaEditKind}
                                                            onChange={(event) => setMediaEditKind(event.target.value)}
                                                            className={styles.input}
                                                        >
                                                            <option value="">{t('card.fields.mediaKind')}</option>
                                                            {MEDIA_KIND_VALUES.map((value) => (
                                                                <option key={value} value={value}>{value}</option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            value={mediaEditVisibility}
                                                            onChange={(event) => setMediaEditVisibility(event.target.value as MediaVisibility)}
                                                            className={styles.input}
                                                        >
                                                            {MEDIA_VISIBILITY_VALUES.map((value) => (
                                                                <option key={value} value={value}>{value}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <textarea
                                                        value={mediaEditCaption}
                                                        onChange={(event) => setMediaEditCaption(event.target.value)}
                                                        className={styles.textarea}
                                                        rows={2}
                                                        placeholder={t('card.fields.mediaCaption')}
                                                    />
                                                    <div className={styles.mediaActions}>
                                                        <button
                                                            type="button"
                                                            className={styles.primaryBtn}
                                                            onClick={() => void handleSaveMediaMeta(item.id)}
                                                            disabled={isSavingMediaMeta}
                                                        >
                                                            {isSavingMediaMeta ? t('card.savingMediaMeta') : t('card.saveMediaMeta')}
                                                        </button>
                                                        <button type="button" className={styles.secondaryBtn} onClick={resetMediaEdit}>
                                                            {t('card.cancelMediaMeta')}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {item.caption ? <p className={styles.mediaMeta}>{item.caption}</p> : null}
                                                    {item.moderation_reason ? <p className={styles.mediaMeta}>{item.moderation_reason}</p> : null}
                                                    {canEditMedia(item) ? (
                                                        <button type="button" className={styles.secondaryBtn} onClick={() => startEditingMedia(item)}>
                                                            {t('card.editMediaMeta')}
                                                        </button>
                                                    ) : null}
                                                    {isCoach ? (
                                                        <div className={styles.mediaEditPanel}>
                                                            <textarea
                                                                value={moderationReasonByMediaId[item.id] ?? ''}
                                                                onChange={(event) => setModerationReasonByMediaId((prev) => ({
                                                                    ...prev,
                                                                    [item.id]: event.target.value,
                                                                }))}
                                                                className={styles.textarea}
                                                                rows={2}
                                                                placeholder={t('card.fields.moderationReason')}
                                                            />
                                                            <div className={styles.mediaActions}>
                                                                {item.moderation_status === 'visible' ? (
                                                                    <button
                                                                        type="button"
                                                                        className={styles.dangerBtn}
                                                                        onClick={() => void handleModerateMedia(item, 'hidden')}
                                                                        disabled={isModeratingMediaId === item.id}
                                                                    >
                                                                        {isModeratingMediaId === item.id
                                                                            ? t('card.hidingMedia')
                                                                            : t('card.hideMedia')}
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        className={styles.secondaryBtn}
                                                                        onClick={() => void handleModerateMedia(item, 'visible')}
                                                                        disabled={isModeratingMediaId === item.id}
                                                                    >
                                                                        {isModeratingMediaId === item.id
                                                                            ? t('card.unhidingMedia')
                                                                            : t('card.unhideMedia')}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                </section>
            ) : null}
        </article>
    );
}
