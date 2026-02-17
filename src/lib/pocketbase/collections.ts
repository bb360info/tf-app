/** Collection name constants — prevents typos in API calls */
export const Collections = {
    // Core
    USERS: 'users',
    ATHLETES: 'athletes',
    GROUPS: 'groups',
    GROUP_MEMBERS: 'group_members',
    COACH_PREFERENCES: 'coach_preferences',

    // Training
    SEASONS: 'seasons',
    TRAINING_PHASES: 'training_phases',
    TRAINING_PLANS: 'training_plans',
    PLAN_EXERCISES: 'plan_exercises',
    PLAN_SNAPSHOTS: 'plan_snapshots',

    // Exercises & Logs
    EXERCISES: 'exercises',
    CUSTOM_EXERCISES: 'custom_exercises',
    TRAINING_LOGS: 'training_logs',
    LOG_EXERCISES: 'log_exercises',
    DAILY_CHECKINS: 'daily_checkins',
    TEST_RESULTS: 'test_results',

    // Content & Media
    COMPETITIONS: 'competitions',
    EXERCISE_VIDEOS: 'exercise_videos',
    ACHIEVEMENTS: 'achievements',
    NOTIFICATIONS: 'notifications',
    ERROR_LOGS: 'error_logs',
} as const;

export type CollectionName = (typeof Collections)[keyof typeof Collections];
