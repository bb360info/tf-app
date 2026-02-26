'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import type { PRTimelinePoint } from '@/lib/pocketbase/services/prProjection';
import type { Discipline } from '@/lib/pocketbase/types';
import { Skeleton } from '@/components/shared/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Trophy } from 'lucide-react';
import styles from './PRTimelineChart.module.css';

// ─── Lazy-load Recharts ──────────────────────────────────────────
const ResponsiveContainer = dynamic(() => import('recharts').then((m) => m.ResponsiveContainer), { ssr: false });
const Line = dynamic(() => import('recharts').then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((m) => m.Tooltip), { ssr: false });
const Scatter = dynamic(() => import('recharts').then((m) => m.Scatter), { ssr: false });
const ComposedChart = dynamic(() => import('recharts').then((m) => m.ComposedChart), { ssr: false });

function useCssVars() {
    return useMemo(() => {
        if (typeof window === 'undefined') {
            return { accent: '#2383e2', border: '#e5e5e3', textTertiary: '#a1a1a1', secondary: '#9ca3af' };
        }
        const style = getComputedStyle(document.documentElement);
        return {
            accent: style.getPropertyValue('--color-accent-primary').trim() || '#2383e2',
            border: style.getPropertyValue('--color-border').trim() || '#e5e5e3',
            textTertiary: style.getPropertyValue('--color-text-tertiary').trim() || '#a1a1a1',
            secondary: style.getPropertyValue('--color-text-secondary').trim() || '#9ca3af',
        };
    }, []);
}

interface TooltipProps {
    active?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload?: Array<any>;
    label?: string;
    unit: string;
}

function CustomTooltip({ active, payload, label, unit }: TooltipProps) {
    if (!active || !payload?.[0]) return null;
    const data = payload[0].payload as FormattedPoint;

    return (
        <div className={styles.tooltip}>
            <div className={styles.tooltipLabel}>{data.dateFormatted}</div>
            <div className={styles.tooltipValue}>
                {data.result} {unit}
                {data.is_pr && ' 🏆 PR'}
            </div>
            <span className={styles.tooltipMeta}>{data.competition_name}</span>
            <span className={styles.tooltipMeta}>{data.season_type}</span>
        </div>
    );
}

interface PRTimelineChartProps {
    points: PRTimelinePoint[];
    discipline: Discipline;
    title: string;
    isLoading?: boolean;
    locale?: string;
    t: ReturnType<typeof useTranslations>;
}

type FilterType = 'all' | 'indoor' | 'outdoor';

interface FormattedPoint extends PRTimelinePoint {
    dateFormatted: string;
    timeMs: number;
    prResult?: number; // Only set if this point is a PR
}

export function PRTimelineChart({ points, discipline, title, isLoading, locale, t }: PRTimelineChartProps) {
    const { accent, border, textTertiary, secondary } = useCssVars();
    const [filter, setFilter] = useState<FilterType>('all');

    // Jump events in track and field are measured in meters
    const unit = 'm';

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

    if (points.length === 0) {
        return (
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <span className={styles.title}>{title}</span>
                </div>
                <EmptyState
                    icon={Trophy}
                    title={t('noData') ?? 'No competition results found'}
                />
            </div>
        );
    }

    const localeMap: Record<string, string> = { ru: 'ru-RU', en: 'en-US', cn: 'zh-CN' };
    const dateLocale = localeMap[locale ?? 'en'] ?? 'en-US';

    const filteredPoints = points.filter(p => filter === 'all' || p.season_type === filter);

    // Format data for Recharts
    const data: FormattedPoint[] = filteredPoints.map(p => ({
        ...p,
        dateFormatted: new Date(p.date).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' }),
        timeMs: new Date(p.date).getTime(),
        prResult: p.is_pr ? p.result : undefined,
    }));

    // Generate step-line data for PR progression line
    const prProgression = [];
    let currentPR = data[0]?.result || 0;

    for (const d of data) {
        if (d.is_pr && d.result > currentPR) {
            currentPR = d.result;
        }
        prProgression.push({ ...d, currentPR });
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <span className={styles.title}>{title}</span>

                <div className={styles.filters}>
                    {(['all', 'indoor', 'outdoor'] as FilterType[]).map(f => (
                        <button
                            key={f}
                            className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {t(`filter.${f}`) ?? f}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.chartArea}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={prProgression} margin={{ top: 10, right: 10, bottom: 4, left: -20 }}>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={border}
                            horizontal={true}
                            vertical={false}
                        />
                        <XAxis
                            dataKey="dateFormatted"
                            tick={{ fontSize: 11, fill: textTertiary }}
                            axisLine={false}
                            tickLine={false}
                            minTickGap={30}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: textTertiary }}
                            axisLine={false}
                            tickLine={false}
                            domain={['dataMin - 0.2', 'dataMax + 0.2']}
                            tickFormatter={(value) => value.toFixed(2)}
                        />
                        <Tooltip
                            content={<CustomTooltip unit={unit} />}
                            cursor={{ stroke: border, strokeWidth: 1, strokeDasharray: '4 4' }}
                        />

                        {/* Step line showing the current PR level over time */}
                        <Line
                            type="stepAfter"
                            dataKey="currentPR"
                            stroke={accent}
                            strokeWidth={2}
                            dot={false}
                            activeDot={false}
                            isAnimationActive={false}
                        />

                        {/* Scatter points for all individual competition results */}
                        <Scatter
                            dataKey="result"
                            fill={secondary}
                            r={4}
                            isAnimationActive={false}
                        />

                        {/* Scatter points specifically for PRs (larger, highlighted) */}
                        <Scatter
                            dataKey="prResult"
                            fill={accent}
                            r={6}
                            isAnimationActive={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
