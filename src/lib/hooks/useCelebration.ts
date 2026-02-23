'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { AchievementType } from '@/lib/pocketbase/types';
import { ACHIEVEMENT_META, type AchievementMeta } from '@/lib/pocketbase/services/achievements';

export interface CelebrationItem {
    type: AchievementType;
    meta: AchievementMeta;
    celebrationType: 'toast' | 'fullscreen';
}

interface UseCelebrationReturn {
    active: CelebrationItem | null;
    celebrate: (type: AchievementType) => void;
    dismiss: () => void;
}

function createItem(type: AchievementType): CelebrationItem {
    const meta = ACHIEVEMENT_META[type];
    return { type, meta, celebrationType: meta.celebrationType };
}

function getDuration(item: CelebrationItem): number {
    return item.celebrationType === 'fullscreen' ? 5000 : 3000;
}

/**
 * useCelebration — manages a FIFO queue of celebrations.
 * Fullscreen auto-dismiss 5s, Toast auto-dismiss 3s.
 */
export function useCelebration(): UseCelebrationReturn {
    const [active, setActive] = useState<CelebrationItem | null>(null);
    const queueRef = useRef<CelebrationItem[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isShowingRef = useRef(false);

    // Show next from queue or clear active
    const showNextFromQueue = useCallback(() => {
        const next = queueRef.current.shift();
        if (next) {
            setActive(next);
            if (timerRef.current) clearTimeout(timerRef.current);
            // Non-recursive: setTimeout calls showNextFromQueue on dismiss
            timerRef.current = setTimeout(() => {
                const following = queueRef.current.shift();
                if (following) {
                    setActive(following);
                    timerRef.current = setTimeout(() => {
                        setActive(null);
                        isShowingRef.current = false;
                    }, getDuration(following));
                } else {
                    setActive(null);
                    isShowingRef.current = false;
                }
            }, getDuration(next));
        } else {
            setActive(null);
            isShowingRef.current = false;
        }
    }, []);

    const dismiss = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        showNextFromQueue();
    }, [showNextFromQueue]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const celebrate = useCallback((type: AchievementType) => {
        const item = createItem(type);

        if (!isShowingRef.current) {
            isShowingRef.current = true;
            setActive(item);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                showNextFromQueue();
            }, getDuration(item));
        } else {
            queueRef.current.push(item);
        }
    }, [showNextFromQueue]);

    return { active, celebrate, dismiss };
}
