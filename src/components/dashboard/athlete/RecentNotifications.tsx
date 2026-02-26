'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import pb from '@/lib/pocketbase/client';
import { listUnread } from '@/lib/pocketbase/services/notifications';
import type { NotificationsRecord } from '@/lib/pocketbase/types';
import styles from './RecentNotifications.module.css';

export function RecentNotifications() {
    const t = useTranslations('athleteDashboard');
    const [notifications, setNotifications] = useState<NotificationsRecord[]>([]);

    useEffect(() => {
        const fetchNotifs = async () => {
            try {
                const userId = pb.authStore.record?.id;
                if (!userId) return;
                const { items } = await listUnread(userId);
                setNotifications(items.slice(0, 2));
            } catch {
                // Ignore error
            }
        };
        fetchNotifs();
    }, []);

    if (notifications.length === 0) return null;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <span className={styles.title}>{t('recent')}</span>
                <Link href="/notifications" className={styles.viewAll}>{t('viewAll')}</Link>
            </div>
            <div className={styles.list}>
                {notifications.map(n => (
                    <div key={n.id} className={styles.item}>
                        <div className={styles.icon}>
                            <Bell size={16} />
                        </div>
                        <div className={styles.content}>
                            <p className={styles.message}>{n.message}</p>
                            <p className={styles.time}>{new Date(n.created).toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
