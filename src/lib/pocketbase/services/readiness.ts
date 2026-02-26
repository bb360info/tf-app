import pb from '../client';
import { CheckinData } from '@/lib/readiness/types';
import { DailyCheckinsRecord } from '../types';
import type { AthleteWithStats } from '@/lib/pocketbase/services/athletes';
import { getSelfAthleteProfile } from '@/lib/pocketbase/services/athletes';
import { toLocalISODate } from '@/lib/utils/dateHelpers';

/**
 * Get the daily check-in for a specific athlete and date.
 * Default date is today (local time).
 */
export async function getTodayCheckin(athleteId: string): Promise<DailyCheckinsRecord | null> {
    const date = toLocalISODate();

    try {
        const record = await pb.collection('daily_checkins').getFirstListItem<DailyCheckinsRecord>(
            pb.filter('athlete_id = {:aid} && date >= {:dateStart}', { aid: athleteId, dateStart: `${date} 00:00:00` }),
            { requestKey: null } // Disable auto-cancellation
        );
        return record;
    } catch (err: unknown) {
        if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) return null;
        const pbErr = err as { status?: number; message?: string };
        console.error('getTodayCheckin error:', pbErr?.status, pbErr?.message);
        throw err;
    }
}

/**
 * Save or update a daily check-in.
 * Coach can create checkins for their own athletes (dual-role).
 */
export async function saveCheckin(
    athleteId: string,
    data: CheckinData,
    _score: number
): Promise<DailyCheckinsRecord> {
    if (!athleteId) {
        throw new Error('Cannot save checkin: athleteId is required');
    }

    // Check if exists first (to update)
    const existing = await getTodayCheckin(athleteId);

    const payload = {
        athlete_id: athleteId,
        date: existing ? existing.date : new Date().toISOString(),
        sleep_hours: data.sleepDuration,
        sleep_quality: data.sleepQuality,
        pain_level: data.soreness,
        mood: data.mood,
    };

    try {
        if (existing) {
            return await pb.collection('daily_checkins').update(existing.id, payload);
        } else {
            return await pb.collection('daily_checkins').create(payload);
        }
    } catch (err: unknown) {
        const pbErr = err as { status?: number; message?: string; response?: { data?: unknown }; data?: unknown };
        console.error('saveCheckin failed:', pbErr?.status, pbErr?.message);
        console.error('PB response:', pbErr?.response?.data || pbErr?.data || 'no response data');
        console.error('Payload was:', JSON.stringify(payload, null, 2));
        throw err;
    }
}

/**
 * Get the athlete ID linked to the current user.
 * Only works for users with role='athlete' — coaches should NOT call this.
 * Throws a clear error for coach users or when no athlete record is linked.
 */
export async function getSelfAthleteId(): Promise<string> {
    const user = pb.authStore.record;
    if (!user) throw new Error('Not logged in');

    const role = user.role as string | undefined;

    if (role !== 'athlete') {
        throw new Error('getSelfAthleteId is only for athlete-role users, not coaches.');
    }

    const profile = await getSelfAthleteProfile();
    if (profile) {
        return profile.id;
    }

    throw new Error(
        `No active athlete record linked to user ${user.id}. ` +
        'Join by coach invite to create an athlete profile.'
    );
}

/**
 * Filter athletes to find those with a low readiness score (<= 40) today
 * OR with 2+ consecutive missed check-in days.
 * Pure helper function for the Coach Dashboard Team Alerts.
 */
export function getTeamReadinessAlerts(athletes: AthleteWithStats[]): AthleteWithStats[] {
    const today = toLocalISODate();
    const yesterday = toLocalISODate(new Date(Date.now() - 86_400_000));
    return athletes.filter(a => {
        const lowReadiness =
            a.latestCheckinDate === today &&
            a.latestReadiness !== undefined &&
            a.latestReadiness <= 40;
        // 2+ consecutive missed days: last checkin was not today and not yesterday
        const missedStreak =
            !!a.latestCheckinDate &&
            a.latestCheckinDate !== today &&
            a.latestCheckinDate !== yesterday;
        return lowReadiness || missedStreak;
    });
}
