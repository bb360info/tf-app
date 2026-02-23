'use client';

import { useMemo, useState } from 'react';
import { Moon, Zap, Smile, AlertCircle, X } from 'lucide-react';
import type { ReadinessDay } from '@/lib/pocketbase/services/readinessHistory';
import { readinessColor } from '@/lib/pocketbase/services/readinessHistory';
import { Skeleton } from '@/components/shared/Skeleton';
import { useTranslations } from 'next-intl';
import styles from './CnsHeatmap.module.css';

// ─── Day labels (Mon-Sun) ─────────────────────────────────────────
const DAY_LABELS: Record<string, string[]> = {
    ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    cn: ['一', '二', '三', '四', '五', '六', '日'],
};

// ─── Build calendar grid from data ───────────────────────────────
interface GridCell {
    date: string;
    score: number;
    color: 'green' | 'yellow' | 'red' | 'gray';
    // Raw checkin data for the detail sheet
    sleepHours?: number;
    sleepQuality?: number;
    mood?: number;
    painLevel?: number;
}

function buildGrid(data: ReadinessDay[], weeks: number): GridCell[][] {
    // Create a date→data map
    const dataMap = new Map<string, ReadinessDay>();
    for (const d of data) {
        dataMap.set(d.date, d);
    }

    const today = new Date();
    const grid: GridCell[][] = [];

    // Build from (weeks * 7) days ago to today
    for (let w = weeks - 1; w >= 0; w--) {
        const row: GridCell[] = [];
        for (let d = 0; d < 7; d++) {
            const date = new Date(today);
            date.setDate(today.getDate() - w * 7 - (6 - d));
            const dateStr = date.toISOString().split('T')[0];

            // Don't show future dates
            if (date > today) {
                row.push({ date: dateStr, score: -1, color: 'gray' });
            } else {
                const entry = dataMap.get(dateStr);
                const score = entry?.score ?? 0;
                row.push({
                    date: dateStr,
                    score,
                    color: score > 0 ? readinessColor(score) : 'gray',
                    sleepHours: entry?.sleepHours,
                    sleepQuality: entry?.sleepQuality,
                    mood: entry?.mood,
                    painLevel: entry?.painLevel,
                });
            }
        }
        grid.push(row);
    }

    return grid;
}

// ─── Color class mapping ──────────────────────────────────────────
function cellColorClass(color: 'green' | 'yellow' | 'red' | 'gray'): string {
    switch (color) {
        case 'green': return styles.cellGreen;
        case 'yellow': return styles.cellYellow;
        case 'red': return styles.cellRed;
        default: return styles.cellGray;
    }
}

function intensityClass(score: number): string {
    if (score >= 85) return styles.cellHigh;
    if (score >= 70) return styles.cellMid;
    if (score > 0) return styles.cellLow;
    return '';
}

// ─── Stars helper ─────────────────────────────────────────────────
function Stars({ value, max = 5 }: { value: number; max?: number }) {
    return (
        <span className={styles.stars} aria-label={`${value} из ${max}`}>
            {Array.from({ length: max }).map((_, i) => (
                <span
                    key={i}
                    className={`${styles.star} ${i < value ? styles.starFilled : ''}`}
                />
            ))}
        </span>
    );
}

// ─── Detail Sheet ──────────────────────────────────────────────────
interface DetailSheetProps {
    cell: GridCell;
    locale: string;
    onClose: () => void;
    t: ReturnType<typeof useTranslations<'analytics'>>;
}

