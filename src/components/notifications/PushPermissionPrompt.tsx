/**
 * PushPermissionPrompt.tsx
 * Smart push permission prompt with iOS A2HS awareness.
 *
 * Shows:
 *  - On iOS Safari (non-standalone): A2HS prompt first
 *  - On other browsers after 3+ visits: push permission request
 *  - Never if denied | declined within 30d | already subscribed
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, X, Share, Plus } from 'lucide-react';
import { usePushSubscription } from '@/lib/hooks/usePushSubscription';
import styles from './PushPermissionPrompt.module.css';

const VISIT_KEY = 'push_visit_count';
const SHOW_THRESHOLD = 3;

interface PushPermissionPromptProps {
    userId: string;
    labels?: {
        notifTitle: string;
        notifText: string;
        allow: string;
        dismiss: string;
        iosTitle: string;
        iosStep1: string;
        iosStep2: string;
        iosStep3: string;
    };
}

function isIosSafari(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    return /iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
}

function isStandalone(): boolean {
    return typeof window !== 'undefined' && (window.navigator as { standalone?: boolean }).standalone === true;
}

export function PushPermissionPrompt({ userId, labels }: PushPermissionPromptProps) {
    const { status, loading, subscribe, decline } = usePushSubscription(userId);
    // Single state — null = hidden, 'push' | 'ios_a2hs' = shown
    const [promptType, setPromptType] = useState<'push' | 'ios_a2hs' | null>(null);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Track if we already incremented the visit counter this session mount
    const visitCountedRef = useRef(false);

    // ── Step 1: Increment visit counter ONCE on mount ──────────────────────
    useEffect(() => {
        if (!userId || visitCountedRef.current) return;
        visitCountedRef.current = true;
        const raw = sessionStorage.getItem(VISIT_KEY) ?? '0';
        const count = parseInt(raw, 10) + 1;
        sessionStorage.setItem(VISIT_KEY, String(count));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally empty — run only once on mount

    // ── Step 2: Decide which prompt to show once status is resolved ────────
    useEffect(() => {
        if (hasInteracted || loading || status === 'idle') return;

        const count = parseInt(sessionStorage.getItem(VISIT_KEY) ?? '0', 10);
        if (count < SHOW_THRESHOLD) return;

        const ios = isIosSafari();
        const standalone = isStandalone();

        if (ios && !standalone) {
            setPromptType('ios_a2hs');
        } else if ((!ios || standalone) && status === 'unsubscribed') {
            setPromptType('push');
        }
    }, [status, loading, hasInteracted]);

    const handleAllow = async () => {
        setError(null);
        setHasInteracted(true);
        try {
            await subscribe();
            setPromptType(null);
        } catch (err) {
            const { logError } = await import('@/lib/utils/errors');
            logError(err, { component: 'PushPermissionPrompt', action: 'subscribe' });
            setError(labels?.notifTitle ? 'Failed to enable notifications' : 'Ошибка подписки');
            // If it failed, we still hide the prompt to not annoy the user
            // or we keep it to show the error. Currently, the code says it shows the error.
            // If error is shown, we shouldn't setPromptType(null) here.
        }
    };

    const handleDismiss = () => {
        setHasInteracted(true);
        decline();
        setPromptType(null);
    };

    if (!promptType) return null;

    // ─── iOS A2HS Prompt ────────────────────────────────────────────────────
    if (promptType === 'ios_a2hs') {
        return (
            <div className={styles.prompt} role="dialog" aria-modal="true" aria-label={labels?.iosTitle ?? 'Install App'}>
                <button
                    type="button"
                    className={styles.closeBtn}
                    onClick={() => {
                        setHasInteracted(true);
                        setPromptType(null);
                    }}
                    aria-label="Close"
                >
                    <X size={16} aria-hidden="true" />
                </button>

                <div className={styles.icon}>
                    <Share size={24} aria-hidden="true" />
                </div>

                <h3 className={styles.title}>
                    {labels?.iosTitle ?? 'Install for Notifications'}
                </h3>

                <ol className={styles.iosList}>
                    <li>
                        <Share size={14} aria-hidden="true" />
                        {labels?.iosStep1 ?? 'Tap Share'}
                    </li>
                    <li>
                        <Plus size={14} aria-hidden="true" />
                        {labels?.iosStep2 ?? '"Add to Home Screen"'}
                    </li>
                    <li>
                        <Bell size={14} aria-hidden="true" />
                        {labels?.iosStep3 ?? 'Open from Home Screen'}
                    </li>
                </ol>
            </div>
        );
    }

    // ─── Push Permission Prompt ─────────────────────────────────────────────
    return (
        <div className={styles.prompt} role="dialog" aria-modal="true" aria-label={labels?.notifTitle ?? 'Enable Notifications'}>
            <button
                type="button"
                className={styles.closeBtn}
                onClick={handleDismiss}
                aria-label="Dismiss"
            >
                <X size={16} aria-hidden="true" />
            </button>

            <div className={styles.icon}>
                <Bell size={24} aria-hidden="true" />
            </div>

            <h3 className={styles.title}>
                {labels?.notifTitle ?? 'Enable Notifications'}
            </h3>
            <p className={styles.text}>
                {labels?.notifText ?? 'Get alerts for training plans, check-in reminders, and achievements.'}
            </p>

            {/* WCAG 4.1.3 Status Messages — aria-live for error feedback (BUG-5) */}
            {error && (
                <p className={styles.errorMsg} role="alert" aria-live="assertive">
                    {error}
                </p>
            )}

            <div className={styles.actions}>
                <button
                    type="button"
                    className={styles.allowBtn}
                    onClick={() => void handleAllow()}
                    disabled={loading}
                >
                    {labels?.allow ?? 'Allow'}
                </button>
                <button
                    type="button"
                    className={styles.dismissBtn}
                    onClick={handleDismiss}
                >
                    {labels?.dismiss ?? 'Not now'}
                </button>
            </div>
        </div>
    );
}
