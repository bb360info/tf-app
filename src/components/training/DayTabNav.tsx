'use client';

/**
 * DayTabNav — 7-day horizontal tab bar for AthleteTrainingView.
 * Shows adaptive labels (2-char on ≥375px, 1-char on <375px),
 * Moon icon for rest days, progress dot for logged days.
 * Scrolls active tab into view on selection.
 */

import { useEffect, useRef } from 'react';
import { Moon } from 'lucide-react';
import styles from './DayTabNav.module.css';

export interface DayTabData {
    dayIdx: number;
    /** Full 2-char label, e.g. "Пн", "Вт" */
    label2: string;
    /** Short 1-char label for <375px, e.g. "П", "В" */
    label1: string;
    isToday: boolean;
    isPast: boolean;
    isRest: boolean;
    /** Show green dot — at least one session logged */
    hasLog: boolean;
    loggedCount: number;
    totalSessions: number;
}

interface DayTabNavProps {
    days: DayTabData[];
    selectedDay: number;
    onSelect: (dayIdx: number) => void;
}

export function DayTabNav({ days, selectedDay, onSelect }: DayTabNavProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const activeTabRef = useRef<HTMLButtonElement>(null);

    // Scroll active tab into view whenever selectedDay changes
    useEffect(() => {
        if (activeTabRef.current && scrollRef.current) {
            activeTabRef.current.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest',
            });
        }
    }, [selectedDay]);

    return (
        <div
            ref={scrollRef}
            className={styles.nav}
            role="tablist"
            aria-label="Дни недели"
        >
            {days.map((day) => {
                const isSelected = day.dayIdx === selectedDay;
                const tabClassName = [
                    styles.tab,
                    isSelected ? styles.tabActive : '',
                    day.isToday && !isSelected ? styles.tabToday : '',
                    day.isPast ? styles.tabPast : '',
                    day.isRest ? styles.tabRest : '',
                ].filter(Boolean).join(' ');

                return (
                    <button
                        key={day.dayIdx}
                        ref={isSelected ? activeTabRef : undefined}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        className={tabClassName}
                        onClick={() => onSelect(day.dayIdx)}
                    >
                        {day.isRest ? (
                            <Moon
                                size={14}
                                className={styles.restIcon}
                                aria-label="Отдых"
                            />
                        ) : (
                            <>
                                {/* 2-char label (≥375px) */}
                                <span className={styles.label2} aria-hidden="true">
                                    {day.label2}
                                </span>
                                {/* 1-char label (<375px) */}
                                <span className={styles.label1} aria-hidden="true">
                                    {day.label1}
                                </span>
                            </>
                        )}

                        {/* Progress dot */}
                        {!day.isRest && (
                            <span
                                className={[
                                    styles.dot,
                                    day.hasLog ? styles.dotLogged : '',
                                    day.loggedCount > 0 && day.loggedCount < day.totalSessions
                                        ? styles.dotPartial
                                        : '',
                                ].filter(Boolean).join(' ')}
                                aria-hidden="true"
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
