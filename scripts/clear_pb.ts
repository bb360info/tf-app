import PocketBase from 'pocketbase';

process.loadEnvFile('.env.local');

const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);

// Disable auto cancellation to avoid aborting previous requests implicitly
pb.autoCancellation(false);

async function run() {
    console.log('Authenticating as admin...');
    await pb.collection('_superusers').authWithPassword(
        process.env.PB_ADMIN_EMAIL!,
        process.env.PB_ADMIN_PASSWORD!
    );
    console.log('Authenticated.');

    const additionalCollections = [
        'achievements',
        'personal_records',
        'competitions',
        'notifications',
        'push_subscriptions',
        'notification_preferences',
        'custom_exercises',
        'training_templates',
        'template_items'
    ];

    const collectionsToClear = [
        ...additionalCollections,
        'test_results',
        'daily_checkins',
        'log_exercises',
        'training_logs',
        'plan_assignments',
        'plan_snapshots',
        'plan_exercises',
        'training_plans',
        'training_phases',
        'seasons',
        'group_members',
        'groups',
        'athletes',
        'coach_preferences',
        'users'
    ];

    let passes = 3;
    while (passes > 0) {
        let errors = 0;
        console.log(`Pass ${4 - passes}...`);
        for (const collection of collectionsToClear) {
            console.log(`Clearing ${collection}...`);
            try {
                let hasMore = true;
                let deletedCount = 0;
                while (hasMore) {
                    const filterStr = collection === 'training_templates' ? 'is_system = false' : '';
                    const records = await pb.collection(collection).getList(1, 100, { filter: filterStr, requestKey: null });
                    if (records.items.length === 0) {
                        hasMore = false;
                        break;
                    }

                    // Delete one by one
                    for (const record of records.items) {
                        await pb.collection(collection).delete(record.id, { requestKey: null });
                        deletedCount++;
                    }
                }
                if (deletedCount > 0) {
                    console.log(`Cleared ${collection} (deleted ${deletedCount})`);
                }
            } catch {
                // If it fails, we will retry in the next pass
                errors++;
            }
        }
        if (errors === 0) break;
        passes--;
    }
    console.log('DB wiped successfully!');
}

run().catch(console.error);
