/**
 * TypeScript interfaces for all 21 PocketBase collections.
 * Based on ARCHITECTURE.md schema.
 */

/** Base record fields — PocketBase adds these to every record */
export interface BaseRecord {
    id: string;
    created: string;
    updated: string;
    collectionId: string;
    collectionName: string;
}

/** Soft-deletable record */
export interface SoftDeletable {
    deleted_at?: string;
}

/** Syncable record (for offline sync) */
export interface Syncable {
    sync_id?: string;
}

// ─── Core ──────────────────────────────────────────────────────────

export type UserRole = 'coach' | 'athlete' | 'admin';
export type Language = 'ru' | 'en' | 'cn';
export type UnitSystem = 'metric' | 'imperial';

// ─── Disciplines & Personal Records ────────────────────────────────

export type Discipline = 'triple_jump' | 'long_jump' | 'high_jump';
export type SeasonType = 'indoor' | 'outdoor';
export type PRSource = 'competition' | 'training';

export interface UsersRecord extends BaseRecord {
    email: string;
    name: string;
    first_name?: string;
    last_name?: string;
    role: UserRole;
    language: Language;
    units: UnitSystem;
    avatar?: string;
    emailVisibility: boolean;
    verified: boolean;
}

export type Gender = 'male' | 'female';

export interface AthletesRecord extends BaseRecord, SoftDeletable {
    coach_id: string; // FK → users
    user_id?: string; // FK → users (self-link for athlete role in dual-role model)
    name: string;
    birth_date?: string;
    gender?: Gender;
    height_cm?: number;
    primary_discipline?: Discipline;
    secondary_disciplines?: Discipline[];
}

export interface GroupsRecord extends BaseRecord, SoftDeletable {
    coach_id: string; // FK → users
    name: string;
    timezone?: string;
    invite_code?: string;      // 6 chars, unique
    invite_expires?: string;   // ISO datetime, +7 days from generation
}

export interface GroupMembersRecord extends BaseRecord {
    group_id: string; // FK → groups (UNIQUE: group_id + athlete_id)
    athlete_id: string; // FK → athletes
}

export interface CoachPreferencesRecord extends BaseRecord {
    coach_id: string; // FK → users (UNIQUE: coach_id)
    default_plan_languages: Language[];
    auto_adaptation_enabled?: boolean;
    onboarding_complete?: boolean; // set true when wizard is finished
}

// ─── Training ──────────────────────────────────────────────────────

export interface SeasonsRecord extends BaseRecord, SoftDeletable {
    coach_id: string; // FK → users
    athlete_id?: string; // FK → athletes (individual season assignment)
    group_id?: string; // FK → groups (group season assignment)
    name: string;
    start_date: string;
    end_date: string;
}

export type PhaseType = 'GPP' | 'SPP' | 'PRE_COMP' | 'COMP' | 'TRANSITION';

export interface TrainingPhasesRecord extends BaseRecord, SoftDeletable {
    season_id: string; // FK → seasons
    phase_type: PhaseType;
    order: number;
    start_date?: string;
    end_date?: string;
    focus?: string; // e.g. 'Base building', 'Speed development'
}

export type PlanStatus = 'draft' | 'published' | 'archived';

export interface TrainingPlansRecord extends BaseRecord, SoftDeletable, Syncable {
    phase_id: string; // FK → training_phases
    week_number: number;
    status: PlanStatus;
    notes?: string;
    athlete_id?: string; // FK → athletes (individual override)
    parent_plan_id?: string; // FK → training_plans (base plan reference)
    day_notes?: Record<string, string>; // JSON: { "1": "coach note for Mon", "3": "note for Wed" }
}

export type PlanExerciseBlock = 'warmup' | 'main';

export interface PlanExercisesRecord extends BaseRecord, SoftDeletable {
    plan_id: string; // FK → training_plans
    exercise_id?: string; // FK → exercises (nullable for custom_text items)
    order: number;
    day_of_week?: number;
    session?: number; // 0 = AM (default), 1 = PM
    block?: PlanExerciseBlock; // 'warmup' | 'main' (default: 'main')
    sets?: number;
    reps?: string;
    intensity?: string;
    notes?: string;
    weight?: number;           // kg (for weight unit_type)
    duration?: number;         // seconds (for time unit_type)
    distance?: number;         // meters (for distance unit_type)
    rest_seconds?: number;     // rest between sets
    custom_text_ru?: string;   // free-text warmup step (ru)
    custom_text_en?: string;   // free-text warmup step (en)
    custom_text_cn?: string;   // free-text warmup step (cn)
    source_template_id?: string; // FK → training_templates (nullable)
}

export interface PlanSnapshotsRecord extends BaseRecord {
    plan_id: string; // FK → training_plans
    snapshot: Record<string, unknown>; // JSON
    version: number;
}

