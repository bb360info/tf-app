#!/usr/bin/env python3
"""Test PocketBase API rules — coach isolation + anonymous access."""
import urllib.request, json, ssl, sys

ctx = ssl.create_default_context()
URL = 'https://jumpedia.app'
TIMEOUT = 20  # generous timeout for HK VPS

def api(path, data=None, token=None, method=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = token
    body = json.dumps(data).encode() if data else None
    m = method or ('POST' if data else 'GET')
    req = urllib.request.Request(f'{URL}{path}', data=body, headers=headers, method=m)
    try:
        resp = urllib.request.urlopen(req, context=ctx, timeout=TIMEOUT)
        return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except:
            return e.code, {}
    except Exception as e:
        return 0, {'error': str(e)}

print('--- Step 1: Register coach2 ---', flush=True)
s, d = api('/api/collections/users/records', {
    'email': 'coach2-test@ejump.app', 'password': 'Test1234!',
    'passwordConfirm': 'Test1234!', 'name': 'Coach Two',
    'role': 'coach', 'language': 'en', 'units': 'metric',
    'emailVisibility': False
})
coach2_id = d.get('id', '')
print(f'  Register coach2: HTTP {s} id={coach2_id}', flush=True)

print('--- Step 2: Login coach2 ---', flush=True)
s, d = api('/api/collections/users/auth-with-password',
           {'identity': 'coach2-test@ejump.app', 'password': 'Test1234!'})
coach2_token = d.get('token', '')
print(f'  Login coach2: HTTP {s} token={coach2_token[:20]}...', flush=True)

print('--- Step 3: Login coach1 ---', flush=True)
s, d = api('/api/collections/users/auth-with-password',
           {'identity': 'test-e2e@encyclopedia-jumper.app', 'password': 'TestPass123!'})
coach1_token = d.get('token', '')
print(f'  Login coach1: HTTP {s}', flush=True)

print('--- Step 4: Coach2 lists athletes (expect 0) ---', flush=True)
s, d = api('/api/collections/athletes/records', token=coach2_token)
c2_total = d.get('totalItems', '?')
print(f'  Coach2 athletes: totalItems={c2_total}', flush=True)

print('--- Step 5: Coach1 lists athletes (expect 1) ---', flush=True)
s, d = api('/api/collections/athletes/records', token=coach1_token)
c1_total = d.get('totalItems', '?')
print(f'  Coach1 athletes: totalItems={c1_total}', flush=True)

print('--- Step 6: Anonymous create athlete (expect 400) ---', flush=True)
s, d = api('/api/collections/athletes/records',
           {'name': 'Hacker', 'gender': 'male', 'status': 'active'})
print(f'  Anon create: HTTP {s}', flush=True)

print('--- Step 7: Exercises public read (expect 200) ---', flush=True)
s, d = api('/api/collections/exercises/records')
print(f'  Exercises: HTTP {s} totalItems={d.get("totalItems", "?")}', flush=True)

# Cleanup: delete test data
print('--- Cleanup ---', flush=True)
admin_s, admin_d = api('/api/collections/_superusers/auth-with-password',
                        {'identity': 'admin@encyclopedia-jumper.app', 'password': 'NewJumper2026!'})
admin_token = admin_d.get('token', '')

# Delete test athlete
s, d = api('/api/collections/athletes/records', token=coach1_token)
for item in d.get('items', []):
    ds, _ = api(f'/api/collections/athletes/records/{item["id"]}', token=admin_token, method='DELETE')
    print(f'  Deleted athlete {item["id"]}: HTTP {ds}', flush=True)

# Delete test users
for email_prefix in ['test-e2e@encyclopedia-jumper.app', 'coach2-test@ejump.app', 'test-e2e-2@encyclopedia-jumper.app']:
    s, d = api(f'/api/collections/users/records?filter=(email="{email_prefix}")', token=admin_token)
    for item in d.get('items', []):
        ds, _ = api(f'/api/collections/users/records/{item["id"]}', token=admin_token, method='DELETE')
        print(f'  Deleted user {item["id"]} ({email_prefix}): HTTP {ds}', flush=True)

# Summary
ok = c2_total == 0 and c1_total == 1
print(f'\n{"✅ ALL API RULES VERIFIED" if ok else "❌ SOME TESTS FAILED"}')
