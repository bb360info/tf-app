'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type FontScaleContextType = {
    fontScale: number;
    setFontScale: (scale: number) => void;
    resetFontScale: () => void;
};

const FontScaleContext = createContext<FontScaleContextType | undefined>(undefined);

export function FontScaleProvider({ children }: { children: React.ReactNode }) {
    const [fontScale, setFontScaleState] = useState(1);

    useEffect(() => {
        // Hydrate from localStorage
        try {
            const saved = localStorage.getItem('jp-font-scale');
            if (saved) {
                const num = parseFloat(saved);
                if (!isNaN(num) && num >= 0.8 && num <= 1.5) {
                    // eslint-disable-next-line react-hooks/set-state-in-effect
                    setFontScaleState(num);
                    document.documentElement.style.setProperty('--font-scale', saved);
                }
            }
        } catch (_e) {
            console.warn('Failed to read font scale from localStorage', _e);
        }
    }, []);

    const setFontScale = (scale: number) => {
        const validScale = Math.min(Math.max(scale, 0.8), 1.5);
        setFontScaleState(validScale);
        document.documentElement.style.setProperty('--font-scale', validScale.toString());
        try {
            localStorage.setItem('jp-font-scale', validScale.toString());
        } catch (_e) {
            // Ignore quota errors
        }
    };

    const resetFontScale = () => {
        setFontScale(1);
    };

    return (
        <FontScaleContext.Provider value={{ fontScale, setFontScale, resetFontScale }}>
            {children}
        </FontScaleContext.Provider>
    );
}

export function useFontScale() {
    const context = useContext(FontScaleContext);
    if (context === undefined) {
        throw new Error('useFontScale must be used within a FontScaleProvider');
    }
    return context;
}
