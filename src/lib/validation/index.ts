/** Barrel export — all Zod validation schemas */

// Core
export {
    UserRoleSchema,
    LanguageSchema,
    UnitSystemSchema,
    UsersSchema,
    LoginSchema,
    RegisterSchema,
    GenderSchema,
    AthletesSchema,
    GroupsSchema,
    GroupMembersSchema,
    CoachPreferencesSchema,
} from './core';

// Training
export {
    SeasonsSchema,
    PhaseTypeSchema as TrainingPhaseTypeSchema,
    TrainingPhasesSchema,
    PlanStatusSchema,
    TrainingPlansSchema,
    PlanExercisesSchema,
    PlanSnapshotsSchema,
} from './training';

// Exercises
export {
    ExerciseLevelSchema,
    UnitTypeSchema,
    TrainingCategorySchema,
    ExercisesSchema,
    CustomExercisesSchema,
    ExerciseVideosSchema,
} from './exercises';

// Logs
export {
    TrainingLogsSchema,
    SetDataSchema,
    LogExercisesSchema,
    DailyCheckinsSchema,
    TestTypeSchema,
    TestResultsSchema,
} from './logs';

// Content
export {
    CompetitionPrioritySchema,
    CompetitionsSchema,
    AchievementTypeSchema,
    AchievementsSchema,
    NotificationTypeSchema,
    NotificationsSchema,
    ErrorLogsSchema,
} from './content';
