'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextValue {
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
    /** Resolved theme applied to DOM ('light' | 'dark') */
    resolved: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue>({
    mode: 'auto',
    setMode: () => undefined,
    resolved: 'light',
});

export function useTheme() {
    return useContext(ThemeContext);
}

const STORAGE_KEY = 'jp-theme';

function resolveTheme(mode: ThemeMode, systemDark: boolean): 'light' | 'dark' {
    if (mode === 'auto') return systemDark ? 'dark' : 'light';
    return mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setModeState] = useState<ThemeMode>('auto');
    const [systemDark, setSystemDark] = useState(false);

    // Sync system preference
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: initial sync from system preference
        setSystemDark(mq.matches);

        const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // Load persisted mode
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
            if (stored && ['light', 'dark', 'auto'].includes(stored)) {
                // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: initial sync from localStorage
                setModeState(stored);
            }
        } catch {
            /* expected: localStorage unavailable (SSR) */
        }
    }, []);

    // Apply data-theme to <html>
    useEffect(() => {
        const resolved = resolveTheme(mode, systemDark);
        document.documentElement.setAttribute('data-theme', resolved);
    }, [mode, systemDark]);

    const setMode = useCallback((newMode: ThemeMode) => {
        setModeState(newMode);
        try {
            localStorage.setItem(STORAGE_KEY, newMode);
        } catch {
            /* non-critical: localStorage unavailable */
        }
    }, []);

    const resolved = resolveTheme(mode, systemDark);

    return (
        <ThemeContext.Provider value={{ mode, setMode, resolved }}>
            {children}
        </ThemeContext.Provider>
    );
}
