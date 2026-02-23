'use client';

import {
    createContext,
    useCallback,
    useState,
    useEffect,
    useRef,
    type ReactNode,
} from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import styles from './ToastProvider.module.css';

/* ── Types ────────────────────────────────────────────────────── */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    exiting?: boolean;
}

interface ShowToastOptions {
    message: string;
    type?: ToastType;
    duration?: number;
}

interface ToastContextValue {
    showToast: (options: ShowToastOptions) => void;
}

/* ── Context ──────────────────────────────────────────────────── */

export const ToastContext = createContext<ToastContextValue | null>(null);

/* ── Icons ────────────────────────────────────────────────────── */

const TOAST_ICONS: Record<ToastType, typeof CheckCircle2> = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const AUTO_DISMISS_MS = 3000;
const EXIT_ANIMATION_MS = 250;

/* ── Provider ─────────────────────────────────────────────────── */

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const dismiss = useCallback((id: string) => {
        // Start exit animation
        setToasts((prev) =>
            prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
        );

        // Remove after animation
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
            timersRef.current.delete(id);
        }, EXIT_ANIMATION_MS);
    }, []);

    const showToast = useCallback(
        ({ message, type = 'info', duration = AUTO_DISMISS_MS }: ShowToastOptions) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const toast: Toast = { id, message, type };
            setToasts((prev) => [...prev, toast]);

            const timer = setTimeout(() => dismiss(id), duration);
            timersRef.current.set(id, timer);
        },
        [dismiss]
    );

    // Cleanup timers on unmount
    useEffect(() => {
        const timers = timersRef.current;
        return () => {
            timers.forEach((timer) => clearTimeout(timer));
            timers.clear();
        };
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toasts.length > 0 && (
                <div className={styles.container} aria-live="polite" role="status">
                    {toasts.map((toast) => {
                        const Icon = TOAST_ICONS[toast.type];
                        return (
                            <div
                                key={toast.id}
                                className={`${styles.toast} ${styles[toast.type]} ${toast.exiting ? styles.exiting : ''}`}
                            >
                                <span className={styles.icon}>
                                    <Icon size={20} />
                                </span>
                                <span className={styles.message}>{toast.message}</span>
                                <button
                                    className={styles.closeBtn}
                                    onClick={() => dismiss(toast.id)}
                                    aria-label="Close"
                                    type="button"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </ToastContext.Provider>
    );
}
