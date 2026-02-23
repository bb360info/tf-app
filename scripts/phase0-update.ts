#!/usr/bin/env npx tsx
/**
 * Phase 0: Update PocketBase schema for Track 3.
 *
 * Adds:
 * 1. PRE_COMP to training_phases.phase_type enum
 * 2. PRE_COMP to exercises.phase_suitability + custom_exercises.phase_suitability
 * 3. training_quality field to exercises + custom_exercises
 * 4. focus field to training_phases
 * 5. invite_code + invite_expires to groups
 * 6. auto_adaptation_enabled to coach_preferences
 * 7. rpe to log_exercises
 *
 * Then patches all 68 exercises with training_quality + PRE_COMP.
 */

import PocketBase from 'pocketbase';

const PB_URL = process.env.PB_URL || 'https://jumpedia.app';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || '';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '';

type Field = Record<string, unknown>;

// ─── Mapping: training_category → training_quality (default) ──────
const QUALITY_MAP: Record<string, string> = {
    plyometric: 'elasticity',
    highjump: 'technical',
    strength: 'max_strength',
    gpp: 'technical',
    speed: 'speed',
    flexibility: 'technical',
    jump: 'power',
};

// Categories that should include PRE_COMP in phase_suitability
const PRE_COMP_CATEGORIES = new Set([
    'plyometric', 'highjump', 'speed', 'jump',
]);

// CNS cost refinements
const CNS_OVERRIDES: Array<{ pattern: RegExp; cns_cost: number }> = [
    { pattern: /squat|deadlift|clean|snatch|jerk/i, cns_cost: 4 },
    { pattern: /depth|drop jump/i, cns_cost: 5 },
    { pattern: /stretch|mobility|foam|roller/i, cns_cost: 1 },
    { pattern: /sprint|flying/i, cns_cost: 4 },
    { pattern: /full approach|scissor/i, cns_cost: 5 },
];

