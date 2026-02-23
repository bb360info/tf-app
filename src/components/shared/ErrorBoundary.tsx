'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import styles from './ErrorBoundary.module.css';

// ─── Types ────────────────────────────────────────────────────────

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    /** i18n labels — class components cannot use hooks */
    labels?: {
        title: string;
        fallbackMessage: string;
        retry: string;
    };
    /**
     * Called when an error is caught — use for telemetry reporting.
     */
    onError?: (error: Error, info: { componentStack: string | null }) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

// ─── ErrorBoundary ────────────────────────────────────────────────

/**
 * Glassmorphism Error Boundary for the Jumpedia app.
 * Catches runtime errors in children and shows a recovery UI.
 * Uses class component — hooks cannot be used in error boundaries.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        // Report to telemetry if handler provided
        this.props.onError?.(error, { componentStack: info.componentStack ?? null });

        // Also log to console in dev
        if (process.env.NODE_ENV === 'development') {
            console.error('[ErrorBoundary] caught:', error, info);
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            // Allow custom fallback
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className={styles.overlay} role="alert" aria-live="assertive">
                    <div className={styles.card}>
                        <div className={styles.iconWrap}>
                            <AlertTriangle className={styles.icon} size={32} aria-hidden="true" />
                        </div>
                        <h2 className={styles.title}>{this.props.labels?.title ?? 'Something went wrong'}</h2>
                        <p className={styles.message}>
                            {this.state.error?.message ?? (this.props.labels?.fallbackMessage ?? 'An unexpected error occurred')}
                        </p>
                        <button
                            className={styles.retryBtn}
                            onClick={this.handleRetry}
                            type="button"
                        >
                            <RefreshCw size={16} aria-hidden="true" />
                            {this.props.labels?.retry ?? 'Try again'}
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
