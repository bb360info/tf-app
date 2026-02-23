'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { CategoryLoad } from '@/lib/pocketbase/services/trainingLoad';
import { CATEGORY_LABELS } from '@/lib/pocketbase/services/trainingLoad';
import { Skeleton } from '@/components/shared/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PieChart as PieChartIcon } from 'lucide-react';
import styles from './TrainingLoadPie.module.css';

// ─── Lazy-load Recharts PieChart ──────────────────────────────────
const ResponsiveContainer = dynamic(
    () => import('recharts').then((m) => ({ default: m.ResponsiveContainer })),
    { ssr: false }
);
const PieChart = dynamic(
    () => import('recharts').then((m) => ({ default: m.PieChart })),
    { ssr: false }
);
const Pie = dynamic(
    () => import('recharts').then((m) => ({ default: m.Pie })),
    { ssr: false }
);
const Cell = dynamic(
    () => import('recharts').then((m) => ({ default: m.Cell })),
    { ssr: false }
);

// ─── Resolve CSS vars to hex ──────────────────────────────────────
function useCategoryColors(data: CategoryLoad[]) {
    return useMemo(() => {
        if (typeof window === 'undefined') return {};
        const style = getComputedStyle(document.documentElement);
        const map: Record<string, string> = {};
        for (const item of data) {
            const raw = style.getPropertyValue(item.colorVar).trim();
            map[item.category] = raw || '#888888';
        }
        return map;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: read CSS vars once on mount, data.length check is enough
    }, [data.length]);
}

// ─── Component ────────────────────────────────────────────────────
interface TrainingLoadPieProps {
    data: CategoryLoad[];
    title: string;
    locale?: string;
    isLoading?: boolean;
}

export function TrainingLoadPie({ data, title, locale = 'ru', isLoading }: TrainingLoadPieProps) {
    const colorsMap = useCategoryColors(data);

    const chartData = useMemo(
        () => data.map((d) => ({
            name: CATEGORY_LABELS[d.category]?.[locale] || d.category,
            value: d.count,
            category: d.category,
        })),
        [data, locale],
    );

    if (isLoading) {
        return (
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <span className={styles.title}>{title}</span>
                </div>
                <div className={styles.chartArea} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Skeleton variant="circular" height={160} width={160} />
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <span className={styles.title}>{title}</span>
                </div>
                <EmptyState
                    icon={PieChartIcon}
                    title={locale === 'ru' ? 'Нет данных об упражнениях' : locale === 'cn' ? '暂无训练数据' : 'No exercise data available'}
                />
            </div>
        );
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <span className={styles.title}>{title}</span>
            </div>

            <div className={styles.chartArea}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius="55%"
                            outerRadius="80%"
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                        >
                            {chartData.map((entry) => (
                                <Cell
                                    key={entry.category}
                                    fill={colorsMap[entry.category] || '#888'}
                                />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className={styles.legend}>
                {data.map((d) => (
                    <div key={d.category} className={styles.legendItem}>
                        <span
                            className={styles.legendDot}
                            style={{ background: colorsMap[d.category] || '#888' }}
                        />
                        <span>{CATEGORY_LABELS[d.category]?.[locale] || d.category}</span>
                        <span className={styles.legendPercent}>{d.percentage}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
