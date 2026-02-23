'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { TestType } from '@/lib/pocketbase/types';
import type { TestResultRecord } from '@/lib/pocketbase/services/testResults';
import { testUnit } from '@/lib/pocketbase/services/testResults';
import { Skeleton } from '@/components/shared/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { BarChart3 } from 'lucide-react';
import styles from './ProgressChart.module.css';

// ─── Lazy-load Recharts (bundle: separate chunk, ~250KB) ──────────
const ResponsiveContainer = dynamic(
    () => import('recharts').then((m) => ({ default: m.ResponsiveContainer })),
    { ssr: false }
);
const LineChart = dynamic(
    () => import('recharts').then((m) => ({ default: m.LineChart })),
    { ssr: false }
);
const Line = dynamic(
    () => import('recharts').then((m) => ({ default: m.Line })),
    { ssr: false }
);
const XAxis = dynamic(
    () => import('recharts').then((m) => ({ default: m.XAxis })),
    { ssr: false }
);
const YAxis = dynamic(
    () => import('recharts').then((m) => ({ default: m.YAxis })),
    { ssr: false }
);
const CartesianGrid = dynamic(
    () => import('recharts').then((m) => ({ default: m.CartesianGrid })),
    { ssr: false }
);
const Tooltip = dynamic(
    () => import('recharts').then((m) => ({ default: m.Tooltip })),
    { ssr: false }
);

// ─── CSS var extraction (Recharts doesn't accept var() in props) ──
function useCssVars() {
    return useMemo(() => {
        if (typeof window === 'undefined') {
            return { accent: '#2383e2', border: '#e5e5e3', textTertiary: '#a1a1a1' };
        }
        const style = getComputedStyle(document.documentElement);
        return {
            accent: style.getPropertyValue('--color-accent-primary').trim() || '#2383e2',
            border: style.getPropertyValue('--color-border').trim() || '#e5e5e3',
            textTertiary: style.getPropertyValue('--color-text-tertiary').trim() || '#a1a1a1',
        };

    }, []);
}

// ─── Custom Tooltip ───────────────────────────────────────────────
interface TooltipProps {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
    unit: string;
}

function CustomTooltip({ active, payload, label, unit }: TooltipProps) {
    if (!active || !payload?.[0]) return null;
    return (
        <div className={styles.tooltip}>
            <div className={styles.tooltipLabel}>{label}</div>
            <div className={styles.tooltipValue}>
                {payload[0].value} {unit}
            </div>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────
interface ProgressChartProps {
    results: TestResultRecord[];
    testType: TestType;
    title: string;
    isLoading?: boolean;
    locale?: string;
    noDataMessage?: string;
}

export function ProgressChart({ results, testType, title, isLoading, locale, noDataMessage }: ProgressChartProps) {
    const { accent, border, textTertiary } = useCssVars();
    const unit = testUnit(testType);

    if (isLoading) {
        return (
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <span className={styles.title}>{title}</span>
                </div>
                <div className={styles.chartArea}>
                    <Skeleton variant="rectangular" height="100%" />
                </div>
            </div>
        );
    }

    if (results.length < 2) {
        return (
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <span className={styles.title}>{title}</span>
                </div>
                <EmptyState
                    icon={BarChart3}
                    title={noDataMessage ?? 'Need at least 2 results for chart'}
                />
            </div>
        );
    }

    const localeMap: Record<string, string> = { ru: 'ru-RU', en: 'en-US', cn: 'zh-CN' };
    const dateLocale = localeMap[locale ?? 'en'] ?? 'en-US';

    // Format data for Recharts
    const data = results.map((r) => ({
        date: new Date(r.date).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit' }),
        value: r.value,
    }));

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <span className={styles.title}>{title}</span>
            </div>
            <div className={styles.chartArea}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={border}
                            horizontal={true}
                            vertical={false}
                        />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: textTertiary }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: textTertiary }}
                            axisLine={false}
                            tickLine={false}
                            domain={['dataMin - 2', 'dataMax + 2']}
                        />
                        <Tooltip
                            content={<CustomTooltip unit={unit} />}
                            cursor={{ stroke: border, strokeWidth: 1 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={accent}
                            strokeWidth={2}
                            dot={{ fill: accent, r: 4, strokeWidth: 0 }}
                            activeDot={{ r: 6, fill: accent, strokeWidth: 0 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
