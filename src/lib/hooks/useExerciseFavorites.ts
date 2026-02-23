/**
 * Hook: useExerciseFavorites
 * Persists exercise favorites in localStorage.
 * In Track 6 — migrate to PocketBase collection for cross-device sync.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'jp_exercise_favorites';

function readFromStorage(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const arr = raw ? (JSON.parse(raw) as string[]) : [];
        return new Set(arr);
    } catch {
        /* expected: corrupt localStorage */
        return new Set();
    }
}

function writeToStorage(ids: Set<string>): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
        /* non-critical: storage full or unavailable */
    }
}

export function useExerciseFavorites() {
    const [favorites, setFavorites] = useState<Set<string>>(() => readFromStorage());

    // Sync across tabs
    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) {
                setFavorites(readFromStorage());
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const isFavorite = useCallback(
        (id: string) => favorites.has(id),
        [favorites]
    );

    const toggleFavorite = useCallback((id: string) => {
        setFavorites((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            writeToStorage(next);
            return next;
        });
    }, []);

    const getFavoriteIds = useCallback(
        () => [...favorites],
        [favorites]
    );

    return { isFavorite, toggleFavorite, getFavoriteIds, count: favorites.size };
}
