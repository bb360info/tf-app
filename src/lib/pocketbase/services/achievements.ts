/**
 * achievements.ts
 * Service for athlete gamification badges.
 * Collections: achievements, daily_checkins, test_results, training_logs, competitions
 *
 * Track 4.6 refactor:
 * - 13 achievement types (was 5)
 * - Progress tracking (AchievementProgress)
 * - checkAndGrant returns CheckAndGrantResult (fixes race condition)
 * - computeStreak is timezone-safe and exported
 */

import pb from '@/lib/pocketbase/client';
import type { AchievementsRecord, AchievementType, TestType } from '@/lib/pocketbase/types';

// ── Types ─────────────────────────────────────────────────────────

export type AchievementCategory = 'streak' | 'training' | 'testing' | 'compete';

export interface AchievementProgress {
    type: AchievementType;
    current: number;
    target: number;
    percent: number; // 0-100
    isComplete: boolean;
}

export interface CheckAndGrantResult {
    allEarned: AchievementsRecord[];
    newlyEarned: AchievementsRecord[];
    progress: Map<AchievementType, AchievementProgress>;
}

// ── Meta: icon + category + trilingual labels for each type ───────

export interface AchievementMeta {
    type: AchievementType;
    category: AchievementCategory;
    target: number;
    celebrationType: 'toast' | 'fullscreen';
    icon: 'Flame' | 'Zap' | 'Trophy' | 'Star' | 'Award' | 'Target' | 'Dumbbell' | 'Medal' | 'Flag';
    labels: { ru: string; en: string; cn: string };
    descriptions: { ru: string; en: string; cn: string };
}

export const ACHIEVEMENT_META: Record<AchievementType, AchievementMeta> = {
    // ── Streak ────────────────────────────────────────────────────
    streak_3d: {
        type: 'streak_3d',
        category: 'streak',
        target: 3,
        celebrationType: 'toast',
        icon: 'Flame',
        labels: { ru: '3 дня подряд', en: '3-Day Streak', cn: '连续3天' },
        descriptions: { ru: 'Чек-ин 3 дня без пропусков', en: '3 consecutive daily check-ins', cn: '连续3天每日签到' },
    },
    streak_7d: {
        type: 'streak_7d',
        category: 'streak',
        target: 7,
        celebrationType: 'fullscreen',
        icon: 'Flame',
        labels: { ru: '7 дней подряд', en: '7-Day Streak', cn: '连续7天' },
        descriptions: { ru: 'Чек-ин 7 дней без пропусков', en: '7 consecutive daily check-ins', cn: '连续7天每日签到' },
    },
    streak_30d: {
        type: 'streak_30d',
        category: 'streak',
        target: 30,
        celebrationType: 'fullscreen',
        icon: 'Zap',
        labels: { ru: 'Месяц без пропусков', en: '30-Day Streak', cn: '连续30天' },
        descriptions: { ru: 'Чек-ин 30 дней без пропусков', en: '30 consecutive daily check-ins', cn: '连续30天每日签到' },
    },
    streak_100d: {
        type: 'streak_100d',
        category: 'streak',
        target: 100,
        celebrationType: 'fullscreen',
        icon: 'Zap',
        labels: { ru: '100 дней подряд', en: '100-Day Streak', cn: '连续100天' },
        descriptions: { ru: 'Невероятно! 100 дней чек-инов', en: 'Incredible! 100 days of check-ins', cn: '不可思议！连续100天签到' },
    },

    // ── Training ──────────────────────────────────────────────────
    first_workout: {
        type: 'first_workout',
        category: 'training',
        target: 1,
        celebrationType: 'fullscreen',
        icon: 'Dumbbell',
        labels: { ru: 'Первая тренировка', en: 'First Workout', cn: '第一次训练' },
        descriptions: { ru: 'Завершена первая тренировка', en: 'Completed your first workout', cn: '完成第一次训练' },
    },
    workouts_10: {
        type: 'workouts_10',
        category: 'training',
        target: 10,
        celebrationType: 'toast',
        icon: 'Dumbbell',
        labels: { ru: '10 тренировок', en: '10 Workouts', cn: '10次训练' },
        descriptions: { ru: 'Завершено 10 тренировок', en: '10 workouts completed', cn: '完成10次训练' },
    },
    workouts_50: {
        type: 'workouts_50',
        category: 'training',
        target: 50,
        celebrationType: 'fullscreen',
        icon: 'Target',
        labels: { ru: '50 тренировок', en: '50 Workouts', cn: '50次训练' },
        descriptions: { ru: 'Настоящий труженик! 50 тренировок', en: 'Dedicated! 50 workouts completed', cn: '真正的奋斗者！完成50次训练' },
    },
    workouts_100: {
        type: 'workouts_100',
        category: 'training',
        target: 100,
        celebrationType: 'fullscreen',
        icon: 'Award',
        labels: { ru: '100 тренировок', en: '100 Workouts', cn: '100次训练' },
        descriptions: { ru: 'Легенда! 100 тренировок', en: 'Legend! 100 workouts completed', cn: '传奇！完成100次训练' },
    },

    // ── Testing ───────────────────────────────────────────────────
    first_test: {
        type: 'first_test',
        category: 'testing',
        target: 1,
        celebrationType: 'toast',
        icon: 'Medal',
        labels: { ru: 'Первый тест', en: 'First Test', cn: '第一次测试' },
        descriptions: { ru: 'Выполнен первый тест', en: 'First test result recorded', cn: '完成第一次测试' },
    },
    first_pb: {
        type: 'first_pb',
        category: 'testing',
        target: 1,
        celebrationType: 'toast',
        icon: 'Trophy',
        labels: { ru: 'Личный рекорд!', en: 'Personal Best!', cn: '个人最佳！' },
        descriptions: { ru: 'Первый личный рекорд', en: 'First personal best in any test', cn: '任意测试中的首个个人最佳' },
    },
    pb_5: {
        type: 'pb_5',
        category: 'testing',
        target: 5,
        celebrationType: 'fullscreen',
        icon: 'Trophy',
        labels: { ru: '5 рекордов', en: '5 Personal Bests', cn: '5个个人最佳' },
        descriptions: { ru: 'Побито 5 личных рекордов', en: '5 personal bests achieved', cn: '打破5项个人最佳' },
    },
    all_tests: {
        type: 'all_tests',
        category: 'testing',
        target: 7,
        celebrationType: 'fullscreen',
        icon: 'Star',
        labels: { ru: 'Все тесты', en: 'All Tests', cn: '所有测试' },
        descriptions: { ru: 'Пройдены все 7 типов тестов', en: 'All 7 test types completed', cn: '完成所有7种测试' },
    },

    // ── Compete ───────────────────────────────────────────────────
    first_competition: {
        type: 'first_competition',
        category: 'compete',
        target: 1,
        celebrationType: 'toast',
        icon: 'Flag',
        labels: { ru: 'Первый старт', en: 'First Competition', cn: '第一场比赛' },
        descriptions: { ru: 'Участие в первом соревновании', en: 'First competition recorded', cn: '参加第一场比赛' },
    },
};

