'use client';

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    type ReactNode,
} from 'react';
import pb from '@/lib/pocketbase/client';
import type { UsersRecord } from '@/lib/pocketbase/types';
import type { RecordAuthResponse } from 'pocketbase';
import {
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    logout as pbLogout,
    requestPasswordReset,
    getCurrentUser,
    isAuthenticated,
} from '@/lib/pocketbase/auth';

interface AuthState {
    user: UsersRecord | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
    login: (email: string, password: string) => Promise<void>;
    register: (params: {
        email: string;
        password: string;
        first_name: string;
        last_name: string;
        role?: 'coach' | 'athlete';
        allowAthleteViaInvite?: boolean;
    }) => Promise<void>;
    loginGoogle: () => Promise<RecordAuthResponse<UsersRecord>>;
    logout: () => void;
    resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        isLoading: true,
        isAuthenticated: false,
    });

    // Initialize auth state from stored token
    useEffect(() => {
        const user = getCurrentUser();
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: initial sync from authStore
        setState({
            user,
            isLoading: false,
            isAuthenticated: isAuthenticated(),
        });

        // Subscribe to auth changes
        const unsubscribe = pb.authStore.onChange(() => {
            const currentUser = getCurrentUser();
            setState({
                user: currentUser,
                isLoading: false,
                isAuthenticated: isAuthenticated(),
            });
        });

        return () => unsubscribe();
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        await loginWithEmail(email, password);
    }, []);

    const register = useCallback(
        async (params: {
            email: string;
            password: string;
            first_name: string;
            last_name: string;
            role?: 'coach' | 'athlete';
            allowAthleteViaInvite?: boolean;
        }) => {
            await registerWithEmail(params);
        },
        []
    );

    const loginGoogle = useCallback(async () => {
        return loginWithGoogle();
    }, []);

    const logout = useCallback(() => {
        pbLogout();
    }, []);

    const resetPassword = useCallback(async (email: string) => {
        await requestPasswordReset(email);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                ...state,
                login,
                register,
                loginGoogle,
                logout,
                resetPassword,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Auth context hook — provides auth ACTIONS: login, logout, register, resetPassword.
 * Use this when you need to PERFORM auth operations (forms, auth guards).
 *
 * For read-only role/state checks use `@/lib/hooks/useAuth` instead —
 * it provides: isCoach, isAthlete, isLoggedIn, role.
 */
export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
