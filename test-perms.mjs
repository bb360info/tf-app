

async function run() {
    const pbUrl = 'https://jumpedia.app';

    // Auth as admin to create a test athlete and get their token, OR just auth as admin and change password of existing
    // Actually, I can just use the admin token to view things, but let's auth as a test user
    const adminRes = await fetch(pbUrl + '/api/collections/_superusers/auth-with-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: 'admin@encyclopedia-jumper.app', password: 'NewJumper2026!' })
    });
    const adminData = await adminRes.json();
    const adminToken = adminData.token;

    // Create a generic test user
    const userEmail = 'test_athlete_' + Date.now() + '@example.com';
    const userPass = 'Password123!';
    const userRes = await fetch(pbUrl + '/api/collections/users/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': adminToken },
        body: JSON.stringify({
            email: userEmail,
            password: userPass,
            passwordConfirm: userPass,
            name: 'Test Athlete',
            role: 'athlete'
        })
    });
    const userData = await userRes.json();
    console.log("Created user:", userData.id);

    // Auth as the new user
    const authRes = await fetch(pbUrl + '/api/collections/users/auth-with-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: userEmail, password: userPass })
    });
    const authData = await authRes.json();
    const userToken = authData.token;

    // Now try to read coach's preferences (coach is 446zkpk72dstfn8)
    const coachId = '446zkpk72dstfn8'; // From previous list
    console.log("Trying to read coach prefs...");
    const prefRes = await fetch(pbUrl + '/api/collections/notification_preferences/records?filter=(user_id="' + coachId + '")', {
        headers: { 'Authorization': userToken }
    });
    console.log("Pref status:", prefRes.status, await prefRes.text());

    // Try to create notification for coach
    console.log("Trying to create notification...");
    const notifRes = await fetch(pbUrl + '/api/collections/notifications/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': userToken },
        body: JSON.stringify({
            user_id: coachId,
            type: 'invite_accepted',
            message_key: 'inviteAccepted',
            message: 'inviteAccepted',
            read: false,
            link: '/',
            priority: 'normal'
        })
    });
    console.log("Notif status:", notifRes.status, await notifRes.text());

    // Cleanup users
    await fetch(pbUrl + '/api/collections/users/records/' + userData.id, {
        method: 'DELETE',
        headers: { 'Authorization': adminToken }
    });
}
run();
