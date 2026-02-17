#!/usr/bin/env npx tsx
/**
 * Migrate exercises from legacy/v1/data.js → PocketBase `exercises` collection.
 *
 * PREREQUISITE: Run update-exercises-schema.ts first to add the new fields!
 *
 * Usage:
 *   PB_URL=https://jumpedia.app \
 *   PB_ADMIN_EMAIL=admin@encyclopedia-jumper.app \
 *   PB_ADMIN_PASSWORD='...' \
 *   npx tsx scripts/migrate-exercises.ts
 */

import PocketBase from 'pocketbase';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const PB_URL = process.env.PB_URL || 'https://jumpedia.app';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || '';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '';

// PB enum: ['plyometric', 'highjump', 'strength', 'gpp', 'speed', 'flexibility', 'jump']
const CATEGORY_MAP: Record<string, string> = {
    plyometric: 'plyometric',
    highjump: 'highjump',
    strength: 'strength',
    gpp: 'gpp',
    speed: 'speed',
    flexibility: 'flexibility',
    jump: 'jump',
};

const CNS_MAP: Record<string, number> = {
    beginner: 2,
    intermediate: 3,
    advanced: 5,
};

// PB enum: ['GPP', 'SPP', 'COMP', 'TRANSITION']
const PHASE_MAP: Record<string, string[]> = {
    plyometric: ['SPP', 'COMP'],
    highjump: ['SPP', 'COMP'],
    strength: ['GPP', 'SPP'],
    gpp: ['GPP', 'SPP', 'COMP', 'TRANSITION'],
    speed: ['SPP', 'COMP'],
    flexibility: ['GPP', 'SPP', 'COMP', 'TRANSITION'],
    jump: ['SPP', 'COMP'],
};

interface LegacyExercise {
    id: number;
    cat: string;
    nameRu: string;
    nameEn: string;
    level?: string;
    equipment?: string[];
    descRu?: string;
    descEn?: string;
    descCn?: string;
    dosage?: string;
    muscles?: string[];
    coachRu?: string[];
    coachEn?: string[];
    coachCn?: string[];
}

function parseDataJs(): LegacyExercise[] {
    const filePath = resolve(__dirname, '..', 'legacy', 'v1', 'data.js');
    const content = readFileSync(filePath, 'utf-8');

    const start = content.indexOf('const EXERCISES = [');
    if (start === -1) throw new Error('Could not find EXERCISES array in data.js');

    let depth = 0;
    const arrStart = content.indexOf('[', start);
    let i = arrStart;
    for (; i < content.length; i++) {
        if (content[i] === '[') depth++;
        if (content[i] === ']') depth--;
        if (depth === 0) break;
    }
    const arrStr = content.slice(arrStart, i + 1);
    const fn = new Function(`return ${arrStr}`);
    return fn();
}

async function main() {
    console.log(`🔌 Connecting to ${PB_URL}...`);
    const pb = new PocketBase(PB_URL);

    await pb.collection('_superusers').authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated as superuser\n');

    const exercises = parseDataJs();
    console.log(`📋 ${exercises.length} exercises in data.js\n`);

    // Check existing
    const existing = await pb.collection('exercises').getFullList({ fields: 'name_en' });
    const existingNames = new Set(existing.map((e: any) => e.name_en));
    console.log(`📦 ${existingNames.size} already in PocketBase\n`);

    let created = 0, skipped = 0, failed = 0;

    for (const ex of exercises) {
        const nameEn = ex.nameEn || `Exercise ${ex.id}`;

        if (existingNames.has(nameEn)) {
            skipped++;
            continue;
        }

        // All fields match PB schema exactly
        const record: Record<string, any> = {
            name_ru: ex.nameRu || '',
            name_en: nameEn,
            name_cn: nameEn, // Placeholder — translate later
            description_ru: ex.descRu || '',
            description_en: ex.descEn || '',
            description_cn: ex.descCn || '',
            training_category: CATEGORY_MAP[ex.cat] || 'gpp',
            level: ex.level || 'intermediate',
            cns_cost: CNS_MAP[ex.level || 'intermediate'] || 3,
            unit_type: 'reps',
            phase_suitability: PHASE_MAP[ex.cat] || ['GPP'],
            // New proper fields:
            equipment: ex.equipment || [],
            muscles: ex.muscles || [],
            dosage: ex.dosage || '',
            coach_cues_ru: (ex.coachRu || []).join('\n'),
            coach_cues_en: (ex.coachEn || []).join('\n'),
            coach_cues_cn: (ex.coachCn || []).join('\n'),
        };

        try {
            await pb.collection('exercises').create(record);
            created++;
            process.stdout.write(`  ✅ ${nameEn}\n`);
        } catch (err: any) {
            failed++;
            const detail = err?.response?.data
                ? JSON.stringify(err.response.data)
                : err?.response?.message || err?.message || 'unknown';
            process.stdout.write(`  ❌ ${nameEn}: ${detail}\n`);
        }
    }

    console.log(`\n═══ Migration complete ═══`);
    console.log(`  Created: ${created}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Failed:  ${failed}`);
    console.log(`  Total:   ${exercises.length}`);
}

main().catch((err) => {
    console.error('❌ Fatal error:', err?.response || err);
    process.exit(1);
});
