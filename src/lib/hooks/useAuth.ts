'use client';

import { useState, useEffect } from 'react';
import pb from '@/lib/pocketbase/client';
import type { UserRole } from '@/lib/pocketbase/types';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    verified: boolean;
}

export interface UseAuthReturn {
    user: AuthUser | null;
    role: UserRole | null;
    isCoach: boolean;
    isAthlete: boolean;
    isAdmin: boolean;
    isLoggedIn: boolean;
    isLoading: boolean;
}

/**
 * Reactive role-aware auth hook — subscribes to pb.authStore.onChange.
 * Returns the current user and derived role flags (isCoach, isAthlete, isAdmin, isLoggedIn).
 *
 * Use this for READ-ONLY role/state checks anywhere in the app.
 * For auth ACTIONS (login, logout, register) use `@/lib/pocketbase/AuthProvider` instead.
 */
export function useAuth(): UseAuthReturn {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        // Helper to derive user from authStore
        function syncUser() {
            const record = pb.authStore.record;
            if (pb.authStore.isValid && record) {
                setUser({
                    id: record.id as string,
                    name: (record.name as string) || '',
                    email: (record.email as string) || '',
                    role: (record.role as UserRole) ?? null,
                    verified: (record.verified as boolean) ?? false,
                });
            } else {
                setUser(null);
            }
            setIsLoading(false);
        }

        // Sync immediately on mount
        syncUser();

        // Subscribe to auth changes (login / logout / token refresh)
        const unsubscribe = pb.authStore.onChange(() => {
            syncUser();
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const role = user?.role ?? null;

    return {
        user,
        role,
        isCoach: role === 'coach',
        isAthlete: role === 'athlete',
        isAdmin: role === 'admin',
        isLoggedIn: user !== null,
        isLoading,
    };
}
