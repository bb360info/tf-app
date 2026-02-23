'use client';

import { useContext } from 'react';
import { ToastContext } from '@/components/ui/ToastProvider';

/**
 * Hook to show toast notifications.
 * Must be used within a <ToastProvider>.
 *
 * @example
 * const { showToast } = useToast();
 * showToast({ message: 'Saved!', type: 'success' });
 */
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a <ToastProvider>');
    }
    return context;
}
