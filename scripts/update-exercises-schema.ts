#!/usr/bin/env npx tsx
/**
 * Add missing fields to the `exercises` collection in PocketBase.
 * Fields: equipment, muscles, dosage, coach_cues_ru, coach_cues_en, coach_cues_cn
 *
 * Usage:
 *   PB_URL=https://jumpedia.app \
 *   PB_ADMIN_EMAIL=admin@encyclopedia-jumper.app \
 *   PB_ADMIN_PASSWORD='...' \
 *   npx tsx scripts/update-exercises-schema.ts
 */

import PocketBase from 'pocketbase';

const PB_URL = process.env.PB_URL || 'https://jumpedia.app';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || '';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '';

async function main() {
    const pb = new PocketBase(PB_URL);
    await pb.collection('_superusers').authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Authenticated as superuser');

    // Get exercises collection
    const collections = await pb.collections.getFullList();
    const exercises = collections.find((c: any) => c.name === 'exercises');
    if (!exercises) throw new Error('exercises collection not found');

    console.log(`📋 Found exercises collection: ${exercises.id}`);
    console.log(`   Current fields: ${exercises.fields.map((f: any) => f.name).join(', ')}`);

    // Check which fields already exist
    const existingNames = new Set(exercises.fields.map((f: any) => f.name));

    const newFields: any[] = [];

    if (!existingNames.has('equipment')) {
        newFields.push({ type: 'json', name: 'equipment', maxSize: 2000 });
    }
    if (!existingNames.has('muscles')) {
        newFields.push({ type: 'json', name: 'muscles', maxSize: 2000 });
    }
    if (!existingNames.has('dosage')) {
        newFields.push({ type: 'text', name: 'dosage', max: 200 });
    }
    if (!existingNames.has('coach_cues_ru')) {
        newFields.push({ type: 'text', name: 'coach_cues_ru', max: 2000 });
    }
    if (!existingNames.has('coach_cues_en')) {
        newFields.push({ type: 'text', name: 'coach_cues_en', max: 2000 });
    }
    if (!existingNames.has('coach_cues_cn')) {
        newFields.push({ type: 'text', name: 'coach_cues_cn', max: 2000 });
    }

    if (newFields.length === 0) {
        console.log('\n✅ All fields already exist, nothing to do.');
        return;
    }

    console.log(`\n➕ Adding ${newFields.length} fields: ${newFields.map(f => f.name).join(', ')}`);

    // Merge new fields with existing
    const updatedFields = [...exercises.fields, ...newFields];

    await pb.collections.update(exercises.id, { fields: updatedFields });
    console.log('✅ Schema updated successfully!');
}

main().catch((err) => {
    console.error('❌ Fatal error:', err?.response || err);
    process.exit(1);
});
