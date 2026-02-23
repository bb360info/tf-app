/**
 * PocketBase Service: Training Templates & Warm-Up System
 * Track 4.15 — Full template CRUD + stampTemplate + ejectTemplate + addWarmupItem
 */

import pb from '../client';
import { Collections } from '../collections';
import type {
    TrainingTemplateRecord,
    TemplateItemRecord,
    PlanExercisesRecord,
    ExercisesRecord,
} from '../types';
import type { RecordModel } from 'pocketbase';

// ─── Type Helpers ────────────────────────────────────────────────────────────

export type TemplateItemWithExpand = TemplateItemRecord &
    RecordModel & {
        expand?: {
            exercise_id?: ExercisesRecord & RecordModel;
        };
    };

export type TrainingTemplateWithItems = TrainingTemplateRecord &
    RecordModel & {
        expand?: {
            'template_items(template_id)'?: TemplateItemWithExpand[];
        };
    };

// ─── Template CRUD ────────────────────────────────────────────────────────────

/**
 * List all templates visible to a coach (own + system).
 * PB Rule: coach_id = @request.auth.id || is_system = true
 * @param type Optional filter by template type ('warmup' | 'training_day')
 */
export async function listTemplates(
    type?: 'warmup' | 'training_day'
): Promise<TrainingTemplateWithItems[]> {
    return pb
        .collection(Collections.TRAINING_TEMPLATES)
        .getFullList<TrainingTemplateWithItems>({
            filter: type ? pb.filter('type = {:t}', { t: type }) : undefined,
            sort: '-is_system,name_ru',
            expand: 'template_items(template_id)',
        });
}


/**
 * Get a single template with all its items expanded.
 */
export async function getTemplate(id: string): Promise<TrainingTemplateWithItems> {
    return pb
        .collection(Collections.TRAINING_TEMPLATES)
        .getOne<TrainingTemplateWithItems>(id, {
            expand: 'template_items(template_id).exercise_id',
        });
}

/**
 * Create a new coach-owned template.
 */
export async function createTemplate(data: {
    coach_id: string;
    name_ru: string;
    name_en?: string;
    name_cn?: string;
    type: 'warmup' | 'training_day';
    total_minutes?: number;
    description_ru?: string;
    description_en?: string;
    description_cn?: string;
}): Promise<TrainingTemplateWithItems> {
    return pb
        .collection(Collections.TRAINING_TEMPLATES)
        .create<TrainingTemplateWithItems>({ ...data, is_system: false });
}

/**
 * Update an existing coach-owned template (system templates are protected by PB rules).
 */
export async function updateTemplate(
    id: string,
    data: Partial<
        Pick<
            TrainingTemplateRecord,
            | 'name_ru'
            | 'name_en'
            | 'name_cn'
            | 'total_minutes'
            | 'description_ru'
            | 'description_en'
            | 'description_cn'
        >
    >
): Promise<TrainingTemplateWithItems> {
    return pb
        .collection(Collections.TRAINING_TEMPLATES)
        .update<TrainingTemplateWithItems>(id, data);
}

/**
 * Delete a coach-owned template (system templates blocked by PB rules).
 * Cascade delete removes template_items automatically.
 */
export async function deleteTemplate(id: string): Promise<void> {
    await pb.collection(Collections.TRAINING_TEMPLATES).delete(id);
}

/**
 * Copy a template (usually a system template) into the coach's own library.
 * Creates a new template + duplicates all its items.
 */