// ─── Exercises & Logs ──────────────────────────────────────────────

export type ExerciseLevel = 'beginner' | 'intermediate' | 'advanced';
export type UnitType = 'reps' | 'time' | 'distance' | 'weight';
export type TrainingCategory = 'plyometric' | 'highjump' | 'strength' | 'gpp' | 'speed' | 'flexibility' | 'jump';
export type TrainingQuality = 'speed' | 'power' | 'elasticity' | 'max_strength' | 'technical';

export interface ExercisesRecord extends BaseRecord {
    name_ru: string;
    name_en: string;
    name_cn: string;
    description_ru?: string;
    description_en?: string;
    description_cn?: string;
    level: ExerciseLevel;
    unit_type: UnitType;
    cns_cost: number; // 1-5
    training_category: TrainingCategory;
    training_quality?: TrainingQuality; // For Auto-Fill phase distribution
    phase_suitability: PhaseType[];
    tags?: string[];
    illustration?: string;
    equipment?: string[];  // e.g. ['barbell', 'box']
    muscles?: string[];    // e.g. ['quads', 'glutes']
    dosage?: string;       // e.g. '3×10'
    coach_cues_ru?: string;
    coach_cues_en?: string;
    coach_cues_cn?: string;
}

export type CustomExerciseVisibility = 'personal' | 'pending_review' | 'approved' | 'rejected';

export interface CustomExercisesRecord extends BaseRecord, SoftDeletable {
    coach_id: string; // FK → users
    name_ru?: string;
    name_en?: string;
    name_cn?: string;
    description_ru?: string;
    description_en?: string;
    description_cn?: string;
    level: ExerciseLevel;
    unit_type: UnitType;
    cns_cost: number;
    training_category: TrainingCategory;
    training_quality?: TrainingQuality; // For Auto-Fill phase distribution
    phase_suitability: PhaseType[];
    tags?: string[];
    illustration?: string;  // R2 file key or URL
    equipment?: string[];
    muscles?: string[];
    dosage?: string;
    coach_cues_ru?: string;
    coach_cues_en?: string;
    coach_cues_cn?: string;
    // Visibility model
    visibility: CustomExerciseVisibility;
    approved_by?: string;   // FK → users (admin)
    approved_at?: string;   // ISO date
    rejection_reason?: string;
}


export interface TrainingLogsRecord extends BaseRecord, Syncable {
    athlete_id: string; // FK → athletes (UNIQUE: athlete_id + plan_id + date + session)
    plan_id: string; // FK → training_plans
    date: string;
    session?: number; // 0 = AM (default), 1 = PM
    notes?: string;
    readiness_score?: number;
}

/** Flexible sets format: [{set: 1, reps: 10, weight: 50}, ...] */
export interface SetData {
    set: number;
    reps?: number;
    weight?: number;
    time?: number;
    distance?: number;
    height?: number;  // cm — for high jump attempts
    result?: 'made' | 'miss'; // for height jump attempt results
    notes?: string;
}

export interface LogExercisesRecord extends BaseRecord {
    log_id: string; // FK → training_logs
    exercise_id: string; // FK → exercises
    sets_data: SetData[];
    rpe?: number; // 1-10 Rate of Perceived Exertion
    skip_reason?: string; // Equipment|Pain|Time|CoachDecision|Other (max 255)
}

export interface DailyCheckinsRecord extends BaseRecord, Syncable {
    athlete_id: string; // FK → athletes (UNIQUE: athlete_id + date)
    date: string;
    sleep_hours?: number;
    sleep_quality?: number; // 1-5
    pain_level?: number; // 0-10
    mood?: number; // 1-5
    notes?: string;
}

export type TestType = 'standing_jump' | 'approach_jump' | 'sprint_30m' | 'sprint_60m' | 'squat_max' | 'clean_max' | 'snatch_max';

export interface TestResultsRecord extends BaseRecord {
    athlete_id: string; // FK → athletes (UNIQUE: athlete_id + test_type + date)
    test_type: TestType;
    value: number;
    date: string;
    notes?: string;
}

// ─── Content & Media ───────────────────────────────────────────────

export type CompetitionPriority = 'A' | 'B' | 'C';

export interface CompetitionsRecord extends BaseRecord, SoftDeletable {
    season_id: string; // FK → seasons
    name: string;
    date: string;
    priority: CompetitionPriority;
    location?: string;
    notes?: string;
}

export interface ExerciseVideosRecord extends BaseRecord {
    exercise_id: string; // FK → exercises
    file: string;
    coach_id: string; // FK → users
    description?: string;
}

