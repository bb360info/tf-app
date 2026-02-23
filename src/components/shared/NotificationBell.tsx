'use client';

import { useState } from 'react';
import { Bell, ClipboardList, Clock, Trophy, Info, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import type { NotificationsRecord } from '@/lib/pocketbase/types';
import {
    markRead,
    markAllRead,
} from '@/lib/pocketbase/services/notifications';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { reportError } from '@/lib/telemetry';
import pb from '@/lib/pocketbase/client';
import styles from './NotificationBell.module.css';

interface NotificationBellProps {
    /** i18n labels */
    labels?: {
        title: string;
        markAll: string;
        empty: string;
        showAll?: string;
    };
}

export function NotificationBell({ labels }: NotificationBellProps) {
    const [open, setOpen] = useState(false);
    const locale = useLocale();

    const userId = pb.authStore.record?.id ?? '';

    // SSE realtime + BG Sync polling — обновляется без перезагрузки страницы
    const { notifications, unreadCount, removeNotification, clearAll } = useNotifications(userId);
    const count = unreadCount;

    const handleToggle = () => setOpen((prev) => !prev);
    const handleClose = () => setOpen(false);

    const handleMarkRead = async (id: string) => {
        try {
            await markRead(id);
            removeNotification(id); // обновляет state через useNotifications
        } catch (err) {
            reportError(err instanceof Error ? err : new Error(String(err)));
        }
    };

    const handleMarkAll = async () => {
        try {
            await markAllRead();
            clearAll(); // сбрасывает весь список и счётчик
            setOpen(false);
        } catch {
            /* non-critical: notification marking */
        }
    };

    const formatTime = (dateStr: string) => {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '—';
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 60) return `${diffMin}m`;
        const diffH = Math.floor(diffMin / 60);
        if (diffH < 24) return `${diffH}h`;
        return `${Math.floor(diffH / 24)}d`;
    };

    // Map notification types to Lucide icons
    const typeIcon = (type: string) => {
        const iconProps = { size: 14, 'aria-hidden': true as const };
        const map: Record<string, React.ReactNode> = {
            plan_published: <ClipboardList {...iconProps} />,
            checkin_reminder: <Clock {...iconProps} />,
            achievement: <Trophy {...iconProps} />,
            system: <Info {...iconProps} />,
        };
        return map[type] ?? null;
    };

    return (
        <div className={styles.wrap}>
            <button
                type="button"
                className={styles.btn}
                onClick={handleToggle}
                aria-label={`Notifications${count > 0 ? ` (${count})` : ''}`}
                aria-expanded={open}
                aria-haspopup="dialog"
            >
                <Bell size={20} aria-hidden="true" />
                {count > 0 && (
                    <span className={styles.badge} aria-hidden="true">
                        {count > 99 ? '99+' : count}
                    </span>
                )}
            </button>

            {open && (
                <>
                    {/* Outside click overlay */}
                    <div className={styles.overlay} onClick={handleClose} aria-hidden="true" />

                    <div
                        className={styles.dropdown}
                        role="dialog"
                        aria-label={labels?.title ?? 'Notifications'}
                    >
                        <div
                            className={styles.dropHeader}
                        >
                            <p className={styles.dropTitle}>
                                {labels?.title ?? 'Notifications'}
                            </p>
                            <div className={styles.headerActions}>
                                {notifications.length > 0 && (
                                    <button
                                        type="button"
                                        className={styles.markAllBtn}
                                        onClick={() => void handleMarkAll()}
                                    >
                                        {labels?.markAll ?? 'Mark all read'}
                                    </button>
                                )}
                                <Link
                                    href={`/${locale}/notifications`}
                                    className={styles.showAllBtn}
                                    onClick={handleClose}
                                >
                                    {labels?.showAll ?? 'All'} <ChevronRight size={12} aria-hidden="true" />
                                </Link>
                            </div>
                        </div>

                        {notifications.length === 0 ? (
                            <p className={styles.empty}>
                                {labels?.empty ?? 'No new notifications'}
                            </p>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={styles.item}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => void handleMarkRead(n.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            void handleMarkRead(n.id);
                                        }
                                    }}
                                >
                                    <span className={styles.unreadDot} aria-hidden="true" />
                                    <div className={styles.itemText}>
                                        <p className={styles.itemMsg}>
                                            {typeIcon(n.type)} {n.message}
                                        </p>
                                        <p className={styles.itemTime}>
                                            {formatTime(n.created)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
