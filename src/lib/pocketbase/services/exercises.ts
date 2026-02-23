/**
 * PocketBase Service: Exercises Catalog
 * Read-only service for searching and filtering exercises.
 */

import pb from '../client';
import { Collections } from '../collections';
import type {
    ExercisesRecord,
    PhaseType,
    TrainingCategory,
    ExerciseLevel,
} from '../types';
import type { RecordModel } from 'pocketbase';

export type ExerciseRecord = ExercisesRecord & RecordModel;

// ─── Search & Filter ─────────────────────────────────────────────

export interface ExerciseSearchParams {
    query?: string;
    phase?: PhaseType;
    category?: TrainingCategory;
    level?: ExerciseLevel;
    equipment?: string;
    limit?: number;
}

/** Search exercises with text query and filters */
export async function searchExercises(
    params: ExerciseSearchParams
): Promise<ExerciseRecord[]> {
    const filters: string[] = [];

    if (params.query && params.query.trim()) {
        const q = params.query.trim().replace(/"/g, '\\"');
        filters.push(
            `(name_en ~ "${q}" || name_ru ~ "${q}" || name_cn ~ "${q}")`
        );
    }

    if (params.phase) {
        // phase_suitability is a JSON array; PocketBase ~ works for array contains
        filters.push(`phase_suitability ~ "${params.phase}"`);
    }

    if (params.category) {
        filters.push(`training_category = "${params.category}"`);
    }

    if (params.level) {
        filters.push(`level = "${params.level}"`);
    }

    if (params.equipment) {
        filters.push(`equipment ~ "${params.equipment}"`);
    }

    const filter = filters.length > 0 ? filters.join(' && ') : '';

    return pb.collection(Collections.EXERCISES).getFullList<ExerciseRecord>({
        filter: filter || undefined,
        sort: 'name_en',
        ...(params.limit ? { perPage: params.limit } : {}),
    });
}

/** Get a single exercise by ID */
export async function getExercise(id: string): Promise<ExerciseRecord> {
    return pb.collection(Collections.EXERCISES).getOne<ExerciseRecord>(id);
}

/** List all exercises (no filters) */
export async function listExercises(): Promise<ExerciseRecord[]> {
    return pb.collection(Collections.EXERCISES).getFullList<ExerciseRecord>({
        sort: 'name_en',
    });
}

// ─── Helpers ─────────────────────────────────────────────────────

/** Get exercise name for the given locale */
export function getExerciseName(
    exercise: ExercisesRecord,
    locale: 'ru' | 'en' | 'cn'
): string {
    switch (locale) {
        case 'ru': return exercise.name_ru || exercise.name_en;
        case 'cn': return exercise.name_cn || exercise.name_en;
        default: return exercise.name_en;
    }
}

/** Get exercise description for the given locale */
export function getExerciseDescription(
    exercise: ExercisesRecord,
    locale: 'ru' | 'en' | 'cn'
): string {
    switch (locale) {
        case 'ru': return exercise.description_ru || exercise.description_en || '';
        case 'cn': return exercise.description_cn || exercise.description_en || '';
        default: return exercise.description_en || '';
    }
}

/** CNS cost to color */
export function cnsCostColor(cost: number): string {
    if (cost >= 4) return '#EF4444'; // red — high CNS
    if (cost >= 3) return '#F59E0B'; // amber — medium
    return '#22C55E'; // green — low
}

/** CNS cost to label */
export function cnsCostLabel(cost: number): string {
    if (cost >= 4) return 'High';
    if (cost >= 3) return 'Medium';
    return 'Low';
}

/** Training category colors */
export const CATEGORY_COLORS: Record<TrainingCategory, string> = {
    plyometric: '#EB5757',
    highjump: '#2383E2',
    strength: '#9B51E0',
    gpp: '#00A86B',
    speed: '#F2994A',
    flexibility: '#56CCF2',
    jump: '#FF6B6B',
};
