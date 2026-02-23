'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Bell, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import pb from '@/lib/pocketbase/client';
import { useNotifications } from '@/lib/hooks/useNotifications';
import styles from './ActivityFeed.module.css';

type FeedItem = {
    id: string;
    kind: 'notification';
    created: string;
    title: string;
    link?: string;
};

interface ActivityFeedProps {
    maxItems?: number;
    showAllHref?: string;
    labels?: {
        title?: string;
        empty?: string;
        showAll?: string;
        loading?: string;
    };
}

function FeedSkeleton() {
    return (
        <ul className={styles.list} aria-label="Loading…">
            {[1, 2, 3].map((i) => (
                <li key={i} className={styles.skeleton}>
                    <span className={styles.skeletonIcon} />
                    <span className={styles.skeletonText} />
                </li>
            ))}
        </ul>
    );
}

export function ActivityFeed({ maxItems = 10, showAllHref, labels }: ActivityFeedProps) {
    const locale = useLocale();
    const userId = pb.authStore.record?.id ?? '';
    const { notifications, reload } = useNotifications(userId);
    const [loading, setLoading] = useState(true);

    // Initial load — sets loading=false after reload finishes
    useEffect(() => {
        void reload().finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const feedItems: FeedItem[] = notifications
        .slice(0, maxItems)
        .map((n) => ({
            id: n.id,
            kind: 'notification' as const,
            created: n.created,
            title: n.message,
            link: n.link,
        }));

    const allHref = showAllHref ?? `/${locale}/notifications`;

    const formatRelative = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 60) return `${m}m`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h`;
        return `${Math.floor(h / 24)}d`;
    };

    if (loading) return <FeedSkeleton />;

    if (feedItems.length === 0) {
        return (
            <div className={styles.empty}>
                <Bell size={32} aria-hidden="true" className={styles.emptyIcon} />
                <p>{labels?.empty ?? 'No recent activity'}</p>
            </div>
        );
    }

    return (
        <section className={styles.wrap}>
            <div className={styles.header}>
                <h2 className={styles.title}>{labels?.title ?? 'Activity'}</h2>
                <Link href={allHref} className={styles.showAll}>
                    {labels?.showAll ?? 'See all'} <ChevronRight size={14} aria-hidden="true" />
                </Link>
            </div>

            <ul className={styles.list}>
                {feedItems.map((item) => (
                    <li key={item.id} className={styles.item} style={{ contentVisibility: 'auto', containIntrinsicSize: '0 64px' } as React.CSSProperties}>
                        <div className={styles.itemIcon}>
                            <Bell size={16} aria-hidden="true" />
                        </div>
                        <div className={styles.itemBody}>
                            {item.link ? (
                                <Link href={item.link} className={styles.itemTitle}>
                                    {item.title}
                                </Link>
                            ) : (
                                <span className={styles.itemTitle}>{item.title}</span>
                            )}
                            <span className={styles.itemTime}>{formatRelative(item.created)}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