async function main() {
    console.log(`🔌 Connecting to ${PB_URL}...`);
    const pb = new PocketBase(PB_URL);

    await pb.collection('_superusers').authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated as superuser\n');

    // ═══════════════════════════════════════════════════════════════
    // PART 1: Schema Updates
    // ═══════════════════════════════════════════════════════════════
    console.log('═══ PART 1: Schema Updates ═══\n');

    const allCols = await pb.collections.getFullList();
    const colMap: Record<string, { id: string; fields: Field[] }> = {};
    for (const c of allCols) {
        colMap[c.name] = { id: c.id, fields: c.fields as Field[] };
    }

    // Helper: check if field exists
    const hasField = (colName: string, fieldName: string): boolean => {
        const col = colMap[colName];
        if (!col) return false;
        return col.fields.some((f: Field) => f.name === fieldName);
    };

    // Helper: update a select field's values
    const updateSelectValues = (fields: Field[], fieldName: string, newValues: string[]): Field[] => {
        return fields.map((f: Field) => {
            if (f.name === fieldName && f.type === 'select') {
                return { ...f, values: newValues, maxSelect: Math.max(f.maxSelect as number || 1, newValues.length) };
            }
            return f;
        });
    };

    // 1. training_phases: PRE_COMP + focus
    {
        const name = 'training_phases';
        console.log(`  📦 ${name}...`);
        let fields = colMap[name].fields;
        // Update phase_type enum to include PRE_COMP
        fields = updateSelectValues(fields, 'phase_type', ['GPP', 'SPP', 'PRE_COMP', 'COMP', 'TRANSITION']);
        // Add focus field
        if (!hasField(name, 'focus')) {
            fields.push({ name: 'focus', type: 'text', required: false, max: 255, min: 0 });
        }
        await pb.collections.update(colMap[name].id, { fields });
        console.log('    ✅ +PRE_COMP in phase_type, +focus');
    }

    // 2. exercises: PRE_COMP in phase_suitability + training_quality
    for (const name of ['exercises', 'custom_exercises']) {
        console.log(`  📦 ${name}...`);
        let fields = colMap[name].fields;
        // Update phase_suitability to include PRE_COMP
        fields = fields.map((f: Field) => {
            if (f.name === 'phase_suitability' && f.type === 'select') {
                const newValues = ['GPP', 'SPP', 'PRE_COMP', 'COMP', 'TRANSITION'];
                return { ...f, values: newValues, maxSelect: newValues.length };
            }
            return f;
        });
        // Add training_quality
        if (!hasField(name, 'training_quality')) {
            fields.push({
                name: 'training_quality',
                type: 'select',
                required: false,
                values: ['speed', 'power', 'elasticity', 'max_strength', 'technical'],
                maxSelect: 1,
            });
        }
        await pb.collections.update(colMap[name].id, { fields });
        console.log('    ✅ +PRE_COMP in phase_suitability, +training_quality');
    }

    // 3. groups: invite_code + invite_expires
    {
        const name = 'groups';
        console.log(`  📦 ${name}...`);
        const fields = colMap[name].fields;
        if (!hasField(name, 'invite_code')) {
            fields.push({ name: 'invite_code', type: 'text', required: false, max: 6, min: 0 });
        }
        if (!hasField(name, 'invite_expires')) {
            fields.push({ name: 'invite_expires', type: 'date', required: false });
        }
        await pb.collections.update(colMap[name].id, { fields });
        console.log('    ✅ +invite_code, +invite_expires');
    }

    // 4. coach_preferences: auto_adaptation_enabled
    {
        const name = 'coach_preferences';
        console.log(`  📦 ${name}...`);
        const fields = colMap[name].fields;
        if (!hasField(name, 'auto_adaptation_enabled')) {
            fields.push({ name: 'auto_adaptation_enabled', type: 'bool', required: false });
        }
        await pb.collections.update(colMap[name].id, { fields });
        console.log('    ✅ +auto_adaptation_enabled');
    }

    // 5. log_exercises: rpe
    {
        const name = 'log_exercises';
        console.log(`  📦 ${name}...`);
        const fields = colMap[name].fields;
        if (!hasField(name, 'rpe')) {
            fields.push({ name: 'rpe', type: 'number', required: false, min: 1, max: 10, onlyInt: true });
        }
        await pb.collections.update(colMap[name].id, { fields });
        console.log('    ✅ +rpe');
    }

    console.log('\n✅ All schema updates complete!\n');

    // ═══════════════════════════════════════════════════════════════
    // PART 2: Patch Exercise Data
    // ═══════════════════════════════════════════════════════════════
    console.log('═══ PART 2: Patch Exercise Data ═══\n');

    const exercises = await pb.collection('exercises').getFullList();
    console.log(`📋 ${exercises.length} exercises to patch\n`);

    let updated = 0, skipped = 0, failed = 0;

    for (const ex of exercises) {
        const patch: Record<string, unknown> = {};
        const changes: string[] = [];

        // 1. Add training_quality if missing
        if (!ex.training_quality) {
            const quality = QUALITY_MAP[ex.training_category] || 'technical';
            patch.training_quality = quality;
            changes.push(`quality=${quality}`);
        }

        // 2. Add PRE_COMP to phase_suitability
        const phases: string[] = ex.phase_suitability || [];
        if (
            PRE_COMP_CATEGORIES.has(ex.training_category) &&
            !phases.includes('PRE_COMP') &&
            phases.includes('COMP')
        ) {
            patch.phase_suitability = [...phases, 'PRE_COMP'];
            changes.push('+PRE_COMP');
        }

        // 3. Refine CNS cost
        const nameEn = ex.name_en || '';
        for (const override of CNS_OVERRIDES) {
            if (override.pattern.test(nameEn) && ex.cns_cost !== override.cns_cost) {
                patch.cns_cost = override.cns_cost;
                changes.push(`cns=${ex.cns_cost}→${override.cns_cost}`);
                break;
            }
        }

        if (Object.keys(patch).length > 0) {
            try {
                await pb.collection('exercises').update(ex.id, patch);
                updated++;
                console.log(`  ✅ ${nameEn}: ${changes.join(', ')}`);
            } catch (err: unknown) {
                failed++;
                const detail = err instanceof Error ? err.message : 'unknown';
                console.log(`  ❌ ${nameEn}: ${detail}`);
            }
        } else {
            skipped++;
        }
    }

    console.log('\n═══ Complete ═══');
    console.log(`  Schema: 5 collections updated`);
    console.log(`  Data: ${updated} patched, ${skipped} skipped, ${failed} failed`);
    console.log(`  Total exercises: ${exercises.length}`);
}

main().catch((err) => {
    console.error('❌ Fatal error:', err?.response || err);
    process.exit(1);
});
