/**
 * PocketBase Service: Groups + Invite Codes
 * Manages group membership and 6-char invite codes.
 * Invite code fields live directly on the Groups collection:
 *   - invite_code: string (6 chars, unique)
 *   - invite_expires: string (ISO datetime, +7 days from generation)
 */

import pb from '../client';
import { Collections } from '../collections';
import { getDisplayName } from '@/lib/utils/nameHelpers';
import type { GroupsRecord } from '../types';
import type { RecordModel } from 'pocketbase';

// ─── Types ────────────────────────────────────────────────────────

export type GroupWithRelations = GroupsRecord & RecordModel;

// ─── Group CRUD ───────────────────────────────────────────────────

/** List all groups for the current coach */
export async function listMyGroups(): Promise<GroupWithRelations[]> {
    const user = pb.authStore.record;
    if (!user) throw new Error('Not authenticated');
    try {
        return await pb.collection(Collections.GROUPS).getFullList<GroupWithRelations>({
            filter: pb.filter('coach_id = {:cid} && deleted_at = ""', { cid: user.id }),
        });
    } catch {
        // New users have no groups — return empty list gracefully
        return [];
    }
}


/** Get a single group by ID */
export async function getGroup(groupId: string): Promise<GroupWithRelations> {
    return pb.collection(Collections.GROUPS).getOne<GroupWithRelations>(groupId);
}

/** Create a new group */
export async function createGroup(name: string, timezone?: string): Promise<GroupWithRelations> {
    const user = pb.authStore.record;
    if (!user) throw new Error('Not authenticated');
    return pb.collection(Collections.GROUPS).create<GroupWithRelations>({
        coach_id: user.id,
        name,
        timezone: timezone ?? 'UTC',
    });
}

// ─── Invite Codes ────────────────────────────────────────────────

/**
 * Generate a random 6-character uppercase alphanumeric invite code.
 * Expires in 7 days.
 */
function randomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous: 0/O, 1/I
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

/**
 * Generate a new invite code for a group.
 * Stores it on the group record with 7-day expiry.
 */
export async function generateInviteCode(groupId: string): Promise<{ code: string; expires: string }> {
    const code = randomCode();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await pb.collection(Collections.GROUPS).update(groupId, {
        invite_code: code,
        invite_expires: expires,
    });

    return { code, expires };
}

/**
 * Join a group using an invite code.
 * Returns the group if code is valid and not expired.
 * Throws if code is invalid or expired.
 * Auto-creates athlete record if the user doesn't have one for this coach.
 */