export async function copyTemplate(
    templateId: string,
    coachId: string
): Promise<TrainingTemplateWithItems> {
    // Load source with items
    const source = await getTemplate(templateId);

    // Create new template
    const copy = await pb
        .collection(Collections.TRAINING_TEMPLATES)
        .create<TrainingTemplateWithItems>({
            coach_id: coachId,
            name_ru: source.name_ru,
            name_en: source.name_en,
            name_cn: source.name_cn,
            type: source.type,
            total_minutes: source.total_minutes,
            description_ru: source.description_ru,
            description_en: source.description_en,
            description_cn: source.description_cn,
            is_system: false,
        });

    // Copy all items
    const items = source.expand?.['template_items(template_id)'] ?? [];
    await Promise.all(
        items.map((item) =>
            pb.collection(Collections.TEMPLATE_ITEMS).create({
                template_id: copy.id,
                order: item.order,
                block: item.block,
                exercise_id: item.exercise_id,
                custom_text_ru: item.custom_text_ru,
                custom_text_en: item.custom_text_en,
                custom_text_cn: item.custom_text_cn,
                duration_seconds: item.duration_seconds,
                sets: item.sets,
                reps: item.reps,
                intensity: item.intensity,
                weight: item.weight,
                distance: item.distance,
                rest_seconds: item.rest_seconds,
                notes: item.notes,
            })
        )
    );

    return getTemplate(copy.id);
}

// ─── Template Items CRUD ─────────────────────────────────────────────────────

export async function listTemplateItems(templateId: string): Promise<TemplateItemWithExpand[]> {
    return pb
        .collection(Collections.TEMPLATE_ITEMS)
        .getFullList<TemplateItemWithExpand>({
            filter: `template_id = "${templateId}"`,
            sort: 'block,order',
            expand: 'exercise_id',
        });
}

export async function addTemplateItem(data: {
    template_id: string;
    block: 'warmup' | 'main';
    order?: number;
    exercise_id?: string;
    custom_text_ru?: string;
    custom_text_en?: string;
    custom_text_cn?: string;
    duration_seconds?: number;
    sets?: number;
    reps?: string;
    intensity?: string;
    notes?: string;
}): Promise<TemplateItemWithExpand> {
    return pb.collection(Collections.TEMPLATE_ITEMS).create<TemplateItemWithExpand>(data, {
        expand: 'exercise_id',
    });
}

export async function updateTemplateItem(
    id: string,
    data: Partial<Omit<TemplateItemRecord, 'id' | 'template_id' | 'created' | 'updated' | 'collectionId' | 'collectionName'>>
): Promise<TemplateItemWithExpand> {
    return pb.collection(Collections.TEMPLATE_ITEMS).update<TemplateItemWithExpand>(id, data, {
        expand: 'exercise_id',
    });
}

export async function removeTemplateItem(id: string): Promise<void> {
    await pb.collection(Collections.TEMPLATE_ITEMS).delete(id);
}

/**
 * Reorder items within a template by updating their `order` field.
 */
export async function reorderTemplateItems(
    items: Array<{ id: string; order: number }>
): Promise<void> {
    await Promise.all(
        items.map((item) =>
            pb.collection(Collections.TEMPLATE_ITEMS).update(item.id, { order: item.order })
        )
    );
}

// ─── Stamp / Eject / Ad-hoc Warmup ───────────────────────────────────────────

/**
 * Stamp a training template into a plan for a specific day+session.
 *
 * Steps:
 * 1. Load template items.
 * 2. Remove existing warmup items for this day+session (eject first).
 * 3. Create new plan_exercises with block='warmup' + source_template_id.
 *
 * For training_day templates also stamps main items.
 */
export async function stampTemplate(
    templateId: string,
    planId: string,
    dayOfWeek: number,
    session: number = 0
): Promise<void> {
    const template = await getTemplate(templateId);
    const items = template.expand?.['template_items(template_id)'] ?? [];

    // Eject existing items of the same block types being stamped
    const hasWarmup = items.some((i) => i.block === 'warmup');
    const hasMain = items.some((i) => i.block === 'main');
    await ejectTemplateItems(planId, dayOfWeek, session, {
        warmup: hasWarmup,
        main: hasMain && template.type === 'training_day',
    });

    // Stamp items
    const planItems = items
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    await Promise.all(
        planItems.map((item, idx) =>
            pb.collection(Collections.PLAN_EXERCISES).create({
                plan_id: planId,
                day_of_week: dayOfWeek,
                session,
                block: item.block,
                order: idx,
                exercise_id: item.exercise_id || undefined,
                custom_text_ru: item.custom_text_ru,
                custom_text_en: item.custom_text_en,
                custom_text_cn: item.custom_text_cn,
                duration: item.duration_seconds,
                sets: item.sets,
                reps: item.reps,
                intensity: item.intensity,
                weight: item.weight,
                distance: item.distance,
                rest_seconds: item.rest_seconds,
                notes: item.notes,
                source_template_id: templateId,
            })
        )
    );
}

