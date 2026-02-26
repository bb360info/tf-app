/**
 * PocketBase Service: Personal Records
 * Manages athlete PRs with is_current flip logic (update → create pattern).
 */

import pb from '../client';
import { Collections } from '../collections';
import type { PersonalRecordsRecord, Discipline, SeasonType, PRSource } from '../types';
import type { RecordModel } from 'pocketbase';

// ─── Types ────────────────────────────────────────────────────────

export type PersonalRecord = PersonalRecordsRecord & RecordModel;

// ─── List ─────────────────────────────────────────────────────────

/** List all PRs for an athlete, optionally filtered by discipline */
export async function listPersonalRecords(
    athleteId: string,
    discipline?: Discipline
): Promise<PersonalRecord[]> {
    const filter = discipline
        ? pb.filter('athlete_id = {:aid} && discipline = {:disc}', { aid: athleteId, disc: discipline })
        : pb.filter('athlete_id = {:aid}', { aid: athleteId });
    return pb.collection(Collections.PERSONAL_RECORDS).getFullList<PersonalRecord>({
        filter,
        sort: '-date,-created',
    });
}

/** Get all current PRs (is_current = true) for an athlete */
export async function getCurrentPRs(athleteId: string): Promise<PersonalRecord[]> {
    return pb.collection(Collections.PERSONAL_RECORDS).getFullList<PersonalRecord>({
        filter: pb.filter('athlete_id = {:aid} && is_current = true', { aid: athleteId }),
        sort: 'discipline,season_type',
    });
}

// ─── Add PR (is_current flip) ──────────────────────────────────────

export interface AddPRInput {
    athleteId: string;
    discipline: Discipline;
    season_type: SeasonType;
    result: number;             // meters (float)
    source: PRSource;
    date?: string;              // ISO date (YYYY-MM-DD), defaults to today
    competition_name?: string;
    notes?: string;
}

/**
 * Add a new Personal Record using update → create pattern:
 *   1. Find existing is_current = true for (discipline + season_type)
 *   2. Set it to is_current = false
 *   3. Create new record with is_current = true
 *
 * Minimizes race condition window without DB transactions.
 */
export async function addPersonalRecord(input: AddPRInput): Promise<PersonalRecord> {
    // Step 1 + 2: demote current PR (ignore 404 — first record for this slot)
    try {
        const existing = await pb
            .collection(Collections.PERSONAL_RECORDS)
            .getFirstListItem<PersonalRecord>(
                pb.filter(
                    'athlete_id = {:aid} && discipline = {:disc} && season_type = {:st} && is_current = true',
                    { aid: input.athleteId, disc: input.discipline, st: input.season_type }
                )
            );
        await pb.collection(Collections.PERSONAL_RECORDS).update(existing.id, { is_current: false });
    } catch {
        // 404 = no existing PR for this slot — continue to create
    }

    // Step 3: create new current PR
    const today = new Date().toISOString().substring(0, 10);
    return pb.collection(Collections.PERSONAL_RECORDS).create<PersonalRecord>({
        athlete_id: input.athleteId,
        discipline: input.discipline,
        season_type: input.season_type,
        result: input.result,
        source: input.source,
        date: input.date ?? today,
        competition_name: input.competition_name ?? '',
        notes: input.notes ?? '',
        is_current: true,
    });
}

// ─── Update / Delete ───────────────────────────────────────────────

/**
 * Update PR metadata only (notes, competition_name, date).
 * To change the result — delete and re-add via addPersonalRecord().
 */
export async function updatePersonalRecord(
    id: string,
    data: Partial<Pick<PersonalRecordsRecord, 'notes' | 'competition_name' | 'date'>>
): Promise<PersonalRecord> {
    return pb.collection(Collections.PERSONAL_RECORDS).update<PersonalRecord>(id, data);
}

/**
 * Delete a personal record.
 * If it was is_current, no auto-promotion of previous record (YAGNI).
 */
export async function deletePersonalRecord(id: string): Promise<void> {
    await pb.collection(Collections.PERSONAL_RECORDS).delete(id);
}
