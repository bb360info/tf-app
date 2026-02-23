import { addExerciseToPlan } from '@/lib/pocketbase/services/plans';
import { searchExercises } from '@/lib/pocketbase/services/exercises';
import type { PhaseType, TrainingCategory } from '@/lib/pocketbase/types';
import type { ExerciseRecord } from '@/lib/pocketbase/services/exercises';

// ─── Templates ───────────────────────────────────────────────────────

interface DayTemplate {
    categories: TrainingCategory[];
    count: number; // how many exercises to pick
}

type WeekTemplate = Record<number, DayTemplate>; // 0=Mon, 6=Sun

const TEMPLATES: Record<PhaseType, WeekTemplate> = {
    GPP: {
        0: { categories: ['gpp', 'strength', 'flexibility'], count: 3 }, // Mon: foundation
        2: { categories: ['plyometric', 'jump'], count: 2 },            // Wed: power
        4: { categories: ['gpp', 'flexibility'], count: 2 },            // Fri: active recovery
    },
    SPP: {
        0: { categories: ['plyometric', 'strength'], count: 3 },
        2: { categories: ['highjump', 'speed'], count: 3 },             // Wed: technique
        4: { categories: ['strength', 'flexibility'], count: 2 },
        5: { categories: ['jump'], count: 1 },                          // Sat: light jumps
    },
    PRE_COMP: {
        0: { categories: ['highjump', 'plyometric'], count: 3 },        // Mon: intense
        2: { categories: ['speed', 'strength'], count: 2 },
        4: { categories: ['flexibility'], count: 1 },
        5: { categories: ['highjump'], count: 2 },                      // Sat: modeling
    },
    COMP: {
        0: { categories: ['highjump'], count: 2 },                      // Mon: activation
        2: { categories: ['speed'], count: 1 },                         // Wed: tonic
        // Fri/Sat usually competition day, leave empty or manual
    },
    TRANSITION: {
        0: { categories: ['gpp', 'flexibility'], count: 2 },
        3: { categories: ['gpp'], count: 1 },
    },
};

// ─── Logic ───────────────────────────────────────────────────────────

/**
 * Auto-fills a week plan with exercises based on the Phase Type.
 * 
 * Strategy:
 * 1. Look up the template for the phase.
 * 2. For each scheduled day:
 *    - Search exercises matching the target categories.
 *    - Pick random exercises (avoiding duplicates if possible).
 *    - Add to plan via `addExerciseToPlan`.
 */
export async function autoFillWeek(
    planId: string,
    phaseType: PhaseType
): Promise<{ added: number; errors: number }> {
    const template = TEMPLATES[phaseType];
    if (!template) {
        console.warn(`No auto-fill template for phase type: ${phaseType}`);
        return { added: 0, errors: 0 };
    }

    let resultCount = 0;

    const errors: unknown[] = [];

    // 2. Iterate template days
    for (const dayStr of Object.keys(template)) {
        const day = parseInt(dayStr, 10);
        const { categories, count } = template[day];

        // Find candidates for ANY of the categories (mixed bag)
        const exercisesToAdd: ExerciseRecord[] = [];

        for (const cat of categories) {
            try {
                const found = await searchExercises({
                    phase: phaseType, // Correct: pass as string
                    category: cat,
                    limit: 10 // get a pool to pick from
                });

                if (found.length > 0) {
                    // Shuffle and pick 1 or more
                    const shuffled = found.sort(() => 0.5 - Math.random());
                    const numToPick = Math.ceil(count / categories.length);
                    exercisesToAdd.push(...shuffled.slice(0, numToPick));
                }
            } catch (err) {
                console.error(`Auto-fill: failed to search category ${cat}`, err);
            }
        }

        // 3. Add them to the plan
        let currentOrder = 0; // Ideally we'd query this. For V1 MVP, let's just push.

        for (const ex of exercisesToAdd) {
            try {
                await addExerciseToPlan({
                    plan_id: planId,
                    exercise_id: ex.id,
                    day_of_week: day,
                    order: currentOrder++, // Local order for this batch
                    sets: 3, // Default defaults
                    reps: "10",
                });
                resultCount++;
            } catch (err) {
                errors.push(err);
            }
        }
    }

    if (errors.length > 0) {
        console.warn(`Auto-fill completed with ${errors.length} errors.`);
    }

    // Return stats
    return {
        added: resultCount,
        errors: errors.length,
    };
}
