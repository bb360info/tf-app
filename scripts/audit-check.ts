import PocketBase from 'pocketbase';
const pb = new PocketBase('https://jumpedia.app');

async function main() {
    await pb.collection('_superusers').authWithPassword(
        'admin@encyclopedia-jumper.app', 'NewJumper2026!'
    );

    // 1. Exercises
    const exercises = await pb.collection('exercises').getList(1, 1);
    console.log('Exercises total:', exercises.totalItems);

    // 2. Exercise fields
    const cols = await pb.collections.getFullList();
    const exCol = cols.find((c: any) => c.name === 'exercises');
    console.log('Exercise fields:', exCol!.fields.map((f: any) => f.name).join(', '));

    // 3. error_logs fields
    const errCol = cols.find((c: any) => c.name === 'error_logs');
    console.log('error_logs fields:', errCol!.fields.map((f: any) => `${f.name}:${f.type}`).join(', '));

    // 4. Users
    const users = await pb.collection('users').getFullList();
    console.log('Users:', users.length, users.map((u: any) => u.email));

    // 5. Sample exercise
    const s = await pb.collection('exercises').getFirstListItem('name_en = "Pogo Jumps"');
    console.log('Sample:', JSON.stringify({
        name_ru: (s as any).name_ru,
        name_cn: (s as any).name_cn,
        cat: (s as any).training_category,
        level: (s as any).level,
        cns: (s as any).cns_cost,
        phase: (s as any).phase_suitability,
        equip: (s as any).equipment,
        muscles: (s as any).muscles,
        dosage: (s as any).dosage,
    }, null, 2));

    // 6. CORS
    const settings = await pb.settings.getAll();
    console.log('CORS:', JSON.stringify((settings as any).allowedOrigins));

    // 7. Security headers check
    const resp = await fetch('https://jumpedia.app/api/health');
    console.log('Security headers:');
    for (const h of ['x-content-type-options', 'x-frame-options', 'strict-transport-security', 'x-xss-protection']) {
        console.log(`  ${h}: ${resp.headers.get(h) || 'MISSING'}`);
    }
}
main().catch(e => console.error(e));
