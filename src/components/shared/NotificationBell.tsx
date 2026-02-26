'use client';

import { useState, useCallback } from 'react';
import { Bell, ClipboardList, Clock, Trophy, Info, ChevronRight, AlertCircle, MessageSquare, UserCheck, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import type { NotificationsRecord } from '@/lib/pocketbase/types';
import {
    markRead,
    markAllRead,
} from '@/lib/pocketbase/services/notifications';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { reportError } from '@/lib/telemetry';
import pb from '@/lib/pocketbase/client';
import styles from './NotificationBell.module.css';

export function NotificationBell() {
    const [open, setOpen] = useState(false);
    const locale = useLocale();
    const router = useRouter();
    const t = useTranslations('notifications');

    const userId = pb.authStore.record?.id ?? '';

    // SSE realtime + BG Sync polling — обновляется без перезагрузки страницы
    const { notifications, unreadCount, removeNotification, clearAll } = useNotifications(userId);
    const count = unreadCount;

    const handleToggle = () => setOpen((prev) => !prev);
    const handleClose = () => setOpen(false);

    /**
     * Resolve notification message:
     * 1. If message_key exists → translate via t() with message_params
     * 2. Fallback: raw n.message string (backwards compat)
     */
    const renderMessage = useCallback((n: NotificationsRecord): string => {
        if (!n.message_key) return n.message;
        try {
            // next-intl t() accepts ICU params as second arg
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return t(n.message_key as any, n.message_params as any ?? {});
        } catch {
            console.warn('[NotificationBell] missing i18n key:', n.message_key, '— fallback to message');
            return n.message;
        }
    }, [t]);

    const handleMarkRead = useCallback(async (n: NotificationsRecord) => {
        try {
            await markRead(n.id);
            removeNotification(n.id);
            // Navigate to notification link if present
            if (n.link) {
                router.push(n.link as never);
                handleClose();
            }
        } catch (err) {
            reportError(err instanceof Error ? err : new Error(String(err)));
        }
    }, [removeNotification, router]);

    const handleMarkAll = async () => {
        try {
            await markAllRead();
            clearAll();
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
            low_readiness: <AlertCircle {...iconProps} />,
            coach_note: <MessageSquare {...iconProps} />,
            invite_accepted: <UserCheck {...iconProps} />,
            competition_upcoming: <Calendar {...iconProps} />,
        };
        return map[type] ?? null;
    };

    return (
        <div className={styles.wrap}>
            <button
                type="button"
                className={styles.btn}
                onClick={handleToggle}
                aria-label={`${t('title')}${count > 0 ? ` (${count})` : ''}`}
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
                        aria-label={t('title')}
                    >
                        <div className={styles.dropHeader}>
                            <p className={styles.dropTitle}>
                                {t('title')}
                            </p>
                            <div className={styles.headerActions}>
                                {notifications.length > 0 && (
                                    <button
                                        type="button"
                                        className={styles.markAllBtn}
                                        onClick={() => void handleMarkAll()}
                                    >
                                        {t('markAll')}
                                    </button>
                                )}
                                <Link
                                    href={`/${locale}/notifications`}
                                    className={styles.showAllBtn}
                                    onClick={handleClose}
                                >
                                    {t('showAll')} <ChevronRight size={12} aria-hidden="true" />
                                </Link>
                            </div>
                        </div>

                        {notifications.length === 0 ? (
                            <p className={styles.empty}>
                                {t('empty')}
                            </p>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={styles.item}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => void handleMarkRead(n)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            void handleMarkRead(n);
                                        }
                                    }}
                                >
                                    <span className={styles.unreadDot} aria-hidden="true" />
                                    <div className={styles.itemText}>
                                        <p className={styles.itemMsg}>
                                            {typeIcon(n.type)} {renderMessage(n)}
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
