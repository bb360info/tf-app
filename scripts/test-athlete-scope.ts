/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
// Test script — strict typing not required
import PocketBase from 'pocketbase';

/**
 * Test: athlete data isolation.
 * Verifies that Coach1's athletes cannot be seen by Coach2,
 * and that athlete-scoped collections respect coach_id filtering.
 */

const PB_URL = 'https://jumpedia.app';

async function main() {
    const pb = new PocketBase(PB_URL);

    // Auth as superuser to set up test data
    await pb.collection('_superusers').authWithPassword(
        'admin@encyclopedia-jumper.app', 'NewJumper2026!'
    );
    console.log('✅ Superuser auth OK\n');

    // Create 2 test coaches
    const coach1Email = 'test-scope-c1@jumpedia.app';
    const coach2Email = 'test-scope-c2@jumpedia.app';
    const password = 'TestScope2026!';

    let coach1Id: string, coach2Id: string;

    try {
        const c1 = await pb.collection('users').create({
            email: coach1Email, password, passwordConfirm: password,
            name: 'Coach1-Scope', role: 'coach', language: 'en', units: 'metric',
            emailVisibility: false,
        });
        coach1Id = c1.id;
        console.log('👤 Coach1 created:', coach1Id);
    } catch {
        const c1 = await pb.collection('users').getFirstListItem(`email = "${coach1Email}"`);
        coach1Id = c1.id;
        console.log('👤 Coach1 exists:', coach1Id);
    }

    try {
        const c2 = await pb.collection('users').create({
            email: coach2Email, password, passwordConfirm: password,
            name: 'Coach2-Scope', role: 'coach', language: 'en', units: 'metric',
            emailVisibility: false,
        });
        coach2Id = c2.id;
        console.log('👤 Coach2 created:', coach2Id);
    } catch {
        const c2 = await pb.collection('users').getFirstListItem(`email = "${coach2Email}"`);
        coach2Id = c2.id;
        console.log('👤 Coach2 exists:', coach2Id);
    }

    // Create athletes as superuser (to bypass rules)
    let athlete1Id: string;
    try {
        const a1 = await pb.collection('athletes').create({
            coach_id: coach1Id!, name: 'Athlete-A', gender: 'male',
        });
        athlete1Id = a1.id;
        console.log('🏃 Athlete-A created under Coach1:', athlete1Id);
    } catch {
        const a1 = await pb.collection('athletes').getFirstListItem(`name = "Athlete-A"`);
        athlete1Id = a1.id;
        console.log('🏃 Athlete-A exists:', athlete1Id);
    }

    try {
        const a2 = await pb.collection('athletes').create({
            coach_id: coach2Id!, name: 'Athlete-B', gender: 'female',
        });
        console.log('🏃 Athlete-B created under Coach2:', a2.id);
    } catch {
        console.log('🏃 Athlete-B already exists');
    }

    console.log('\n--- ISOLATION TESTS ---\n');

    // Test 1: Coach1 should see only their athlete
    const pb1 = new PocketBase(PB_URL);
    await pb1.collection('users').authWithPassword(coach1Email, password);

    const coach1Athletes = await pb1.collection('athletes').getFullList();
    console.log(`Coach1 sees ${coach1Athletes.length} athlete(s):`,
        coach1Athletes.map((a: any) => a.name));
    console.log(coach1Athletes.length === 1 && (coach1Athletes[0] as any).name === 'Athlete-A'
        ? '  ✅ PASS: Coach1 sees only own athlete'
        : '  ❌ FAIL: Coach1 isolation broken');

    // Test 2: Coach2 should see only their athlete
    const pb2 = new PocketBase(PB_URL);
    await pb2.collection('users').authWithPassword(coach2Email, password);

    const coach2Athletes = await pb2.collection('athletes').getFullList();
    console.log(`Coach2 sees ${coach2Athletes.length} athlete(s):`,
        coach2Athletes.map((a: any) => a.name));
    console.log(coach2Athletes.length === 1 && (coach2Athletes[0] as any).name === 'Athlete-B'
        ? '  ✅ PASS: Coach2 sees only own athlete'
        : '  ❌ FAIL: Coach2 isolation broken');

    // Test 3: Anonymous should see nothing
    const pbAnon = new PocketBase(PB_URL);
    const anonAthletes = await pbAnon.collection('athletes').getFullList();
    console.log(`Anonymous sees ${anonAthletes.length} athlete(s)`);
    console.log(anonAthletes.length === 0
        ? '  ✅ PASS: Anonymous sees nothing'
        : '  ❌ FAIL: Anonymous can see data');

    // Test 4: Coach1 cannot read Coach2's athlete directly
    try {
        const coach2Athlete = await pb1.collection('athletes').getFirstListItem(`name = "Athlete-B"`);
        console.log('  ❌ FAIL: Coach1 can read Coach2 athlete');
    } catch {
        console.log('  ✅ PASS: Coach1 cannot read Coach2 athlete (404)');
    }

    console.log('\n--- CLEANUP ---\n');
    // Cleanup test data (as superuser)
    const allTestAthletes = await pb.collection('athletes').getFullList({
        filter: 'name = "Athlete-A" || name = "Athlete-B"'
    });
    for (const a of allTestAthletes) {
        await pb.collection('athletes').delete(a.id);
        console.log('🗑️  Deleted:', (a as any).name);
    }

    const allTestUsers = await pb.collection('users').getFullList({
        filter: `email = "${coach1Email}" || email = "${coach2Email}"`
    });
    for (const u of allTestUsers) {
        await pb.collection('users').delete(u.id);
        console.log('🗑️  Deleted:', (u as any).email);
    }

    console.log('\n✅ All tests complete, cleanup done.');
}

main().catch(e => {
    console.error('❌ Fatal:', e?.response || e);
    process.exit(1);
});
