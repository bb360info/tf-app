'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class DashboardErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Dashboard Section Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div style={{
                    padding: 'var(--space-4)',
                    border: '1px dashed var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-bg-secondary)',
                    textAlign: 'center'
                }}>
                    <p style={{ color: 'var(--color-text-primary)', margin: 0, fontWeight: 'var(--weight-semibold)' }}>
                        Section failed to load
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={{
                            marginTop: 'var(--space-2)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-accent-primary)',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                        }}
                    >
                        Try again
                    </button>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-2)' }}>
                        {this.state.error?.message}
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}
