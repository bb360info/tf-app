'use client';

/**
 * useOnlineStatus — reactive browser online/offline status.
 * Returns true when navigator.onLine is true, false when offline.
 * Safe: returns true on SSR (no window available).
 */

import { useState, useEffect } from 'react';

export function useOnlineStatus(): boolean {
    const [online, setOnline] = useState<boolean>(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );

    useEffect(() => {
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return online;
}
