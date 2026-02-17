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
    register: (email: string, password: string, name: string) => Promise<void>;
    loginGoogle: () => Promise<void>;
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
        async (email: string, password: string, name: string) => {
            await registerWithEmail(email, password, name);
        },
        []
    );

    const loginGoogle = useCallback(async () => {
        await loginWithGoogle();
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

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