export async function joinByInviteCode(code: string): Promise<GroupWithRelations> {
    // Sanitize code: strip any quote chars to prevent PB filter injection
    const safeCode = code.toUpperCase().replace(/"/g, '');
    const now = new Date().toISOString();
    const groups = await pb.collection(Collections.GROUPS).getList<GroupWithRelations>(1, 1, {
        // Fix: also filter out soft-deleted groups — they must not accept invites
        filter: pb.filter('invite_code = {:code} && invite_expires > {:now} && deleted_at = ""', { code: safeCode, now }),
    });

    if (groups.items.length === 0) {
        throw new Error('invite.invalidOrExpired');
    }

    const group = groups.items[0];

    // Only athletes can join groups — coaches manage groups, not join them
    const user = pb.authStore.record;
    if (!user) throw new Error('Not authenticated');
    if (user.role === 'coach') {
        throw new Error('invite.coachCannotJoin');
    }

    // Find or create athlete record linked to this user and align it with the invite coach.
    let athleteId: string;
    const byCoach = await pb.collection(Collections.ATHLETES).getFullList<RecordModel>({
        filter: pb.filter('user_id = {:uid} && coach_id = {:cid} && deleted_at = ""', {
            uid: user.id,
            cid: group.coach_id,
        }),
        requestKey: null,
    });

    if (byCoach.length > 0) {
        athleteId = byCoach[0].id;
    } else {
        const selfProfiles = await pb.collection(Collections.ATHLETES).getFullList<RecordModel>({
            filter: pb.filter('user_id = {:uid} && deleted_at = ""', {
                uid: user.id,
            }),
            requestKey: null,
        });

        if (selfProfiles.length > 0) {
            const selfProfile = selfProfiles[0];
            const linkedCoachId = String((selfProfile as Record<string, unknown>).coach_id ?? '');

            if (linkedCoachId !== group.coach_id) {
                await pb.collection(Collections.ATHLETES).update(selfProfile.id, {
                    coach_id: group.coach_id,
                });
            }
            athleteId = selfProfile.id;
        } else {
            // No athlete record yet — auto-create one
            const newAthlete = await pb.collection(Collections.ATHLETES).create({
                name: getDisplayName(user as unknown as import('@/lib/utils/nameHelpers').HasName) || user.email?.split('@')[0] || 'Athlete',
                coach_id: group.coach_id,
                user_id: user.id,
            });
            athleteId = newAthlete.id;
        }
    }

    // Add athlete as group member — differentiate alreadyMember from other errors
    try {
        await pb.collection(Collections.GROUP_MEMBERS).create({
            group_id: group.id,
            athlete_id: athleteId,
        });
    } catch (err: unknown) {
        // Fix: re-throw as specific error so /join page can show correct UI feedback
        const message = err instanceof Error ? err.message : String(err);
        if (message.toLowerCase().includes('unique')) {
            throw new Error('invite.alreadyMember');
        }
        throw err; // Re-throw unexpected errors
    }

    // Notify: athlete gets confirmation, coach gets alert (fire-and-forget)
    const currentUserId = user.id;
    const coachId = group.coach_id;
    const athleteName = getDisplayName(user as unknown as import('@/lib/utils/nameHelpers').HasName) || user.email?.split('@')[0] || 'Athlete';
    void (async () => {
        try {
            const { sendNotification } = await import('./notifications');
            // Notify the athlete who just joined
            await sendNotification({
                userId: currentUserId,
                type: 'system',
                messageKey: 'joinedGroup',
                messageParams: { groupName: group.name },
            });
            // Notify the coach about the new member
            await sendNotification({
                userId: coachId,
                type: 'invite_accepted',
                messageKey: 'inviteAccepted',
                messageParams: { athleteName, groupName: group.name },
            });
        } catch {
            /* non-critical: notification failed */
        }
    })();

    return group;
}

/**
 * Get current invite code for a group (null if none/expired).
 */
export async function getActiveInviteCode(
    groupId: string
): Promise<{ code: string; expires: string } | null> {
    const group = await getGroup(groupId);
    if (!group.invite_code || !group.invite_expires) return null;

    if (new Date(group.invite_expires) < new Date()) return null; // expired

    return { code: group.invite_code, expires: group.invite_expires };
}

// ─── Group Members ────────────────────────────────────────────────

export interface GroupMember extends RecordModel {
    group_id: string;
    athlete_id: string;
    expand?: {
        athlete_id?: RecordModel & {
            name: string;
            user_id?: string;   // FK → users (needed for notifications in Track 4.23+)
            birth_date?: string;
            height_cm?: number;
        };
    };
}

/** List all members of a group with athlete info */
export async function listGroupMembers(groupId: string): Promise<GroupMember[]> {
    return pb.collection(Collections.GROUP_MEMBERS).getFullList<GroupMember>({
        filter: pb.filter('group_id = {:gid}', { gid: groupId }),
        expand: 'athlete_id',

    });
}

/**
 * Get all group IDs that an athlete belongs to.
 * Used by getPublishedPlanForToday to resolve group-assigned plans.
 */
export async function getMyGroupIds(athleteId: string): Promise<string[]> {
    try {
        const members = await pb.collection(Collections.GROUP_MEMBERS).getFullList<RecordModel>({
            filter: pb.filter('athlete_id = {:aid}', { aid: athleteId }),
            fields: 'group_id',
        });
        return members.map((m) => (m as RecordModel & { group_id: string }).group_id).filter(Boolean);
    } catch {
        /* expected: 404 or no memberships */
        return [];
    }
}

/** Remove an athlete from a group */
export async function removeGroupMember(memberId: string): Promise<void> {
    await pb.collection(Collections.GROUP_MEMBERS).delete(memberId);
}

/** Update a group (e.g. rename) */
export async function updateGroup(
    groupId: string,
    data: Partial<Pick<GroupWithRelations, 'name'>>
): Promise<GroupWithRelations> {
    return pb.collection(Collections.GROUPS).update<GroupWithRelations>(groupId, data);
}

/** Soft-delete a group (set deleted_at) */
export async function deleteGroup(groupId: string): Promise<void> {
    await pb.collection(Collections.GROUPS).update(groupId, {
        deleted_at: new Date().toISOString(),
    });
}

// ─── Group Member Management ──────────────────────────────────────

/**
 * Move an athlete from one group to another (or add to an additional group).
 * Strategy: CREATE new membership first, THEN DELETE old (create-first for network safety).
 * Guard: both groups must belong to the current coach.
 *
 * @param keepInOriginal - if true, athlete stays in the original group ("Add to" mode)
 */
export async function moveAthleteToGroup(
    athleteId: string,
    fromGroupId: string,
    toGroupId: string,
    keepInOriginal = false
): Promise<void> {
    const user = pb.authStore.record;
    if (!user) throw new Error('Not authenticated');

    // Guard: both groups must belong to the current coach (prevents DevTools manipulation)
    const [fromGroup, toGroup] = await Promise.all([
        getGroup(fromGroupId),
        getGroup(toGroupId),
    ]);
    // Also guard against soft-deleted groups
    if (fromGroup.deleted_at || toGroup.deleted_at) {
        throw new Error('groups.groupDeleted');
    }
    if (fromGroup.coach_id !== user.id || toGroup.coach_id !== user.id) {
        throw new Error('groups.unauthorized');
    }

    // Step 1: Create new membership first (create-first strategy)
    // If network fails after this, athlete is in 2 groups — better than 0
    try {
        await pb.collection(Collections.GROUP_MEMBERS).create({
            group_id: toGroupId,
            athlete_id: athleteId,
        });
    } catch {
        /* unique constraint → already a member of target group → OK, continue */
    }

    // Step 2: Remove from original group (only if not "add to" mode)
    if (!keepInOriginal) {
        const oldMember = await pb.collection(Collections.GROUP_MEMBERS)
            .getFirstListItem(pb.filter(
                'group_id = {:gid} && athlete_id = {:aid}',
                { gid: fromGroupId, aid: athleteId }
            ));
        await pb.collection(Collections.GROUP_MEMBERS).delete(oldMember.id);
    }

    // Notify athlete about group move (fire-and-forget)
    if (!keepInOriginal) {
        void (async () => {
            try {
                const athlete = await pb.collection(Collections.ATHLETES).getOne(athleteId);
                const userId = (athlete as unknown as { user_id?: string }).user_id ?? '';
                if (userId) {
                    const { sendNotification } = await import('./notifications');
                    await sendNotification({
                        userId,
                        type: 'system',
                        messageKey: 'movedToGroup',
                        messageParams: { groupName: toGroup.name },
                    });
                }
            } catch {
                /* non-critical: notification failed */
            }
        })();
    }
}

/**
 * Check if a group has at least one active plan assignment.
 * Used to warn coaches before moving athletes between groups.
 */
export async function hasActiveGroupPlan(groupId: string): Promise<boolean> {
    try {
        const result = await pb.collection(Collections.PLAN_ASSIGNMENTS).getList(1, 1, {
            filter: pb.filter('group_id = {:gid} && status = "active"', { gid: groupId }),
        });
        return result.totalItems > 0;
    } catch {
        return false;
    }
}
