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

export interface UsersRecord extends BaseRecord {
    email: string;
    name: string;
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
    name: string;
    birth_date?: string;
    gender?: Gender;
    height_cm?: number;
}

export interface GroupsRecord extends BaseRecord, SoftDeletable {
    coach_id: string; // FK → users
    name: string;
    timezone?: string;
}

export interface GroupMembersRecord extends BaseRecord {
    group_id: string; // FK → groups (UNIQUE: group_id + athlete_id)
    athlete_id: string; // FK → athletes
}

export interface CoachPreferencesRecord extends BaseRecord {
    coach_id: string; // FK → users (UNIQUE: coach_id)
    default_plan_languages: Language[];
}

// ─── Training ──────────────────────────────────────────────────────

export interface SeasonsRecord extends BaseRecord, SoftDeletable {
    coach_id: string; // FK → users
    name: string;
    start_date: string;
    end_date: string;
}

export type PhaseType = 'GPP' | 'SPP' | 'COMP' | 'TRANSITION';

export interface TrainingPhasesRecord extends BaseRecord, SoftDeletable {
    season_id: string; // FK → seasons
    phase_type: PhaseType;
    order: number;
    start_date?: string;
    end_date?: string;
}

export type PlanStatus = 'draft' | 'published' | 'archived';

export interface TrainingPlansRecord extends BaseRecord, SoftDeletable, Syncable {
    phase_id: string; // FK → training_phases
    week_number: number;
    status: PlanStatus;
    notes?: string;
}

export interface PlanExercisesRecord extends BaseRecord, SoftDeletable {
    plan_id: string; // FK → training_plans
    exercise_id: string; // FK → exercises
    order: number;
    day_of_week?: number;
    sets?: number;
    reps?: string;
    intensity?: string;
    notes?: string;
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
    phase_suitability: PhaseType[];
    tags?: string[];
    equipment?: string[];
    muscles?: string[];
    dosage?: string;
    coach_cues_ru?: string;
    coach_cues_en?: string;
    coach_cues_cn?: string;
}

export interface TrainingLogsRecord extends BaseRecord, Syncable {
    athlete_id: string; // FK → athletes (UNIQUE: athlete_id + plan_id + date)
    plan_id: string; // FK → training_plans
    date: string;
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
    notes?: string;
}

export interface LogExercisesRecord extends BaseRecord {
    log_id: string; // FK → training_logs
    exercise_id: string; // FK → exercises
    sets_data: SetData[];
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

export type AchievementType = 'streak' | 'personal_best' | 'milestone' | 'consistency';

export interface AchievementsRecord extends BaseRecord {
    athlete_id: string; // FK → athletes
    type: AchievementType;
    earned_at: string;
    title?: string;
    description?: string;
}

export type NotificationType = 'plan_published' | 'checkin_reminder' | 'achievement' | 'system';

export interface NotificationsRecord extends BaseRecord {
    user_id: string; // FK → users
    type: NotificationType;
    message: string;
    read: boolean;
    link?: string;
}

export interface ErrorLogsRecord extends BaseRecord {
    user_id?: string;
    error: string;
    stack?: string;
    device_info?: string;
    url?: string;
}
