/**
 * PocketBase Service: Groups + Invite Codes
 * Manages group membership and 6-char invite codes.
 * Invite code fields live directly on the Groups collection:
 *   - invite_code: string (6 chars, unique)
 *   - invite_expires: string (ISO datetime, +7 days from generation)
 */

import pb from '../client';
import { Collections } from '../collections';
import type { GroupsRecord } from '../types';
import type { RecordModel } from 'pocketbase';

// ─── Types ────────────────────────────────────────────────────────

export type GroupWithRelations = GroupsRecord & RecordModel;

// ─── Group CRUD ───────────────────────────────────────────────────

/** List all groups for the current coach */
export async function listMyGroups(): Promise<GroupWithRelations[]> {
    const user = pb.authStore.model;
    if (!user) throw new Error('Not authenticated');
    try {
        return await pb.collection(Collections.GROUPS).getFullList<GroupWithRelations>({
            filter: `coach_id = "${user.id}" && deleted_at = ""`,
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
    const user = pb.authStore.model;
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
        filter: `invite_code = "${safeCode}" && invite_expires > "${now}"`,
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

    // Find or create athlete record linked to this user & group's coach
    let athleteId: string;
    try {
        // Look for existing athlete record for this user under this group's coach
        const existing = await pb.collection(Collections.ATHLETES).getFirstListItem<RecordModel>(
            pb.filter('user_id = {:uid} && coach_id = {:cid} && deleted_at = ""', {
                uid: user.id,
                cid: group.coach_id,
            })
        );
        athleteId = existing.id;
    } catch {
        // No athlete record yet — auto-create one
        const newAthlete = await pb.collection(Collections.ATHLETES).create({
            name: user.name || user.email?.split('@')[0] || 'Athlete',
            coach_id: group.coach_id,
            user_id: user.id,
        });
        athleteId = newAthlete.id;
    }

    // Add athlete as group member (idempotent — PB unique constraint handles duplicates)
    try {
        await pb.collection(Collections.GROUP_MEMBERS).create({
            group_id: group.id,
            athlete_id: athleteId,
        });
    } catch {
        // Already a member — ignore unique constraint error
    }

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
            birth_date?: string;
            height_cm?: number;
        };
    };
}

/** List all members of a group with athlete info */
export async function listGroupMembers(groupId: string): Promise<GroupMember[]> {
    return pb.collection(Collections.GROUP_MEMBERS).getFullList<GroupMember>({
        filter: `group_id = "${groupId}"`,
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

