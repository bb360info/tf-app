/**
 * PocketBase Service: Coach Preferences
 * UNIQUE: coach_id → one record per coach.
 */

import pb from '../client';
import { Collections } from '../collections';
import type { CoachPreferencesRecord, Language } from '../types';
import type { RecordModel } from 'pocketbase';

export type CoachPrefsRecord = CoachPreferencesRecord & RecordModel;

interface PrefsPayload {
    language?: Language;
    units?: string;
    auto_adaptation_enabled?: boolean;
    onboarding_complete?: boolean;
}

/** Get preferences for current authenticated user */
export async function getMyPreferences(): Promise<CoachPrefsRecord | null> {
    const user = pb.authStore.model;
    if (!user?.id) return null;

    try {
        return await pb
            .collection(Collections.COACH_PREFERENCES)
            .getFirstListItem<CoachPrefsRecord>(`coach_id = "${user.id}"`);
    } catch {
        /* expected: 404 — no preferences record yet */
        return null;
    }
}

/** Create or update preferences for current user */
export async function saveMyPreferences(payload: PrefsPayload): Promise<CoachPrefsRecord> {
    const user = pb.authStore.model;
    if (!user?.id) throw new Error('Not authenticated');

    const existing = await getMyPreferences();

    const data: Record<string, unknown> = {
        coach_id: user.id,
        default_plan_languages: payload.language ? [payload.language] : undefined,
        auto_adaptation_enabled: payload.auto_adaptation_enabled,
    };

    // BUG-3 fix: include onboarding_complete in PB payload
    if (payload.onboarding_complete !== undefined) {
        data.onboarding_complete = payload.onboarding_complete;
    }

    if (existing) {
        return pb.collection(Collections.COACH_PREFERENCES).update<CoachPrefsRecord>(existing.id, data);
    }

    return pb.collection(Collections.COACH_PREFERENCES).create<CoachPrefsRecord>({
        ...data,
        default_plan_languages: payload.language ? [payload.language] : ['ru'],
        auto_adaptation_enabled: payload.auto_adaptation_enabled ?? true,
    });
}

/** Mark onboarding as complete for current user */
export async function completeOnboarding(): Promise<void> {
    await saveMyPreferences({ onboarding_complete: true });
    if (typeof window !== 'undefined') {
        localStorage.setItem('onboarding_done', '1');
    }
}
