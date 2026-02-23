'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Mail, Moon } from 'lucide-react';
import pb from '@/lib/pocketbase/client';
import {
    getOrCreatePreferences,
    updatePreferences,
    toggleNotificationType,
} from '@/lib/pocketbase/services/notificationPreferences';
import type { NotificationPreferencesRecord, NotificationType } from '@/lib/pocketbase/types';
import { reportError } from '@/lib/telemetry';
import styles from './NotificationPreferences.module.css';

// 10 most common IANA timezones
const COMMON_TZ = [
    'Asia/Shanghai',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Kolkata',
    'Europe/Moscow',
    'Europe/London',
    'Europe/Berlin',
    'America/New_York',
    'America/Chicago',
    'America/Los_Angeles',
];

const NOTIFICATION_TYPES: NotificationType[] = [
    'plan_published',
    'checkin_reminder',
    'achievement',
    'low_readiness',
    'coach_note',
    'system',
];

interface Labels {
    pushEnabled?: string;
    emailEnabled?: string;
    quietHoursTitle?: string;
    quietFrom?: string;
    quietTo?: string;
    timezone?: string;
    types?: Record<NotificationType, string>;
}

interface Props {
    labels?: Labels;
}

export function NotificationPreferences({ labels }: Props) {
    const userId = pb.authStore.record?.id ?? '';
    const [prefs, setPrefs] = useState<NotificationPreferencesRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        void (async () => {
            try {
                const data = await getOrCreatePreferences(userId);
                if (!cancelled) setPrefs(data);
            } catch (err) {
                reportError(err instanceof Error ? err : new Error(String(err)));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [userId]);

    /** Debounced save — 500ms after last change */
    const scheduleSave = (id: string, data: Parameters<typeof updatePreferences>[1]) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            void updatePreferences(id, data).catch((err) =>
                reportError(err instanceof Error ? err : new Error(String(err)))
            );
        }, 500);
    };

    const handleTogglePush = (enabled: boolean) => {
        if (!prefs) return;
        setPrefs({ ...prefs, push_enabled: enabled });
        scheduleSave(prefs.id, { push_enabled: enabled });
    };

    const handleToggleEmail = (enabled: boolean) => {
        if (!prefs) return;
        setPrefs({ ...prefs, email_enabled: enabled });
        scheduleSave(prefs.id, { email_enabled: enabled });
    };

    const handleToggleType = async (type: NotificationType) => {
        if (!prefs || !userId) return;
        const current = prefs.disabled_types ?? [];
        const isDisabled = current.includes(type);
        // Optimistic update
        const newDisabled = isDisabled
            ? current.filter((t) => t !== type)
            : [...current, type];
        setPrefs({ ...prefs, disabled_types: newDisabled });
        try {
            await toggleNotificationType(userId, type, isDisabled);
        } catch (err) {
            // Revert on error
            setPrefs({ ...prefs, disabled_types: current });
            reportError(err instanceof Error ? err : new Error(String(err)));
        }
    };

    const handleQuietStart = (val: string) => {
        if (!prefs) return;
        setPrefs({ ...prefs, quiet_hours_start: val });
        scheduleSave(prefs.id, { quiet_hours_start: val || undefined });
    };

    const handleQuietEnd = (val: string) => {
        if (!prefs) return;
        setPrefs({ ...prefs, quiet_hours_end: val });
        scheduleSave(prefs.id, { quiet_hours_end: val || undefined });
    };

    const handleTimezone = (tz: string) => {
        if (!prefs) return;
        setPrefs({ ...prefs, timezone: tz });
        scheduleSave(prefs.id, { timezone: tz });
    };

    if (loading || !prefs) {
        return <div className={styles.loading} aria-busy="true" />;
    }

    const disabledTypes = prefs.disabled_types ?? [];

    return (
        <section className={styles.wrap} aria-label={labels?.pushEnabled ?? 'Notification preferences'}>

            {/* ─── Global toggles ─── */}
            <div className={styles.group}>
                <label className={styles.row}>
                    <Bell size={16} aria-hidden="true" className={styles.rowIcon} />
                    <span className={styles.rowLabel}>{labels?.pushEnabled ?? 'Push notifications'}</span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={prefs.push_enabled ?? true}
                        className={`${styles.toggle} ${(prefs.push_enabled ?? true) ? styles.toggleOn : ''}`}
                        onClick={() => handleTogglePush(!(prefs.push_enabled ?? true))}
                    >
                        <span className={styles.toggleThumb} />
                    </button>
                </label>

                <label className={styles.row}>
                    <Mail size={16} aria-hidden="true" className={styles.rowIcon} />
                    <span className={styles.rowLabel}>{labels?.emailEnabled ?? 'Email notifications'}</span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={prefs.email_enabled ?? false}
                        className={`${styles.toggle} ${(prefs.email_enabled ?? false) ? styles.toggleOn : ''}`}
                        onClick={() => handleToggleEmail(!(prefs.email_enabled ?? false))}
                    >
                        <span className={styles.toggleThumb} />
                    </button>
                </label>
            </div>

            {/* ─── Quiet Hours ─── */}
            <div className={`${styles.group} ${styles.quietGroup}`}>
                <div className={styles.groupHeader}>
                    <Moon size={16} aria-hidden="true" />
                    {labels?.quietHoursTitle ?? 'Quiet Hours'}
                </div>
                <div className={styles.quietRow}>
                    <label htmlFor="quiet-start" className={styles.timeLabel}>
                        {labels?.quietFrom ?? 'From'}
                        <input
                            id="quiet-start"
                            type="time"
                            value={prefs.quiet_hours_start ?? ''}
                            onChange={(e) => handleQuietStart(e.target.value)}
                            className={styles.timeInput}
                        />
                    </label>
                    <span className={styles.quietSep}>—</span>
                    <label htmlFor="quiet-end" className={styles.timeLabel}>
                        {labels?.quietTo ?? 'To'}
                        <input
                            id="quiet-end"
                            type="time"
                            value={prefs.quiet_hours_end ?? ''}
                            onChange={(e) => handleQuietEnd(e.target.value)}
                            className={styles.timeInput}
                        />
                    </label>
                </div>
                <label htmlFor="tz-select" className={styles.tzLabel}>
                    {labels?.timezone ?? 'Timezone'}
                    <select
                        id="tz-select"
                        value={prefs.timezone ?? ''}
                        onChange={(e) => handleTimezone(e.target.value)}
                        className={styles.tzSelect}
                    >
                        <option value="">— {labels?.timezone ?? 'Select'} —</option>
                        {COMMON_TZ.map((tz) => (
                            <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                        ))}
                    </select>
                </label>
            </div>

            {/* ─── Per-type toggles ─── */}
            <div className={styles.group}>
                {NOTIFICATION_TYPES.map((type) => {
                    const enabled = !disabledTypes.includes(type);
                    return (
                        <label key={type} className={styles.row}>
                            <span className={styles.rowLabel}>
                                {labels?.types?.[type] ?? type.replace(/_/g, ' ')}
                            </span>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={enabled}
                                className={`${styles.toggle} ${enabled ? styles.toggleOn : ''}`}
                                onClick={() => void handleToggleType(type)}
                            >
                                <span className={styles.toggleThumb} />
                            </button>
                        </label>
                    );
                })}
            </div>
        </section>
    );
}
