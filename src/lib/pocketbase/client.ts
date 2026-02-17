import PocketBase from 'pocketbase';

/**
 * PocketBase singleton client.
 * URL from NEXT_PUBLIC_POCKETBASE_URL env, defaults to http://localhost:8090
 */
const pb = new PocketBase(
    typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_POCKETBASE_URL ?? 'http://localhost:8090')
        : 'http://localhost:8090'
);

// Disable auto-cancellation for concurrent requests
pb.autoCancellation(false);

export default pb;
