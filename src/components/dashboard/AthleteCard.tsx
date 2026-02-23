'use client';

import { useMemo, useState } from 'react';
import { Calendar, Pencil, Trash2, Tag, TrendingUp, Bell, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AthleteWithStats } from '@/lib/pocketbase/services/athletes';
import { readinessLevel } from '@/lib/pocketbase/services/athletes';
import styles from './AthleteCard.module.css';

interface AthleteCardProps {
    athlete: AthleteWithStats;
    onClick: (id: string) => void;
    onEdit?: (athlete: AthleteWithStats) => void;
    onDelete?: (id: string) => Promise<void>;
    /** Send test notification to athlete */
    onNotify?: (id: string, name: string) => Promise<void>;
    /** Weekly training compliance 0-100 (optional, shown as circular badge) */
    weekCompliance?: number;
}

function initials(name: string): string {
    return name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0] ?? '')
        .join('')
        .toUpperCase();
}

function relativeDate(dateStr: string | undefined, t: ReturnType<typeof useTranslations>): string {
    if (!dateStr) return t('noLog');
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    if (diff === 0) return t('today');
    if (diff === 1) return t('yesterday');
    return t('daysAgo', { n: diff });
}

export function AthleteCard({ athlete, onClick, onEdit, onDelete, onNotify, weekCompliance }: AthleteCardProps) {
    const t = useTranslations('dashboard');
    const [isDeleting, setIsDeleting] = useState(false);
    const [notifySent, setNotifySent] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const handleNotify = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onNotify || isSending) return;
        setIsSending(true);
        try {
            await onNotify(athlete.user_id ?? athlete.id, athlete.name);
            setNotifySent(true);
            setTimeout(() => setNotifySent(false), 2000);
        } catch { /* non-critical */ }
        finally { setIsSending(false); }
    };

    const level = useMemo(
        () => (athlete.latestReadiness != null ? readinessLevel(athlete.latestReadiness) : null),
        [athlete.latestReadiness]
    );

    const scoreDisplay = athlete.latestReadiness != null
        ? `${athlete.latestReadiness}%`
        : t('noCheckin');

    const lastLogDisplay = relativeDate(athlete.lastLogDate, t);

    const handleDeleteClick = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Don't trigger card onClick
        if (!onDelete) return;

        const confirmed = window.confirm(
            t('deleteConfirm', { name: athlete.name })
        );
        if (!confirmed) return;

        setIsDeleting(true);
        try {
            await onDelete(athlete.id);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <article
            className={styles.card}
            onClick={() => onClick(athlete.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(athlete.id); }}
            aria-label={athlete.name}
        >
            {/* Avatar + Name */}
            <div className={styles.topRow}>
                <div className={styles.avatar} aria-hidden="true">
                    {initials(athlete.name)}
                </div>
                <div className={styles.info}>
                    <div className={styles.name}>{athlete.name}</div>
                    {athlete.birth_date && (
                        <div className={styles.meta}>
                            {t('yearsOld', { age: new Date().getFullYear() - new Date(athlete.birth_date).getFullYear() })}
                        </div>
                    )}
                </div>
                {/* Edit / Delete / Notify buttons */}
                <div className={styles.cardActions}>
                    {onNotify && (
                        <button
                            type="button"
                            className={styles.editBtn}
                            onClick={handleNotify}
                            disabled={isSending}
                            aria-label={`Send notification to ${athlete.name}`}
                            title="Send test notification"
                        >
                            {notifySent ? <Check size={14} aria-hidden="true" /> : <Bell size={14} aria-hidden="true" />}
                        </button>
                    )}
                    {onEdit && (
                        <button
                            type="button"
                            className={styles.editBtn}
                            onClick={(e) => { e.stopPropagation(); onEdit(athlete); }}
                            aria-label={`Edit ${athlete.name}`}
                        >
                            <Pencil size={14} aria-hidden="true" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            type="button"
                            className={styles.deleteBtn}
                            onClick={handleDeleteClick}
                            disabled={isDeleting}
                            aria-label={`Delete ${athlete.name}`}
                        >
                            <Trash2 size={14} aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>

            {/* Readiness */}
            <div>
                <div className={styles.readinessRow}>
                    <span className={styles.readinessLabel}>{t('readiness')}</span>
                    <div className={styles.readinessRight}>
                        {weekCompliance !== undefined && (
                            <span
                                className={styles.complianceBadge}
                                data-level={
                                    weekCompliance >= 80 ? 'high' :
                                        weekCompliance >= 50 ? 'medium' : 'low'
                                }
                                title={`${t('compliance')}: ${weekCompliance}%`}
                                aria-label={`${t('compliance')}: ${weekCompliance}%`}
                            >
                                <TrendingUp size={10} aria-hidden="true" />
                                {weekCompliance}%
                            </span>
                        )}
                        <span
                            className={styles.readinessScore}
                            data-level={level ?? 'none'}
                        >
                            {scoreDisplay}
                        </span>
                    </div>
                </div>
                {level && (
                    <div className={styles.readinessBar}>
                        <div
                            className={styles.readinessFill}
                            data-level={level}
                            style={{ width: `${athlete.latestReadiness}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Group badge */}
            {athlete.groupName && (
                <div className={styles.groupBadge} aria-label={t('group')}>
                    <Tag size={11} aria-hidden="true" />
                    <span>{athlete.groupName}</span>
                </div>
            )}

            {/* Last log */}
            <div className={styles.footerRow} aria-label={t('lastLog')}>
                <Calendar size={12} aria-hidden="true" />
                <span>{lastLogDisplay}</span>
            </div>
        </article>
    );
}
