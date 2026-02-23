
const predefinedUrl = 'https://jumpedia.app';
const email = 'admin@encyclopedia-jumper.app';
const password = 'NewJumper2026!';

async function updateSchema() {
    try {
        // 1. Authenticate
        console.log('Authenticating...');
        const authRes = await fetch(`${predefinedUrl}/api/collections/_superusers/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: email, password })
        });

        if (!authRes.ok) {
            throw new Error(`Auth failed: ${authRes.status} ${await authRes.text()}`);
        }

        const authData = await authRes.json();
        const token = authData.token;
        console.log('Authenticated.');

        // 2. Get seasons collection
        console.log('Fetching seasons collection...');
        const collRes = await fetch(`${predefinedUrl}/api/collections/seasons`, {
            headers: { 'Authorization': token }
        });

        if (!collRes.ok) {
            throw new Error(`Fetch failed: ${collRes.status} ${await collRes.text()}`);
        }

        const collection = await collRes.json();
        console.log('Collection structure:', JSON.stringify(collection, null, 2));

        // 3. Check if field exists
        const fieldExists = (collection.fields || []).some(f => f.name === 'athlete_id');
        if (fieldExists) {
            console.log('athlete_id field already exists.');
            return;
        }

        // 4. Add field
        console.log('Adding athlete_id field...');
        const newField = {
            name: "athlete_id",
            type: "relation",
            collectionId: "_pb_users_auth_",
            cascadeDelete: true,
            maxSelect: 1,
            minSelect: 0,
            required: false,
            presentable: false,
            system: false,
            hidden: false
        };

        if (!collection.fields) collection.fields = [];
        collection.fields.push(newField);

        // 5. Update collection
        const updateRes = await fetch(`${predefinedUrl}/api/collections/seasons`, {
            method: 'PATCH',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields: collection.fields })
        });

        if (!updateRes.ok) {
            throw new Error(`Update failed: ${updateRes.status} ${await updateRes.text()}`);
        }

        console.log('Schema updated successfully.');

    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

updateSchema();
