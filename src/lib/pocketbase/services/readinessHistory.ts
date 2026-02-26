/**
 * Readiness History service
 * Fetches daily_checkins for an athlete to build a heatmap of readiness scores.
 */
import pb from '@/lib/pocketbase/client';
import { calculateReadiness } from '@/lib/readiness/calculator';
import { toLocalISODate } from '@/lib/utils/dateHelpers';

export interface ReadinessDay {
    date: string;       // YYYY-MM-DD
    score: number;      // 0-100
    // Raw checkin fields (optional — missing when no checkin for that day)
    sleepHours?: number;
    sleepQuality?: number;
    mood?: number;
    painLevel?: number;
}

/**
 * Get readiness history for N weeks back.
 * Uses calculateReadiness from readiness/calculator with CheckinData format.
 */
export async function getReadinessHistory(
    athleteId: string,
    weeks: number = 12,
): Promise<ReadinessDay[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);
    const startStr = startDate.toISOString().split('T')[0];

    const checkins = await pb.collection('daily_checkins').getFullList({
        filter: pb.filter('athlete_id = {:athleteId} && date >= {:startStr}', { athleteId, startStr }),
        sort: 'date',
        fields: 'date,sleep_quality,sleep_hours,mood,pain_level',
    });

    return checkins.map((c) => ({
        // PocketBase stores dates as "YYYY-MM-DD HH:MM:SS.sssZ" (space, not T),
        // so split('T') fails. Slice first 10 chars gives "YYYY-MM-DD" reliably.
        date: typeof c.date === 'string' ? c.date.slice(0, 10) : String(c.date),
        score: calculateReadiness({
            sleepDuration: (c.sleep_hours as number) || 7, // default 7h if missing
            sleepQuality: (c.sleep_quality as number) || 3,
            soreness: (c.pain_level as number) || 0,
            mood: (c.mood as number) || 3,
        }),
        sleepHours: c.sleep_hours as number | undefined,
        sleepQuality: c.sleep_quality as number | undefined,
        mood: c.mood as number | undefined,
        painLevel: c.pain_level as number | undefined,
    }));
}

/**
 * Get color level for a readiness score.
 */
export function readinessColor(score: number): 'green' | 'yellow' | 'red' | 'gray' {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    if (score > 0) return 'red';
    return 'gray';
}

// ─── Group Readiness ──────────────────────────────────────────────

export interface AthleteReadiness {
    athleteId: string;
    score: number;
    color: 'green' | 'yellow' | 'red' | 'gray';
}

/**
 * Get latest readiness score for a list of athletes.
 * PB has no GROUP BY — uses Promise.all (1 request per athlete), fetches today's checkin only.
 * Returns score=0 / color='gray' if no checkin found today.
 */
export async function getLatestReadinessForGroup(
    athleteIds: string[]
): Promise<AthleteReadiness[]> {
    const today = toLocalISODate();
    return Promise.all(
        athleteIds.map(async (athleteId) => {
            try {
                const checkin = await pb.collection('daily_checkins').getFirstListItem(
                    pb.filter(
                        'athlete_id = {:aid} && date >= {:today}',
                        { aid: athleteId, today }
                    ),
                    { fields: 'sleep_quality,sleep_hours,mood,pain_level' }
                );
                const score = calculateReadiness({
                    sleepDuration: (checkin.sleep_hours as number) || 7,
                    sleepQuality: (checkin.sleep_quality as number) || 3,
                    soreness: (checkin.pain_level as number) || 0,
                    mood: (checkin.mood as number) || 3,
                });
                return { athleteId, score, color: readinessColor(score) };
            } catch {
                /* expected: 404 — no checkin for this athlete */
                return { athleteId, score: 0, color: 'gray' as const };
            }
        })
    );
}
