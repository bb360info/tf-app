import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
    className?: string;
    variant?: 'rectangular' | 'circular' | 'text' | 'card';
    width?: string | number;
    height?: string | number;
    style?: React.CSSProperties;
}

export function Skeleton({
    className = '',
    variant = 'rectangular',
    width,
    height,
    style
}: SkeletonProps) {
    return (
        <div
            className={`${styles.skeleton} ${styles[variant]} ${className}`}
            style={{ width, height, ...style }}
            aria-hidden="true"
        />
    );
}