export type AchievementType =
    // Streak
    | 'streak_3d'           // 3 consecutive daily checkins
    | 'streak_7d'           // 7 consecutive daily checkins
    | 'streak_30d'          // 30 consecutive daily checkins
    | 'streak_100d'         // 100 consecutive daily checkins
    // Training
    | 'first_workout'       // first completed training log
    | 'workouts_10'         // 10 completed training logs
    | 'workouts_50'         // 50 completed training logs
    | 'workouts_100'        // 100 completed training logs
    // Testing
    | 'first_test'          // first test result recorded
    | 'first_pb'            // first personal best in any test
    | 'pb_5'                // 5 personal bests achieved
    | 'all_tests'           // all 7 test types completed
    // Compete
    | 'first_competition';  // first competition recorded

export interface AchievementsRecord extends BaseRecord {
    athlete_id: string; // FK → athletes
    type: AchievementType;
    earned_at: string;
    title?: string;
    description?: string;
}

export type NotificationType =
    | 'plan_published'
    | 'checkin_reminder'
    | 'achievement'
    | 'system'
    | 'low_readiness'
    | 'coach_note'
    | 'invite_accepted'
    | 'competition_upcoming';

export type NotificationPriority = 'normal' | 'urgent';

export interface NotificationsRecord extends BaseRecord {
    user_id: string; // FK → users
    type: NotificationType;
    message: string;
    message_key?: string;                                    // i18n key: 'planPublished', 'achievementEarned', ...
    message_params?: Record<string, string | number>;        // interpolation params: { week: 3, title: 'Streak 7d' }
    read: boolean;
    link?: string;
    priority?: NotificationPriority; // default: normal
    expires_at?: string;             // ISO datetime, TTL for cleanup
    delivered?: boolean;             // false until Cron delivers push
}

// ─── Push & Notification Preferences ──────────────────────────────────────────

export interface PushSubscriptionsRecord extends BaseRecord {
    user_id: string;       // FK → users
    endpoint: string;      // Web Push unique endpoint URL
    p256dh: string;        // ECDH public key for push encryption
    auth_key: string;      // HMAC auth secret for push
    user_agent?: string;   // Browser/device identifier
}

export interface NotificationPreferencesRecord extends BaseRecord {
    user_id: string;                      // FK → users (UNIQUE)
    push_enabled?: boolean;               // default: true
    email_enabled?: boolean;              // default: false
    disabled_types?: NotificationType[];  // notification types user muted
    quiet_hours_start?: string;           // "HH:MM" format
    quiet_hours_end?: string;             // "HH:MM" format
    timezone?: string;                    // IANA: "Europe/Moscow", "Asia/Shanghai"
}

export interface ErrorLogsRecord extends BaseRecord {
    user_id?: string;
    error: string;
    stack?: string;
    device_info?: string;
    url?: string;
}

// ─── Training Templates ────────────────────────────────────────────

export type TemplateType = 'warmup' | 'training_day';

export interface TrainingTemplateRecord extends BaseRecord {
    coach_id: string;       // FK → users
    name_ru: string;
    name_en?: string;
    name_cn?: string;
    type: TemplateType;     // 'warmup' | 'training_day'
    total_minutes?: number;
    is_system?: boolean;    // system templates are read-only
    description_ru?: string;
    description_en?: string;
    description_cn?: string;
}

export type TemplateItemBlock = 'warmup' | 'main';

export interface TemplateItemRecord extends BaseRecord {
    template_id: string;    // FK → training_templates (cascade delete)
    order?: number;
    block: TemplateItemBlock;
    exercise_id?: string;   // FK → exercises (nullable)
    custom_text_ru?: string;
    custom_text_en?: string;
    custom_text_cn?: string;
    duration_seconds?: number;
    sets?: number;
    reps?: string;
    intensity?: string;
    weight?: number;
    distance?: number;
    rest_seconds?: number;
    notes?: string;
}

// ─── Plan Assignments ──────────────────────────────────────────────

export type PlanAssignmentStatus = 'active' | 'inactive';

/** Assignment of a training plan to an athlete or group */
export interface PlanAssignmentsRecord extends BaseRecord {
    plan_id: string;    // FK → training_plans (cascade delete)
    athlete_id?: string; // FK → athletes (set for individual assignment)
    group_id?: string;  // FK → groups (set for group assignment)
    status?: PlanAssignmentStatus;
}

// ─── Personal Records ───────────────────────────────────────────────

export interface PersonalRecordsRecord extends BaseRecord {
    athlete_id: string;          // FK → athletes
    discipline: Discipline;
    season_type: SeasonType;
    result: number;              // meters (float), max 30
    date?: string;               // ISO date
    competition_name?: string;   // max 255
    source: PRSource;
    is_current: boolean;
    notes?: string;              // max 500
}
