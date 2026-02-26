import PocketBase from 'pocketbase';
process.loadEnvFile('.env.local');
const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
async function run() {
    await pb.collection('_superusers').authWithPassword(process.env.PB_ADMIN_EMAIL!, process.env.PB_ADMIN_PASSWORD!);
    const users = await pb.collection('users').getList(1, 10, { requestKey: null });
    console.log(`Found ${users.items.length} users:`);
    for (const u of users.items) {
        console.log(u.email);
        try {
            await pb.collection('users').delete(u.id, { requestKey: null });
            console.log('Deleted');
        } catch (e: unknown) {
            console.error('Failed to delete:', (e as Error).message);
        }
    }
}
run().catch(console.error);
