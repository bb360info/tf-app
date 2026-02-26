export interface UpdateExerciseData {
    sets?: number;
    reps?: string;
    intensity?: string;
    weight?: number;
    duration?: number;
    distance?: number;
    rest_seconds?: number;
}

export interface AdHocWarmupData {
    custom_text_ru: string;
    custom_text_en?: string;
    custom_text_cn?: string;
    duration_seconds?: number;
}
