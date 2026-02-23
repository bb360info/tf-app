#!/usr/bin/env npx tsx
 
// Patch script — strict typing not required
/**
 * Patch existing 68 exercises in PocketBase:
 * 1. Add `training_quality` based on `training_category` mapping
 * 2. Add `PRE_COMP` to `phase_suitability` where appropriate
 * 3. Refine `cns_cost` for specific exercise types
 *
 * Usage:
 *   PB_URL=https://jumpedia.app \
 *   PB_ADMIN_EMAIL=admin@encyclopedia-jumper.app \
 *   PB_ADMIN_PASSWORD='...' \
 *   npx tsx scripts/patch-exercises.ts
 */

import PocketBase from 'pocketbase';

const PB_URL = process.env.PB_URL || 'https://jumpedia.app';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || '';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '';

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

// ─── Categories that should include PRE_COMP in phase_suitability ─
// PRE_COMP is the bridge between SPP and COMP — competition-specific prep
const PRE_COMP_CATEGORIES = new Set([
    'plyometric',  // High-intensity plyo stays relevant
    'highjump',    // Technical specificity peaks here
    'speed',       // Speed maintenance
    'jump',        // Jump development peaks
]);

// ─── CNS cost refinements by name patterns ────────────────────────
// Some exercises are misclassified purely by level (beginner=2, intermediate=3, advanced=5)
const CNS_OVERRIDES: Array<{ pattern: RegExp; cns_cost: number }> = [
    // Max effort lifts are always high CNS regardless of level
    { pattern: /squat|deadlift|clean|snatch|jerk/i, cns_cost: 4 },
    // Depth/drop jumps are high CNS
    { pattern: /depth|drop jump/i, cns_cost: 5 },
    // Stretching/mobility is always low CNS
    { pattern: /stretch|mobility|foam|roller/i, cns_cost: 1 },
    // Sprint work is high CNS
    { pattern: /sprint|flying/i, cns_cost: 4 },
    // Full approach jumps are max CNS
    { pattern: /full approach|scissor/i, cns_cost: 5 },
];

async function main() {
    console.log(`🔌 Connecting to ${PB_URL}...`);
    const pb = new PocketBase(PB_URL);

    await pb.collection('_superusers').authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated as superuser\n');

    // Fetch all exercises
    const exercises = await pb.collection('exercises').getFullList();
    console.log(`📋 ${exercises.length} exercises in PocketBase\n`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const ex of exercises) {
        const patch: Record<string, unknown> = {};
        const changes: string[] = [];

        // 1. Add training_quality if missing
        if (!ex.training_quality) {
            const quality = QUALITY_MAP[ex.training_category] || 'technical';
            patch.training_quality = quality;
            changes.push(`quality=${quality}`);
        }

        // 2. Add PRE_COMP to phase_suitability if appropriate
        const phases: string[] = ex.phase_suitability || [];
        if (
            PRE_COMP_CATEGORIES.has(ex.training_category) &&
            !phases.includes('PRE_COMP') &&
            phases.includes('COMP') // Only if already suitable for COMP
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

        // Apply patch if any changes
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

    console.log('\n═══ Patch complete ═══');
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Failed:  ${failed}`);
    console.log(`  Total:   ${exercises.length}`);
}

main().catch((err) => {
    console.error('❌ Fatal error:', err?.response || err);
    process.exit(1);
});