/**
 * Eject (soft-delete) warmup block items from a specific plan day+session.
 */
export async function ejectTemplate(
    planId: string,
    dayOfWeek: number,
    session: number = 0
): Promise<void> {
    await ejectTemplateItems(planId, dayOfWeek, session, { warmup: true, main: false });
}

/**
 * Internal helper — soft-delete plan_exercises by block for a day+session.
 */
async function ejectTemplateItems(
    planId: string,
    dayOfWeek: number,
    session: number,
    blocks: { warmup: boolean; main: boolean }
): Promise<void> {
    const blockFilters: string[] = [];
    if (blocks.warmup) blockFilters.push('block = "warmup"');
    if (blocks.main) blockFilters.push('block = "main"');
    if (blockFilters.length === 0) return;

    const blockCondition = blockFilters.join(' || ');
    const filter = `plan_id = "${planId}" && day_of_week = ${dayOfWeek} && session = ${session} && (${blockCondition}) && deleted_at = ""`;

    const existing = await pb
        .collection(Collections.PLAN_EXERCISES)
        .getFullList<PlanExercisesRecord & RecordModel>({ filter });

    await Promise.all(
        existing.map((ex) =>
            pb
                .collection(Collections.PLAN_EXERCISES)
                .update(ex.id, { deleted_at: new Date().toISOString() })
        )
    );
}

/**
 * Add a single ad-hoc warmup item to a plan day+session.
 * Can be either a catalogue exercise or a custom text step.
 */
export async function addWarmupItem(
    planId: string,
    dayOfWeek: number,
    session: number = 0,
    data: {
        exercise_id?: string;
        custom_text_ru?: string;
        custom_text_en?: string;
        custom_text_cn?: string;
        duration_seconds?: number;
        notes?: string;
        order?: number;
    }
): Promise<RecordModel> {
    // Get next order number if not provided
    let order = data.order;
    if (order === undefined) {
        const existing = await pb
            .collection(Collections.PLAN_EXERCISES)
            .getFullList<PlanExercisesRecord & RecordModel>({
                filter: `plan_id = "${planId}" && day_of_week = ${dayOfWeek} && session = ${session} && block = "warmup" && deleted_at = ""`,
                sort: '-order',
                fields: 'order',
            });
        order = existing.length > 0 ? (existing[0].order ?? 0) + 1 : 0;
    }

    return pb.collection(Collections.PLAN_EXERCISES).create({
        plan_id: planId,
        day_of_week: dayOfWeek,
        session,
        block: 'warmup',
        order,
        exercise_id: data.exercise_id || undefined,
        custom_text_ru: data.custom_text_ru,
        custom_text_en: data.custom_text_en,
        custom_text_cn: data.custom_text_cn,
        duration: data.duration_seconds,
        notes: data.notes,
        source_template_id: undefined,
    });
}

// ─── Phase 4: Template → Plan Integration ────────────────────────────────────

/**
 * Append a template's exercises to a plan day WITHOUT ejecting existing items.
 *
 * Unlike stampTemplate (which ejects existing blocks before stamping), this
 * function purely appends exercises, preserving existing plan content.
 *
 * - For warmup templates: still ejects existing warmup block first (idempotent).
 * - For training_day templates: append-only (safe, no destructive eject).
 *
 * Uses sequential for...of (SQLite safety — avoids parallel INSERT lock).
 */
