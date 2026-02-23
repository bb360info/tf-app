'use client';

import { Zap, Timer, Dumbbell, TrendingUp, TrendingDown } from 'lucide-react';
import type { TestType } from '@/lib/pocketbase/types';
import type { TestResultWithDelta } from '@/lib/pocketbase/services/testResults';
import { testUnit } from '@/lib/pocketbase/services/testResults';
import styles from './TestResultCard.module.css';

// ─── Icon mapping ─────────────────────────────────────────────────
function TestIcon({ type }: { type: TestType }) {
    switch (type) {
        case 'standing_jump':
        case 'approach_jump':
            return <Zap size={18} aria-hidden="true" />;
        case 'sprint_30m':
        case 'sprint_60m':
            return <Timer size={18} aria-hidden="true" />;
        default:
            return <Dumbbell size={18} aria-hidden="true" />;
    }
}

// ─── Delta chip ───────────────────────────────────────────────────
function DeltaChip({ delta, unit }: { delta: number; unit: string }) {
    const isPositive = delta > 0;
    return (
        <span
            className={`${styles.delta} ${isPositive ? styles.deltaPositive : styles.deltaNegative}`}
            aria-label={`${isPositive ? 'Increased' : 'Decreased'} by ${Math.abs(delta)} ${unit}`}
        >
            {isPositive ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />} {Math.abs(delta).toFixed(1)}
        </span>
    );
}

// ─── Component ────────────────────────────────────────────────────
interface TestResultCardProps {
    result: TestResultWithDelta;
    testType: TestType;
    testName: string;
    pbLabel: string;
    onClick?: () => void;
}

export function TestResultCard({
    result,
    testType,
    testName,
    pbLabel,
    onClick,
}: TestResultCardProps) {
    const unit = testUnit(testType);
    const formattedDate = new Date(result.date).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
    });

    return (
        <div
            className={styles.card}
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
            aria-label={`${testName}: ${result.value} ${unit}`}
        >
            {/* Icon + Name + PB */}
            <div className={styles.topRow}>
                <div className={styles.iconWrap}>
                    <TestIcon type={testType} />
                </div>
                <span className={styles.testName}>{testName}</span>
                {result.isPB && (
                    <span className={styles.pbBadge} aria-label={pbLabel}>
                        {pbLabel}
                    </span>
                )}
            </div>

            {/* Value + delta */}
            <div className={styles.valueRow}>
                <span className={styles.value}>{result.value}</span>
                <span className={styles.unit}>{unit}</span>
                {result.delta !== undefined && result.delta !== 0 && (
                    <DeltaChip delta={result.delta} unit={unit} />
                )}
            </div>

            {/* Date */}
            <div className={styles.date}>{formattedDate}</div>
        </div>
    );
}