function DetailSheet({ cell, locale, onClose, t }: DetailSheetProps) {
    const dateLabel = new Date(cell.date + 'T12:00:00').toLocaleDateString(
        locale === 'cn' ? 'zh-CN' : locale === 'ru' ? 'ru-RU' : 'en-US',
        { weekday: 'long', day: 'numeric', month: 'long' }
    );

    const hasData = cell.score > 0;

    return (
        <>
            {/* Backdrop */}
            <div
                className={styles.backdrop}
                onClick={onClose}
                role="presentation"
            />
            {/* Sheet */}
            <div className={styles.sheet} role="dialog" aria-modal="true">
                {/* Handle */}
                <div className={styles.sheetHandle} />

                {/* Header */}
                <div className={styles.sheetHeader}>
                    <div className={styles.sheetHeaderLeft}>
                        <span className={styles.sheetDate}>{dateLabel}</span>
                        {hasData && (
                            <span
                                className={styles.sheetScore}
                                data-color={cell.color}
                            >
                                {cell.score}%
                            </span>
                        )}
                    </div>
                    <button
                        className={styles.sheetClose}
                        onClick={onClose}
                        aria-label={t('close')}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                {!hasData ? (
                    <p className={styles.sheetNoData}>{t('noCheckinData')}</p>
                ) : (
                    <div className={styles.sheetRows}>
                        {/* Sleep duration */}
                        {cell.sleepHours != null && (
                            <div className={styles.sheetRow}>
                                <div className={styles.sheetRowIcon}>
                                    <Moon size={16} />
                                </div>
                                <span className={styles.sheetRowLabel}>{t('sleep')}</span>
                                <span className={styles.sheetRowValue}>
                                    {cell.sleepHours}h
                                </span>
                            </div>
                        )}
                        {/* Sleep quality */}
                        {cell.sleepQuality != null && (
                            <div className={styles.sheetRow}>
                                <div className={styles.sheetRowIcon}>
                                    <Moon size={16} />
                                </div>
                                <span className={styles.sheetRowLabel}>{t('sleepQuality')}</span>
                                <Stars value={cell.sleepQuality} />
                            </div>
                        )}
                        {/* Mood */}
                        {cell.mood != null && (
                            <div className={styles.sheetRow}>
                                <div className={styles.sheetRowIcon}>
                                    <Smile size={16} />
                                </div>
                                <span className={styles.sheetRowLabel}>{t('mood')}</span>
                                <Stars value={cell.mood} />
                            </div>
                        )}
                        {/* Pain / soreness */}
                        {cell.painLevel != null && (
                            <div className={styles.sheetRow}>
                                <div className={styles.sheetRowIcon} data-warn={cell.painLevel >= 3 ? 'true' : 'false'}>
                                    <AlertCircle size={16} />
                                </div>
                                <span className={styles.sheetRowLabel}>{t('soreness')}</span>
                                <Stars value={cell.painLevel} />
                            </div>
                        )}
                        {/* Readiness score bar */}
                        <div className={styles.sheetScoreBar}>
                            <div className={styles.sheetScoreBarLabel}>
                                <Zap size={14} />
                                <span>{t('readiness')}</span>
                            </div>
                            <div className={styles.sheetScoreBarTrack}>
                                <div
                                    className={styles.sheetScoreBarFill}
                                    data-color={cell.color}
                                    style={{ width: `${cell.score}%` }}
                                />
                            </div>
                            <span className={styles.sheetScoreBarValue}>{cell.score}%</span>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

// ─── Component ────────────────────────────────────────────────────
interface CnsHeatmapProps {
    data: ReadinessDay[];
    title: string;
    weeks?: number;
    locale?: string;
    isLoading?: boolean;
}

export function CnsHeatmap({ data, title, weeks = 12, locale = 'ru', isLoading }: CnsHeatmapProps) {
    const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
    const dayLabels = DAY_LABELS[locale] || DAY_LABELS.ru;
    const t = useTranslations('analytics');

    const grid = useMemo(() => buildGrid(data, weeks), [data, weeks]);

    if (isLoading) {
        return (
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <span className={styles.title}>{title}</span>
                </div>
                <Skeleton variant="rectangular" height={160} />
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <span className={styles.title}>{title}</span>
                </div>
                <div className={styles.noData}>{t('noData')}</div>
            </div>
        );
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <span className={styles.title}>{title}</span>
            </div>

            {/* Grid */}
            <div className={styles.grid}>
                {/* Day labels */}
                {dayLabels.map((label) => (
                    <div key={label} className={styles.dayLabel}>{label}</div>
                ))}

                {/* Cells */}
                {grid.map((week) =>
                    week.map((cell) => (
                        <button
                            key={cell.date}
                            className={`${styles.cell} ${cellColorClass(cell.color)} ${intensityClass(cell.score)}`}
                            onClick={() => setSelectedCell(cell)}
                            aria-label={`${cell.date}: ${cell.score > 0 ? cell.score : '—'}`}
                            type="button"
                        >
                            <span className={styles.cellScore}>
                                {cell.score > 0 ? cell.score : '—'}
                            </span>
                        </button>
                    )),
                )}
            </div>

            {/* Legend */}
            <div className={styles.legendRow}>
                <span>{t('cnsLow')}</span>
                <div className={styles.legendScale}>
                    <div className={styles.legendSwatch} style={{ background: 'var(--color-bg-tertiary)' }} />
                    <div className={styles.legendSwatch} style={{ background: 'var(--color-error)', opacity: 0.35 }} />
                    <div className={styles.legendSwatch} style={{ background: 'var(--color-warning)', opacity: 0.65 }} />
                    <div className={styles.legendSwatch} style={{ background: 'var(--color-success)' }} />
                </div>
                <span>{t('cnsHigh')}</span>
            </div>

            {/* Detail Sheet */}
            {selectedCell && (
                <DetailSheet
                    cell={selectedCell}
                    locale={locale}
                    onClose={() => setSelectedCell(null)}
                    t={t}
                />
            )}
        </div>
    );
}