/** All 13 achievement types, ordered by category */
export const ALL_ACHIEVEMENT_TYPES: AchievementType[] = Object.keys(ACHIEVEMENT_META) as AchievementType[];

/** Achievement types grouped by category */
export const ACHIEVEMENTS_BY_CATEGORY: Record<AchievementCategory, AchievementType[]> = {
    streak: ['streak_3d', 'streak_7d', 'streak_30d', 'streak_100d'],
    training: ['first_workout', 'workouts_10', 'workouts_50', 'workouts_100'],
    testing: ['first_test', 'first_pb', 'pb_5', 'all_tests'],
    compete: ['first_competition'],
};

// ── Query: list earned achievements ───────────────────────────────

export async function listAchievements(athleteId: string): Promise<AchievementsRecord[]> {
    return pb.collection('achievements').getFullList<AchievementsRecord>({
        filter: `athlete_id = "${athleteId}"`,
        sort: '-earned_at',
    });
}

// ── Progress: compute current/target for all types ────────────────

async function getProgress(
    athleteId: string,
): Promise<Map<AchievementType, AchievementProgress>> {
    // 4 batched API calls instead of N+1
    const [checkins, logsResult, testResults, competitionsResult] = await Promise.all([
        pb.collection('daily_checkins').getFullList<{ date: string }>({
            filter: `athlete_id = "${athleteId}"`,
            fields: 'date',
            sort: '-date',
        }),
        pb.collection('training_logs').getList(1, 1, {
            filter: `athlete_id = "${athleteId}"`,
            skipTotal: false,
        }),
        pb.collection('test_results').getFullList<{ test_type: TestType; value: number; date: string }>({
            filter: `athlete_id = "${athleteId}"`,
            fields: 'test_type,value,date',
            sort: 'test_type,date',
        }),
        pb.collection('competitions').getList(1, 1, {
            skipTotal: false,
        }),
    ]);

    const progress = new Map<AchievementType, AchievementProgress>();

    // ── Streak achievements ───────────────────────────────────────
    const streak = computeStreak(checkins.map((c) => c.date));
    for (const type of ACHIEVEMENTS_BY_CATEGORY.streak) {
        const meta = ACHIEVEMENT_META[type];
        const current = Math.min(streak, meta.target);
        progress.set(type, {
            type,
            current,
            target: meta.target,
            percent: Math.round((current / meta.target) * 100),
            isComplete: streak >= meta.target,
        });
    }

    // ── Training achievements ─────────────────────────────────────
    const workoutCount = logsResult.totalItems;
    for (const type of ACHIEVEMENTS_BY_CATEGORY.training) {
        const meta = ACHIEVEMENT_META[type];
        const current = Math.min(workoutCount, meta.target);
        progress.set(type, {
            type,
            current,
            target: meta.target,
            percent: Math.round((current / meta.target) * 100),
            isComplete: workoutCount >= meta.target,
        });
    }

    // ── Testing achievements ──────────────────────────────────────
    const testCount = testResults.length;
    const uniqueTestTypes = new Set(testResults.map((r) => r.test_type));

    // Count personal bests: for each test_type, find how many times the best was improved
    let pbCount = 0;
    const bestByType = new Map<string, number>();
    // testResults are sorted by test_type,date — iterate in order
    for (const result of testResults) {
        const currentBest = bestByType.get(result.test_type);
        if (currentBest === undefined || result.value > currentBest) {
            if (currentBest !== undefined) {
                pbCount++; // Beat a previous record
            }
            bestByType.set(result.test_type, result.value);
        }
    }
    // The very first result for each type is also a PB
    const totalPbs = pbCount + bestByType.size;

    // first_test
    progress.set('first_test', {
        type: 'first_test',
        current: Math.min(testCount, 1),
        target: 1,
        percent: testCount >= 1 ? 100 : 0,
        isComplete: testCount >= 1,
    });

    // first_pb
    progress.set('first_pb', {
        type: 'first_pb',
        current: Math.min(totalPbs, 1),
        target: 1,
        percent: totalPbs >= 1 ? 100 : 0,
        isComplete: totalPbs >= 1,
    });

    // pb_5
    progress.set('pb_5', {
        type: 'pb_5',
        current: Math.min(totalPbs, 5),
        target: 5,
        percent: Math.round((Math.min(totalPbs, 5) / 5) * 100),
        isComplete: totalPbs >= 5,
    });

    // all_tests (7 test types)
    progress.set('all_tests', {
        type: 'all_tests',
        current: uniqueTestTypes.size,
        target: 7,
        percent: Math.round((uniqueTestTypes.size / 7) * 100),
        isComplete: uniqueTestTypes.size >= 7,
    });

    // ── Compete achievements ──────────────────────────────────────
    const compCount = competitionsResult.totalItems;
    progress.set('first_competition', {
        type: 'first_competition',
        current: Math.min(compCount, 1),
        target: 1,
        percent: compCount >= 1 ? 100 : 0,
        isComplete: compCount >= 1,
    });

    return progress;
}

