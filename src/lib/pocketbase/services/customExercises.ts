/**
 * customExercises.ts — сервис для работы с custom_exercises коллекцией.
 * Visibility model: personal → pending_review → approved → rejected
 *
 * PocketBase API Rules (настроить в Admin Panel):
 *   List: @request.auth.id = coach_id || visibility = "approved"
 *   View: @request.auth.id = coach_id || visibility = "approved"
 *   Create: @request.auth.id != ""
 *   Update: @request.auth.id = coach_id
 *   Delete: @request.auth.id = coach_id
 */

import pb from '../client';
import { Collections } from '../collections';
import type { CustomExercisesRecord, CustomExerciseVisibility } from '../types';
import type { ExerciseLevel, UnitType, TrainingCategory, TrainingQuality, PhaseType } from '../types';

export type { CustomExercisesRecord };

export type CustomExerciseCreateData = {
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
    training_quality?: TrainingQuality;
    phase_suitability: PhaseType[];
    tags?: string[];
    equipment?: string[];
    muscles?: string[];
    dosage?: string;
    coach_cues_ru?: string;
    coach_cues_en?: string;
    coach_cues_cn?: string;
};

/**
 * Создать новое custom exercise (visibility = 'personal' по умолчанию)
 */
export async function createCustomExercise(
    coachId: string,
    data: CustomExerciseCreateData
): Promise<CustomExercisesRecord> {
    return pb.collection(Collections.CUSTOM_EXERCISES).create<CustomExercisesRecord>({
        ...data,
        coach_id: coachId,
        visibility: 'personal' as CustomExerciseVisibility,
    });
}

/**
 * Получить все мои custom exercises
 */
export async function listMyCustomExercises(coachId: string): Promise<CustomExercisesRecord[]> {
    return pb.collection(Collections.CUSTOM_EXERCISES).getFullList<CustomExercisesRecord>({
        filter: pb.filter('coach_id = {:coachId} && deleted_at = ""', { coachId }),

    });
}

/**
 * Получить одно custom exercise
 */
export async function getCustomExercise(id: string): Promise<CustomExercisesRecord> {
    return pb.collection(Collections.CUSTOM_EXERCISES).getOne<CustomExercisesRecord>(id);
}

/**
 * Обновить custom exercise
 */
export async function updateCustomExercise(
    id: string,
    data: Partial<CustomExerciseCreateData>
): Promise<CustomExercisesRecord> {
    return pb.collection(Collections.CUSTOM_EXERCISES).update<CustomExercisesRecord>(id, data);
}

/**
 * Удалить (soft delete) custom exercise
 */
export async function deleteCustomExercise(id: string): Promise<void> {
    await pb.collection(Collections.CUSTOM_EXERCISES).update(id, { deleted_at: new Date().toISOString() });
}

/**
 * Отправить custom exercise на модерацию (personal → pending_review)
 */
export async function submitForReview(id: string): Promise<CustomExercisesRecord> {
    return pb.collection(Collections.CUSTOM_EXERCISES).update<CustomExercisesRecord>(id, {
        visibility: 'pending_review' as CustomExerciseVisibility,
    });
}

/**
 * Получить approved community exercises (видны всем)
 */
export async function listApprovedCommunityExercises(): Promise<CustomExercisesRecord[]> {
    return pb.collection(Collections.CUSTOM_EXERCISES).getFullList<CustomExercisesRecord>({
        filter: `visibility = "approved" && deleted_at = ""`,
        sort: 'name_en',
    });
}

/**
 * Получить отображаемое имя custom exercise
 */
export function getCustomExerciseName(
    ex: CustomExercisesRecord,
    locale: 'ru' | 'en' | 'cn'
): string {
    switch (locale) {
        case 'ru': return ex.name_ru || ex.name_en || ex.name_cn || '—';
        case 'cn': return ex.name_cn || ex.name_en || ex.name_ru || '—';
        default: return ex.name_en || ex.name_ru || ex.name_cn || '—';
    }
}

/**
 * Visibility badge label
 */
export function visibilityLabel(visibility: CustomExerciseVisibility, locale: 'ru' | 'en' | 'cn'): string {
    const labels: Record<CustomExerciseVisibility, Record<'ru' | 'en' | 'cn', string>> = {
        personal: { ru: 'Личное', en: 'Personal', cn: '私人' },
        pending_review: { ru: 'На проверке', en: 'Pending Review', cn: '待审核' },
        approved: { ru: 'Одобрено', en: 'Approved', cn: '已批准' },
        rejected: { ru: 'Отклонено', en: 'Rejected', cn: '已拒绝' },
    };
    return labels[visibility][locale];
}
