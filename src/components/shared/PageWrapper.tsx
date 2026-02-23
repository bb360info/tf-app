import React, { ReactNode } from 'react';
import styles from './PageWrapper.module.css';

interface PageWrapperProps {
    children: ReactNode;
    maxWidth?: 'narrow' | 'standard' | 'wide';
    className?: string;
}

export function PageWrapper({
    children,
    maxWidth = 'standard',
    className = '',
}: PageWrapperProps) {
    return (
        <div
            className={`${styles.wrapper} ${styles[maxWidth]} ${className}`}
        >
            {children}
        </div>
    );
}