export async function appendTemplate(
    templateId: string,
    planId: string,
    dayOfWeek: number,
    session: number = 0
): Promise<void> {
    const template = await getTemplate(templateId);
    const items = template.expand?.['template_items(template_id)'] ?? [];
    if (items.length === 0) return;

    // For warmup type: eject existing warmup block first (same idempotent behavior)
    if (template.type === 'warmup') {
        await ejectTemplateItems(planId, dayOfWeek, session, { warmup: true, main: false });
    }
    // For training_day: NO eject — append to existing exercises

    // Get current max order for this day+session to append after existing
    const existing = await pb
        .collection(Collections.PLAN_EXERCISES)
        .getFullList<PlanExercisesRecord & RecordModel>({
            filter: pb.filter(
                'plan_id = {:pid} && day_of_week = {:dow} && session = {:s} && deleted_at = ""',
                { pid: planId, dow: dayOfWeek, s: session }
            ),
            fields: 'order',
            sort: '-order',
        });
    const startOrder = existing.length > 0 ? ((existing[0].order ?? 0) + 1) : 0;

    const sortedItems = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Sequential inserts (SQLite safety)
    for (const [idx, item] of sortedItems.entries()) {
        await pb.collection(Collections.PLAN_EXERCISES).create({
            plan_id: planId,
            day_of_week: dayOfWeek,
            session,
            block: item.block ?? 'main',
            order: startOrder + idx,
            exercise_id: item.exercise_id || undefined,
            custom_text_ru: item.custom_text_ru,
            custom_text_en: item.custom_text_en,
            custom_text_cn: item.custom_text_cn,
            duration: item.duration_seconds,
            sets: item.sets,
            reps: item.reps,
            intensity: item.intensity,
            weight: item.weight,
            distance: item.distance,
            rest_seconds: item.rest_seconds,
            notes: item.notes,
            source_template_id: templateId,
        });
    }
}

/**
 * Save a plan day's exercises as a new training_day template.
 *
 * Chunked batch (5 items at a time) for SQLite lock safety.
 * Preserves block, order, sets, reps, intensity, custom_text fields.
 */
export async function createTemplateFromPlanDay(
    planId: string,
    dayOfWeek: number,
    session: number,
    coachId: string,
    name: { ru: string; en: string; cn: string }
): Promise<TrainingTemplateWithItems> {
    // 1. Load plan_exercises for this day+session
    const exercises = await pb
        .collection(Collections.PLAN_EXERCISES)
        .getFullList<PlanExercisesRecord & RecordModel>({
            filter: pb.filter(
                'plan_id = {:pid} && day_of_week = {:dow} && session = {:s} && deleted_at = ""',
                { pid: planId, dow: dayOfWeek, s: session }
            ),
            sort: 'order',
        });

    // 2. Create template record
    const template = await createTemplate({
        coach_id: coachId,
        type: 'training_day',
        name_ru: name.ru,
        name_en: name.en,
        name_cn: name.cn,
    });

    // 3. Map exercises → template items
    const templateItems = exercises.map((ex, idx) => ({
        template_id: template.id,
        block: (ex.block as 'warmup' | 'main') || 'main',
        exercise_id: ex.exercise_id || undefined,
        custom_text_ru: ex.custom_text_ru,
        custom_text_en: ex.custom_text_en,
        custom_text_cn: ex.custom_text_cn,
        order: idx,
        sets: ex.sets,
        reps: ex.reps,
        intensity: ex.intensity,
        duration_seconds: ex.duration,
        weight: ex.weight,
        distance: ex.distance,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes,
    }));

    // 4. Chunked batch inserts (5 at a time) — SQLite lock safety
    for (let i = 0; i < templateItems.length; i += 5) {
        await Promise.all(
            templateItems.slice(i, i + 5).map((item) => addTemplateItem(item))
        );
    }

    return getTemplate(template.id);
}

