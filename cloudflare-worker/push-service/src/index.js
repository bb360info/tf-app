/**
 * push-service: Cloudflare Worker
 * Handles batch Web Push VAPID notifications for Jumpedia.
 *
 * Uses native Web Crypto API + fetch() — NO Node.js dependencies.
 * Compatible with CF Workers, Deno, Bun, and any edge runtime.
 *
 * Endpoint: POST /push-batch
 * Auth:     Authorization: Bearer <PUSH_WORKER_SECRET>
 * Health:   GET /health (public)
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function base64UrlEncode(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (const b of bytes) str += String.fromCharCode(b);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function concatBuffers(...buffers) {
    const totalLength = buffers.reduce((sum, b) => sum + b.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const b of buffers) {
        result.set(new Uint8Array(b), offset);
        offset += b.byteLength;
    }
    return result;
}

// ─── VAPID JWT ───────────────────────────────────────────────────────────────

async function createVapidJwt(audience, subject, publicKeyB64, privateKeyB64) {
    // Import ECDSA P-256 private key
    const rawPrivateKey = base64UrlDecode(privateKeyB64);
    const rawPublicKey = base64UrlDecode(publicKeyB64);

    // Build JWK from raw keys
    const jwk = {
        kty: 'EC',
        crv: 'P-256',
        x: base64UrlEncode(rawPublicKey.slice(1, 33)),
        y: base64UrlEncode(rawPublicKey.slice(33, 65)),
        d: base64UrlEncode(rawPrivateKey),
    };

    const key = await crypto.subtle.importKey(
        'jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
    );

    // JWT Header + Payload
    const header = { typ: 'JWT', alg: 'ES256' };
    const expiry = Math.floor(Date.now() / 1000) + (12 * 60 * 60); // 12 hours
    const payload = { aud: audience, exp: expiry, sub: subject };

    const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
    const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
    const unsignedToken = `${headerB64}.${payloadB64}`;

    // Sign
    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        key,
        new TextEncoder().encode(unsignedToken)
    );

    // Convert DER signature to raw r||s (64 bytes)
    const sigBytes = new Uint8Array(signature);
    let rawSig;
    if (sigBytes.length === 64) {
        rawSig = sigBytes;
    } else {
        // DER encoded — parse r and s values
        rawSig = derToRaw(sigBytes);
    }

    return `${unsignedToken}.${base64UrlEncode(rawSig)}`;
}

function derToRaw(der) {
    // DER: 0x30 [len] 0x02 [rlen] [r] 0x02 [slen] [s]
    const raw = new Uint8Array(64);
    let offset = 2; // skip 0x30 [totalLen]
    // r
    offset++; // skip 0x02
    const rLen = der[offset++];
    const r = der.slice(offset, offset + rLen);
    offset += rLen;
    // s
    offset++; // skip 0x02
    const sLen = der[offset++];
    const s = der.slice(offset, offset + sLen);

    // Pad r and s to 32 bytes each (remove leading zero if present)
    raw.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
    raw.set(s.length > 32 ? s.slice(s.length - 32) : s, 64 - Math.min(s.length, 32));
    return raw;
}

// ─── Web Push Encryption (RFC 8291 / aes128gcm) ─────────────────────────────

async function encryptPayload(clientPublicKeyB64, authSecretB64, payload) {
    const clientPublicKeyRaw = base64UrlDecode(clientPublicKeyB64);
    const authSecret = base64UrlDecode(authSecretB64);
    const payloadBytes = new TextEncoder().encode(payload);

    // Import client's public key
    const clientPublicKey = await crypto.subtle.importKey(
        'raw', clientPublicKeyRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, []
    );

    // Generate server ephemeral key pair
    const serverKeyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
    );

    // ECDH shared secret
    const sharedSecret = await crypto.subtle.deriveBits(
        { name: 'ECDH', public: clientPublicKey },
        serverKeyPair.privateKey,
        256 // 32 bytes
    );

    const serverPublicKeyRaw = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey);

    // PRK = HKDF-Extract(salt=authSecret, IKM=sharedSecret)
    const prk = await hkdfExtract(authSecret, new Uint8Array(sharedSecret));

    // IKM for content encryption
    const keyInfo = concatBuffers(
        new TextEncoder().encode('WebPush: info\0'),
        clientPublicKeyRaw,
        new Uint8Array(serverPublicKeyRaw)
    );
    const ikm = await hkdfExpand(prk, keyInfo, 32);

    // Salt for content encryption
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // PRK for content encryption
    const contentPrk = await hkdfExtract(salt, ikm);

    // Content Encryption Key (CEK) — 16 bytes
    const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
    const cek = await hkdfExpand(contentPrk, cekInfo, 16);

    // Nonce — 12 bytes
    const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
    const nonce = await hkdfExpand(contentPrk, nonceInfo, 12);

    // AES-128-GCM encrypt (payload + padding delimiter 0x02)
    const paddedPayload = concatBuffers(payloadBytes, new Uint8Array([2]));

    const aesKey = await crypto.subtle.importKey(
        'raw', cek, { name: 'AES-GCM' }, false, ['encrypt']
    );
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce }, aesKey, paddedPayload
    );

    // Build aes128gcm header: salt(16) + rs(4) + keyIdLen(1) + keyId(65)
    const rs = new DataView(new ArrayBuffer(4));
    rs.setUint32(0, 4096);

    const header = concatBuffers(
        salt,
        new Uint8Array(rs.buffer),
        new Uint8Array([65]),
        new Uint8Array(serverPublicKeyRaw)
    );

    return concatBuffers(header, new Uint8Array(encrypted));
}

// HKDF helper functions using Web Crypto

async function hkdfExtract(salt, ikm) {
    const key = await crypto.subtle.importKey(
        'raw', salt.length ? salt : new Uint8Array(32),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const prk = await crypto.subtle.sign('HMAC', key, ikm);
    return new Uint8Array(prk);
}

async function hkdfExpand(prk, info, length) {
    const key = await crypto.subtle.importKey(
        'raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const infoWithCounter = concatBuffers(info, new Uint8Array([1]));
    const output = await crypto.subtle.sign('HMAC', key, infoWithCounter);
    return new Uint8Array(output).slice(0, length);
}

// ─── Send Push ───────────────────────────────────────────────────────────────

async function sendPush(subscription, payload, env) {
    try {
        const payloadString = JSON.stringify(payload);
        const encryptedBody = await encryptPayload(
            subscription.keys.p256dh,
            subscription.keys.auth,
            payloadString
        );

        const endpoint = new URL(subscription.endpoint);
        const audience = `${endpoint.protocol}//${endpoint.host}`;

        const jwt = await createVapidJwt(
            audience,
            env.VAPID_SUBJECT,
            env.VAPID_PUBLIC_KEY,
            env.VAPID_PRIVATE_KEY
        );

        const vapidPublicKeyRaw = base64UrlDecode(env.VAPID_PUBLIC_KEY);

        const response = await fetch(subscription.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Encoding': 'aes128gcm',
                'TTL': '86400',
                'Authorization': `vapid t=${jwt}, k=${base64UrlEncode(vapidPublicKeyRaw)}`,
                'Urgency': 'normal',
            },
            body: encryptedBody,
        });

        if (response.ok) {
            return { status: 200 };
        }

        const body = await response.text().catch(() => '');
        console.error(`Push failed [${response.status}]: ${body}`, {
            endpoint: subscription.endpoint?.substring(0, 60),
        });
        return { status: response.status, error: body || response.statusText };
    } catch (err) {
        console.error(`Push exception: ${err.message}`, {
            endpoint: subscription.endpoint?.substring(0, 60),
        });
        return { status: 500, error: err.message };
    }
}

// ─── Rate Limiter ────────────────────────────────────────────────────────────

const rateLimitMap = new Map();

function checkRateLimit(ip) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + 1000 });
        return true;
    }
    if (entry.count >= 10) return false;
    entry.count++;
    return true;
}

// ─── Worker ──────────────────────────────────────────────────────────────────

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Health check (public)
        if (request.method === 'GET' && url.pathname === '/health') {
            return Response.json({ ok: true, service: 'push-service', ts: Date.now() });
        }

        // Rate limiting
        const clientIp = request.headers.get('CF-Connecting-IP') ?? 'unknown';
        if (!checkRateLimit(clientIp)) {
            return new Response('Too Many Requests', {
                status: 429,
                headers: { 'Retry-After': '1' },
            });
        }

        // Auth check
        const authHeader = request.headers.get('Authorization') ?? '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        if (!token || token !== env.PUSH_WORKER_SECRET) {
            return new Response('Unauthorized', { status: 401 });
        }

        // POST /push-batch
        if (request.method === 'POST' && url.pathname === '/push-batch') {
            let body;
            try {
                body = await request.json();
            } catch {
                return new Response('Bad Request: invalid JSON', { status: 400 });
            }

            if (!Array.isArray(body?.notifications)) {
                return new Response('Bad Request: notifications must be array', { status: 400 });
            }

            const results = [];

            for (const item of body.notifications) {
                if (!item.payload || !Array.isArray(item.subscriptions)) continue;

                const itemResults = await Promise.all(
                    item.subscriptions.map(async (sub) => {
                        const result = await sendPush(sub, item.payload, env);
                        return {
                            endpoint: sub.endpoint,
                            status: result.status,
                            ...(result.error ? { error: result.error } : {}),
                        };
                    })
                );

                results.push(...itemResults);
            }

            return Response.json({ results, ts: Date.now() });
        }

        return new Response('Not Found', { status: 404 });
    },
};
