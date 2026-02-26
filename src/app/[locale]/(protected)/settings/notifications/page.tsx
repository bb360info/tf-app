'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
    Bell,
    BellOff,
    Mail,
    Clock,
    ChevronLeft,
    Check,
    Loader2,
    ShieldCheck,
    ShieldX,
    ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useAuth } from '@/lib/pocketbase/AuthProvider';
import {
    getOrCreatePreferences,
    updatePreferences,
} from '@/lib/pocketbase/services/notificationPreferences';
import type { NotificationPreferencesRecord, NotificationType } from '@/lib/pocketbase/types';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { useToast } from '@/lib/hooks/useToast';
import { usePushSubscription } from '@/lib/hooks/usePushSubscription';
import styles from './notifications.module.css';

// All toggleable notification types
const NOTIFICATION_TYPES: NotificationType[] = [
    'plan_published',
    'checkin_reminder',
    'achievement',
    'low_readiness',
    'coach_note',
    'system',
    'invite_accepted',
    'competition_upcoming',
];

export default function NotificationSettingsPage() {
    const t = useTranslations('notifications');
    const ts = useTranslations('notificationSettings');
    const locale = useLocale();
    const { user } = useAuth();
    const { showToast } = useToast();

    const [prefs, setPrefs] = useState<NotificationPreferencesRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [quietSaving, setQuietSaving] = useState(false);

    // Local editable copy
    const [pushEnabled, setPushEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(false);
    const [disabledTypes, setDisabledTypes] = useState<NotificationType[]>([]);
    const [quietStart, setQuietStart] = useState('');
    const [quietEnd, setQuietEnd] = useState('');
    const [quietEnabled, setQuietEnabled] = useState(false);

    // Push subscription status from browser
    const pushSub = usePushSubscription(user?.id ?? '');

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        getOrCreatePreferences(user.id)
            .then((p) => {
                setPrefs(p);
                setPushEnabled(p.push_enabled ?? true);
                setEmailEnabled(p.email_enabled ?? false);
                setDisabledTypes(p.disabled_types ?? []);
                const qs = p.quiet_hours_start ?? '';
                const qe = p.quiet_hours_end ?? '';
                setQuietStart(qs);
                setQuietEnd(qe);
                setQuietEnabled(!!qs && !!qe);
            })
            .catch(() => {
                showToast({ message: ts('loadFailed'), type: 'error' });
            })
            .finally(() => setLoading(false));
    }, [user, showToast, ts]);

    // Silent auto-save helper for individual field changes
    const autoSave = useCallback(async (patch: Partial<Parameters<typeof updatePreferences>[1]>) => {
        if (!prefs) return;
        try {
            await updatePreferences(prefs.id, patch);
        } catch (err) {
            const { logError } = await import('@/lib/utils/errors');
            logError(err, { component: 'NotificationSettingsPage', action: 'autoSave' });
            showToast({ message: ts('saveFailed'), type: 'error' });
        }
    }, [prefs, showToast, ts]);

    const handlePushToggle = useCallback((checked: boolean) => {
        setPushEnabled(checked);
        void autoSave({ push_enabled: checked });
    }, [autoSave]);

    const handleEmailToggle = useCallback((checked: boolean) => {
        setEmailEnabled(checked);
        void autoSave({ email_enabled: checked });
    }, [autoSave]);

    const toggleType = useCallback((type: NotificationType) => {
        setDisabledTypes((prev) => {
            const next = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type];
            void autoSave({ disabled_types: next });
            return next;
        });
    }, [autoSave]);

    const handleQuietToggle = useCallback((checked: boolean) => {
        setQuietEnabled(checked);
        if (!checked) {
            // When disabling quiet hours, auto-save to clear them
            void autoSave({ quiet_hours_start: undefined, quiet_hours_end: undefined });
        }
    }, [autoSave]);

    // Save button only for quiet hours time inputs
    const handleQuietSave = useCallback(async () => {
        if (!prefs) return;
        setQuietSaving(true);
        try {
            await updatePreferences(prefs.id, {
                quiet_hours_start: quietStart || undefined,
                quiet_hours_end: quietEnd || undefined,
            });
            showToast({ message: ts('saved'), type: 'success' });
        } catch (err) {
            const { logError } = await import('@/lib/utils/errors');
            logError(err, { component: 'NotificationSettingsPage', action: 'quietSave' });
            showToast({ message: ts('saveFailed'), type: 'error' });
        } finally {
            setQuietSaving(false);
        }
    }, [prefs, quietStart, quietEnd, showToast, ts]);

    if (loading) {
        return (
            <div className={styles.page}>
                <PageWrapper maxWidth="narrow">
                    <div className={styles.loadingState}>
                        <Loader2 size={24} className={styles.spinner} aria-label="Loading" />
                    </div>
                </PageWrapper>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <PageWrapper maxWidth="narrow">
                {/* Back header */}
                <div className={styles.header}>
                    <Link href={`/${locale}/settings`} className={styles.backBtn} aria-label={ts('back')}>
                        <ChevronLeft size={20} />
                    </Link>
                    <h1 className={styles.pageTitle}>{ts('title')}</h1>
                </div>

                {/* Channels section */}
                <section className={styles.section} aria-labelledby="channels-heading">
                    <div id="channels-heading" className={styles.sectionTitle}>{ts('channels')}</div>

                    {/* Push toggle */}
                    <div className={styles.row}>
                        <div className={styles.rowLabel}>
                            <div className={styles.rowIconWrap} data-active={pushEnabled}>
                                <Bell size={18} aria-hidden="true" />
                            </div>
                            <div className={styles.rowInfo}>
                                <span className={styles.rowName}>{t('pushEnabled')}</span>
                                <span className={styles.rowDesc}>{ts('pushDesc')}</span>
                            </div>
                        </div>
                        <label className={styles.toggle} htmlFor="push-toggle">
                            <input
                                id="push-toggle"
                                type="checkbox"
                                checked={pushEnabled}
                                onChange={(e) => handlePushToggle(e.target.checked)}
                            />
                            <span className={styles.toggleTrack} />
                        </label>
                    </div>

                    {/* Push subscription status — only show when push is enabled */}
                    {pushEnabled && (
                        <div className={styles.pushStatusRow}>
                            {pushSub.status === 'subscribed' && (
                                <>
                                    <div className={styles.pushBadge} data-status="active">
                                        <ShieldCheck size={14} aria-hidden="true" />
                                        {ts('pushActive')}
                                    </div>
                                    <button
                                        type="button"
                                        className={styles.pushActionBtn}
                                        onClick={() => void pushSub.unsubscribe()}
                                        disabled={pushSub.loading}
                                    >
                                        {ts('pushUnsubscribe')}
                                    </button>
                                </>
                            )}
                            {(pushSub.status === 'unsubscribed' || pushSub.status === 'declined') && (
                                <button
                                    type="button"
                                    className={styles.pushSubscribeBtn}
                                    onClick={() => void pushSub.subscribe()}
                                    disabled={pushSub.loading}
                                >
                                    <Bell size={14} aria-hidden="true" />
                                    {ts('pushSubscribe')}
                                </button>
                            )}
                            {pushSub.status === 'denied' && (
                                <div className={styles.pushBadge} data-status="denied">
                                    <ShieldX size={14} aria-hidden="true" />
                                    {ts('pushDenied')}
                                </div>
                            )}
                            {pushSub.status === 'unsupported' && (
                                <div className={styles.pushBadge} data-status="unsupported">
                                    <ShieldAlert size={14} aria-hidden="true" />
                                    {ts('pushUnsupported')}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Email toggle */}
                    <div className={styles.row}>
                        <div className={styles.rowLabel}>
                            <div className={styles.rowIconWrap} data-active={emailEnabled}>
                                <Mail size={18} aria-hidden="true" />
                            </div>
                            <div className={styles.rowInfo}>
                                <span className={styles.rowName}>{t('emailEnabled')}</span>
                                <span className={styles.rowDesc}>{ts('emailDesc')}</span>
                            </div>
                        </div>
                        <label className={styles.toggle} htmlFor="email-toggle">
                            <input
                                id="email-toggle"
                                type="checkbox"
                                checked={emailEnabled}
                                onChange={(e) => handleEmailToggle(e.target.checked)}
                            />
                            <span className={styles.toggleTrack} />
                        </label>
                    </div>
                </section>

                {/* Types section */}
                <section className={styles.section} aria-labelledby="types-heading">
                    <div id="types-heading" className={styles.sectionTitle}>{ts('notifTypes')}</div>
                    <p className={styles.sectionDesc}>{ts('typesDesc')}</p>

                    <div className={styles.typeGrid}>
                        {NOTIFICATION_TYPES.map((type) => {
                            const isMuted = disabledTypes.includes(type);
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    className={styles.typeChip}
                                    data-muted={isMuted}
                                    onClick={() => toggleType(type)}
                                    aria-pressed={!isMuted}
                                >
                                    {isMuted
                                        ? <BellOff size={14} aria-hidden="true" />
                                        : <Check size={14} aria-hidden="true" />}
                                    {t(`types.${type}`)}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Quiet Hours section */}
                <section className={styles.section} aria-labelledby="quiet-heading">
                    <div className={styles.rowFlush}>
                        <div className={styles.rowLabel}>
                            <div className={styles.rowIconWrap} data-active={quietEnabled}>
                                <Clock size={18} aria-hidden="true" />
                            </div>
                            <div className={styles.rowInfo}>
                                <span id="quiet-heading" className={styles.rowName}>{t('quietHours.title')}</span>
                                <span className={styles.rowDesc}>
                                    {quietEnabled && quietStart && quietEnd
                                        ? `${quietStart} — ${quietEnd}`
                                        : t('quietHours.disabled')}
                                </span>
                            </div>
                        </div>
                        <label className={styles.toggle} htmlFor="quiet-toggle">
                            <input
                                id="quiet-toggle"
                                type="checkbox"
                                checked={quietEnabled}
                                onChange={(e) => handleQuietToggle(e.target.checked)}
                            />
                            <span className={styles.toggleTrack} />
                        </label>
                    </div>

                    {quietEnabled && (
                        <>
                            <div className={styles.quietTimeRow}>
                                <div className={styles.timeField}>
                                    <label htmlFor="quiet-start" className={styles.timeLabel}>
                                        {t('quietHours.from')}
                                    </label>
                                    <input
                                        id="quiet-start"
                                        type="time"
                                        className={styles.timeInput}
                                        value={quietStart}
                                        onChange={(e) => setQuietStart(e.target.value)}
                                    />
                                </div>
                                <div className={styles.timeSeparator}>—</div>
                                <div className={styles.timeField}>
                                    <label htmlFor="quiet-end" className={styles.timeLabel}>
                                        {t('quietHours.to')}
                                    </label>
                                    <input
                                        id="quiet-end"
                                        type="time"
                                        className={styles.timeInput}
                                        value={quietEnd}
                                        onChange={(e) => setQuietEnd(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className={styles.saveWrap}>
                                <button
                                    type="button"
                                    className={styles.saveBtn}
                                    onClick={handleQuietSave}
                                    disabled={quietSaving}
                                    id="save-quiet-hours"
                                >
                                    {quietSaving
                                        ? <Loader2 size={16} aria-hidden="true" className={styles.spinner} />
                                        : <Check size={16} aria-hidden="true" />}
                                    {ts('save')}
                                </button>
                            </div>
                        </>
                    )}
                </section>


            </PageWrapper>
        </div>
    );
}