// ── Check & grant: compute + award badges ─────────────────────────
// Returns CheckAndGrantResult — caller gets allEarned + newlyEarned + progress
// This FIXES the race condition: no separate listAchievements call needed

export async function checkAndGrant(athleteId: string): Promise<CheckAndGrantResult> {
    // 1. Get already-earned achievements
    const existing = await listAchievements(athleteId);
    const earnedSet = new Set(existing.map((a) => a.type));

    // 2. Compute progress for all types
    const progress = await getProgress(athleteId);

    // 3. Determine which new achievements to grant
    const toGrant: AchievementType[] = [];
    for (const [type, prog] of progress) {
        if (prog.isComplete && !earnedSet.has(type)) {
            toGrant.push(type);
        }
    }

    // 4. Grant new achievements
    const newlyEarned: AchievementsRecord[] = [];
    const now = new Date().toISOString();

    for (const type of toGrant) {
        try {
            const meta = ACHIEVEMENT_META[type];
            const record = await pb.collection('achievements').create<AchievementsRecord>({
                athlete_id: athleteId,
                type,
                earned_at: now,
                title: meta.labels.ru,
            });
            newlyEarned.push(record);
        } catch {
            // Ignore duplicate — PocketBase unique constraint
        }
    }

    // 5. Return combined result — allEarned includes newly created records
    return {
        allEarned: [...existing, ...newlyEarned],
        newlyEarned,
        progress,
    };
}

// ── Helper: compute consecutive day streak (timezone-safe) ────────
// FIX: Uses local date parsing instead of new Date(string) which is UTC.
// In UTC+8 (Hong Kong), "2026-02-19" was parsed as UTC midnight,
// which is 2026-02-18 16:00 local — off by one day.

function pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

function toLocalDateStr(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseLocalDate(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d); // Local date constructor — no UTC shift
}

export function computeStreak(sortedDateStrings: string[]): number {
    if (sortedDateStrings.length === 0) return 0;

    const today = new Date();
    const todayStr = toLocalDateStr(today);

    // Extract just the date part (YYYY-MM-DD) and deduplicate
    const dateStrs = [...new Set(sortedDateStrings.map((s) => s.slice(0, 10)))];
    // Sort descending (most recent first)
    dateStrs.sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));

    const mostRecent = dateStrs[0];

    // If most recent checkin isn't today or yesterday, streak is 0
    const mostRecentDate = parseLocalDate(mostRecent);
    const todayDate = parseLocalDate(todayStr);
    const diffFromToday = Math.round((todayDate.getTime() - mostRecentDate.getTime()) / 86400000);
    if (diffFromToday > 1) return 0;

    let streak = 1;
    for (let i = 1; i < dateStrs.length; i++) {
        const curr = parseLocalDate(dateStrs[i - 1]);
        const prev = parseLocalDate(dateStrs[i]);
        const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
        if (diff === 1) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}
