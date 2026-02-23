
import pb from '../client';
import { CheckinData } from '@/lib/readiness/types';
import { DailyCheckinsRecord } from '../types';

/**
 * Get the daily check-in for a specific athlete and date.
 * Default date is today (local time).
 */
export async function getTodayCheckin(athleteId: string): Promise<DailyCheckinsRecord | null> {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
        const record = await pb.collection('daily_checkins').getFirstListItem<DailyCheckinsRecord>(
            `athlete_id = "${athleteId}" && date >= "${date} 00:00:00"`,
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

    try {
        const athletes = await pb.collection('athletes').getList(1, 1, {
            filter: `user_id = "${user.id}"`,
            requestKey: null,
        });

        if (athletes.items.length > 0) {
            return athletes.items[0].id;
        }

        throw new Error(
            `No athlete record linked to user ${user.id}. ` +
            'Contact your coach to set up your athlete profile.'
        );
    } catch (e: unknown) {
        const pbErr = e as { status?: number; message?: string; response?: { data?: unknown }; data?: unknown };
        console.error('Error getting self athlete:', pbErr?.status, pbErr?.message);
        console.error('PB response:', pbErr?.response?.data || pbErr?.data || 'no response data');
        throw e;
    }
}
