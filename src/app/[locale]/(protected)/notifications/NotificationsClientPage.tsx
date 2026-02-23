'use client';

import { useState, useCallback, useEffect } from 'react';
import { Bell, CheckSquare, Clock, Trophy, Info, AlertCircle, MessageSquare } from 'lucide-react';
import pb from '@/lib/pocketbase/client';
import { markRead, markAllRead, listPaginated, listByType } from '@/lib/pocketbase/services/notifications';
import type { NotificationsRecord, NotificationType } from '@/lib/pocketbase/types';
import styles from './NotificationsClientPage.module.css';

type FilterType = 'all' | NotificationType;

interface Labels {
    title: string;
    empty: string;
    markAllRead: string;
    types: Record<FilterType, string>;
}

interface Props {
    labels: Labels;
}

const TYPE_ICONS: Record<string, React.FC<{ size: number; 'aria-hidden': true }>> = {
    plan_published: (p) => <CheckSquare {...p} />,
    checkin_reminder: (p) => <Clock {...p} />,
    achievement: (p) => <Trophy {...p} />,
    low_readiness: (p) => <AlertCircle {...p} />,
    coach_note: (p) => <MessageSquare {...p} />,
    system: (p) => <Info {...p} />,
};

const FILTER_TYPES: FilterType[] = [
    'all',
    'plan_published',
    'checkin_reminder',
    'achievement',
    'low_readiness',
    'coach_note',
    'invite_accepted',
    'competition_upcoming',
    'system',
];

export function NotificationsClientPage({ labels }: Props) {
    const userId = pb.authStore.record?.id ?? '';
    const [notifications, setNotifications] = useState<NotificationsRecord[]>([]);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [markingAll, setMarkingAll] = useState(false);

    // Load ALL notifications (not just unread) for the center
    const loadNotifications = useCallback(async () => {
        if (!userId) return;
        try {
            if (activeFilter === 'all') {
                const { items } = await listPaginated(userId, 1, 50);
                setNotifications(items);
            } else {
                const { items } = await listByType(userId, activeFilter as NotificationsRecord['type'], 1, 50);
                setNotifications(items);
            }
        } catch (err) {
            const { logError } = await import('@/lib/utils/errors');
            logError(err, { component: 'NotificationsPage', action: 'load' });
        }
    }, [userId, activeFilter]);

    useEffect(() => {
        void loadNotifications();
    }, [loadNotifications]);

    const handleMarkRead = useCallback(async (id: string) => {
        setLoadingId(id);
        try {
            await markRead(id);
            // Update local state: mark as read instead of removing
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n))
            );
        } finally {
            setLoadingId(null);
        }
    }, []);

    const handleMarkAllRead = useCallback(async () => {
        setMarkingAll(true);
        try {
            await markAllRead();
            // Update local state: mark all as read
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        } finally {
            setMarkingAll(false);
        }
    }, []);

    const hasUnread = notifications.some((n) => !n.read);

    const formatTime = (dateStr: string) => {
        if (!dateStr) return '—';
        const diff = Date.now() - new Date(dateStr).getTime();
        if (isNaN(diff)) return '—';
        const m = Math.floor(diff / 60000);
        if (m < 60) return `${m}m`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h`;
        return `${Math.floor(h / 24)}d`;
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>{labels.title}</h1>
                {hasUnread && (
                    <button
                        type="button"
                        className={styles.markAllBtn}
                        disabled={markingAll}
                        onClick={() => void handleMarkAllRead()}
                    >
                        {labels.markAllRead}
                    </button>
                )}
            </div>

            {/* Type filter chips */}
            <div className={styles.filters} role="tablist" aria-label="Notification type filter">
                {FILTER_TYPES.map((type) => (
                    <button
                        key={type}
                        type="button"
                        role="tab"
                        aria-selected={activeFilter === type}
                        className={`${styles.chip} ${activeFilter === type ? styles.chipActive : ''}`}
                        onClick={() => setActiveFilter(type)}
                    >
                        {labels.types[type] ?? type}
                    </button>
                ))}
            </div>

            {/* List */}
            {notifications.length === 0 ? (
                <div className={styles.empty}>
                    <Bell size={40} aria-hidden="true" className={styles.emptyIcon} />
                    <p>{labels.empty}</p>
                </div>
            ) : (
                <ul className={styles.list}>
                    {notifications.map((n) => {
                        const Icon = TYPE_ICONS[n.type] ?? ((p: { size: number; 'aria-hidden': true }) => <Bell {...p} />);
                        return (
                            <li
                                key={n.id}
                                className={`${styles.item} ${!n.read ? styles.itemUnread : ''}`}
                                style={{ contentVisibility: 'auto', containIntrinsicSize: '0 72px' } as React.CSSProperties}
                            >
                                <div className={styles.itemIcon}>
                                    <Icon size={16} aria-hidden={true} />
                                </div>
                                <div className={styles.itemBody}>
                                    <span className={styles.itemMsg}>{n.message}</span>
                                    <span className={styles.itemTime}>{formatTime(n.created)}</span>
                                </div>
                                {!n.read && (
                                    <button
                                        type="button"
                                        className={styles.readBtn}
                                        disabled={loadingId === n.id}
                                        onClick={() => void handleMarkRead(n.id)}
                                        aria-label="Mark as read"
                                    >
                                        <CheckSquare size={16} aria-hidden="true" />
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
