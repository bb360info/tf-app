/**
 * Training Load service
 * Aggregates plan_exercises by exercise category for a given season.
 */
import pb from '@/lib/pocketbase/client';
import type { ExercisesRecord } from '@/lib/pocketbase/types';

// ─── Category colors mapping (matches tokens.css --color-* vars) ──────
export const CATEGORY_COLORS: Record<string, string> = {
    plyometric: '--color-plyometric',
    highjump: '--color-highjump',
    strength: '--color-strength',
    gpp: '--color-gpp',
    speed: '--color-speed',
    flexibility: '--color-flexibility',
    jump: '--color-jump',
};

export const CATEGORY_LABELS: Record<string, Record<string, string>> = {
    plyometric: { ru: 'Плиометрика', en: 'Plyometric', cn: '增强式训练' },
    highjump: { ru: 'Прыжки в высоту', en: 'High Jump', cn: '跳高' },
    strength: { ru: 'Сила', en: 'Strength', cn: '力量' },
    gpp: { ru: 'ОФП', en: 'GPP', cn: '一般体能' },
    speed: { ru: 'Скорость', en: 'Speed', cn: '速度' },
    flexibility: { ru: 'Гибкость', en: 'Flexibility', cn: '柔韧性' },
    jump: { ru: 'Прыжковые', en: 'Jump', cn: '跳跃' },
};

export interface CategoryLoad {
    category: string;
    count: number;
    percentage: number;
    colorVar: string;
}

/**
 * Get training load distribution by category for a season.
 * Fetches plan_exercises → expands exercise_id → groups by training_category.
 */
export async function getLoadByCategory(seasonId: string): Promise<CategoryLoad[]> {
    // 1) Get all training_phases for this season
    const phases = await pb.collection('training_phases').getFullList({
        filter: `season_id = "${seasonId}"`,
        fields: 'id',
    });
    if (phases.length === 0) return [];

    const phaseIds = phases.map((p) => p.id);

    // 2) Get plans for those phases
    const plans = await pb.collection('training_plans').getFullList({
        filter: phaseIds.map((id) => `phase_id = "${id}"`).join(' || '),
        fields: 'id',
    });
    if (plans.length === 0) return [];

    const planIds = plans.map((p) => p.id);

    // 3) Get plan_exercises with expanded exercise_id
    //    PlanExercisesRecord → exercise_id FK → ExercisesRecord with training_category
    const planExercises = await pb.collection('plan_exercises').getFullList<
        { id: string; expand?: { exercise_id?: ExercisesRecord } }
    >({
        filter: planIds.map((id) => `plan_id = "${id}"`).join(' || '),
        expand: 'exercise_id',
    });

    // 4) Aggregate by training_category
    const counts: Record<string, number> = {};
    let total = 0;

    for (const pe of planExercises) {
        const exercise = pe.expand?.exercise_id;
        const cat = exercise?.training_category || 'gpp';
        counts[cat] = (counts[cat] || 0) + 1;
        total++;
    }

    if (total === 0) return [];

    // 5) Build result with percentages
    return Object.entries(counts)
        .map(([category, count]) => ({
            category,
            count,
            percentage: Math.round((count / total) * 100),
            colorVar: CATEGORY_COLORS[category] || '--color-gpp',
        }))
        .sort((a, b) => b.count - a.count);
}
