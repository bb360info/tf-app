import { useState, useEffect, useCallback, useRef } from 'react';
import { listTemplates, TrainingTemplateWithItems } from '@/lib/pocketbase/services/templates';

interface UseTemplatesOptions {
    /** 
     * If true, triggers a background revalidation (fetch) of templates 
     * exactly once every time it flips from false to true.
     */
    isOpen?: boolean;
    /**
     * Optional filter by template type
     */
    type?: 'warmup' | 'training_day';
}

/**
 * Custom hook implementing a simple Stale-While-Revalidate (SWR) pattern 
 * for training templates. Provides caching, loading states, and background 
 * validation without requiring manual refresh.
 */
export function useTemplates({ isOpen = true, type }: UseTemplatesOptions = {}) {
    const [templates, setTemplates] = useState<TrainingTemplateWithItems[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Track if we have EVER successfully fetched data for this hook instance
    const hasFetched = useRef(false);

    const fetchTemplates = useCallback(async (isBackground: boolean) => {
        // If it's the first time ever, it's a hard load. Otherwise, it's a background validation.
        if (!isBackground) setIsLoading(true);
        if (isBackground) setIsValidating(true);
        setError(null);

        try {
            const data = await listTemplates(type);
            setTemplates(data);
            hasFetched.current = true;
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('useTemplates fetch error:', err);
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            if (!isBackground) setIsLoading(false);
            if (isBackground) setIsValidating(false);
        }
    }, [type]);

    // Initial fetch
    useEffect(() => {
        // If it starts out as Open, do an immediate fetch.
        if (isOpen && !hasFetched.current) {
            fetchTemplates(false);
        }
    }, [isOpen, fetchTemplates]);

    // Refetch when isOpen flip from false -> true, after initial fetch
    useEffect(() => {
        if (isOpen && hasFetched.current) {
            fetchTemplates(true);
        }
    }, [isOpen, fetchTemplates]);

    return {
        templates,
        isLoading,
        isValidating,
        error,
        refresh: () => fetchTemplates(true),
    };
}
