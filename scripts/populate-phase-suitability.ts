
/* eslint-disable @typescript-eslint/no-explicit-any */
// Populate script — strict typing not required
import PocketBase from 'pocketbase';

// import { TrainingCategory } from '../src/lib/pocketbase/types';

const PB_URL = process.env.PB_URL || 'https://jumpedia.app';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@encyclopedia-jumper.app';
const ADMIN_PASS = process.env.PB_ADMIN_PASS || 'NewJumper2026!';

const pb = new PocketBase(PB_URL);

// Phase Types
const GPP = 'GPP';
const SPP = 'SPP';
const PRE_COMP = 'PRE_COMP';
const COMP = 'COMP';
const TRANSITION = 'TRANSITION';

const ALL_PHASES = [GPP, SPP, PRE_COMP, COMP, TRANSITION];

function getPhases(ex: any): string[] {
    const cat = ex.training_category;
    const tags = Array.isArray(ex.tags) ? ex.tags : [];

    // Tag based overrides for uncategorized or miscategorized items
    if (tags.includes('warmup') || tags.includes('activation')) return ALL_PHASES;
    if (tags.includes('technique')) return [GPP, SPP, PRE_COMP, COMP];

    // Category based rules
    switch (cat) {
        case 'warmup': // Handling legacy/invalid values if present
        case 'flexibility':
            return ALL_PHASES;

        case 'gpp':
            return [GPP, TRANSITION];

        case 'strength':
            return [GPP, SPP, PRE_COMP];

        case 'plyometric':
            return [SPP, PRE_COMP, COMP];

        case 'speed':
            return [SPP, PRE_COMP, COMP];

        case 'highjump':
        case 'technique':
            return [GPP, SPP, PRE_COMP, COMP];

        case 'jump':
            return [SPP, PRE_COMP, COMP];

        default:
            return ALL_PHASES;
    }
}

async function main() {
    console.log(`Connecting to ${PB_URL}...`);
    // Disable TLS verification for self-signed certs (just in case)
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    try {
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log('Authenticated as admin.');
    } catch (err) {
        console.error('Authentication failed:', err);
        process.exit(1);
    }

    try {
        const exercises = await pb.collection('exercises').getFullList();
        console.log(`Found ${exercises.length} exercises. Updating phase_suitability...`);

        // Log sample
        if (exercises.length > 0) {
            console.log('Sample exercise:', exercises[0].name_en, 'Category:', exercises[0].training_category, 'Tags:', exercises[0].tags);
        }

        let updated = 0;
        for (const ex of exercises) {
            const suitable = getPhases(ex);

            await pb.collection('exercises').update(ex.id, {
                phase_suitability: suitable
            });
            updated++;
            if (updated % 10 === 0) process.stdout.write('.');
        }

        console.log(`\nUpdated ${updated} exercises.`);
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

main();
