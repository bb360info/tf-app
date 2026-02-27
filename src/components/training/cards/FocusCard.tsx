'use client';

/**
 * FocusCard — Full-screen exercise card for Focus Mode (Phase 3).
 * Shows media, coach notes, SetLogger, and navigation between exercises.
 * Supports swipe navigation (30px edge guard, PWA-1) and Skip BottomSheet.
 */

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import {
    ChevronLeft,
    ChevronRight,
    X,
    SkipForward,
    Save,
    CheckCircle2,
    Wrench,
    AlertTriangle,
    Pencil,
    Activity,
    Zap,
    Dumbbell,
    Wind,
    Waves,
    Target,
    Play,
    WifiOff,
} from 'lucide-react';
import { cnsCostColor } from '@/lib/pocketbase/services/exercises';
import { saveLogExercise, getLastExerciseLog } from '@/lib/pocketbase/services/logs';
import type { PlanExerciseWithExpand } from '@/lib/pocketbase/services/plans';
import type { SetData, Language, TrainingCategory } from '@/lib/pocketbase/types';
import { SetLogger } from './SetLogger';
import styles from './FocusCard.module.css';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';

// BottomSheet loaded dynamically (uses portal — SSR safe)
const BottomSheet = dynamic(() => import('@/components/shared/BottomSheet'), { ssr: false });

// ─── Skip reasons ────────────────────────────────────────────────────────────

type SkipReason = 'Equipment' | 'Pain' | 'AlreadyDone' | 'Other';

const SKIP_REASONS: { key: SkipReason; icon: typeof Wrench }[] = [
    { key: 'Equipment', icon: Wrench },
    { key: 'Pain', icon: AlertTriangle },
    { key: 'AlreadyDone', icon: CheckCircle2 },
    { key: 'Other', icon: Pencil },
];

// ─── Category icon fallback ────────────────────────────────────────────────

const CATEGORY_ICON: Record<TrainingCategory, typeof Activity> = {
    plyometric: Zap,
    highjump: Target,
    strength: Dumbbell,
    gpp: Activity,
    speed: Wind,
    flexibility: Waves,
    jump: Target,
};

// Local helper: resolve name from PlanExerciseWithExpand
function getExName(planEx: PlanExerciseWithExpand, locale: Language): string {
    const base = planEx.expand?.exercise_id;
    if (!base) {
        if (locale === 'ru') return planEx.custom_text_ru ?? '';
        if (locale === 'cn') return planEx.custom_text_cn ?? planEx.custom_text_en ?? '';
        return planEx.custom_text_en ?? '';
    }
    switch (locale) {
        case 'ru': return base.name_ru || base.name_en;
        case 'cn': return base.name_cn || base.name_en;
        default: return base.name_en;
    }
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface FocusCardProps {
    planEx: PlanExerciseWithExpand;
    locale: Language;
    logId: string;
    athleteId: string;
    index: number;    // 0-based current index
    total: number;    // total exercises in this focus session
    onNext: () => void;
    onPrev: () => void;
    onClose: () => void;
    onSkip: (reason: SkipReason, exerciseId?: string) => void;
    /** Review mode: hide media block and plan/coach notes (for post-workout Full Review) */
    reviewMode?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FocusCard({
    planEx,
    locale,
    logId,
    athleteId,
    index,
    total,
    onNext,
    onPrev,
    onClose,
    onSkip,
    reviewMode = false,
}: FocusCardProps) {
    const t = useTranslations('training');

    // ── State ─────────────────────────────────────────
    const [showSkipSheet, setShowSkipSheet] = useState(false);
    const [showMediaSheet, setShowMediaSheet] = useState(false);
    const [initialLogData, setInitialLogData] = useState<{ setsData: SetData[]; rpe?: number } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [savedFeedback, setSavedFeedback] = useState(false);

    // ── Phase 5: slide direction + online status ───────
    const [slideDir, setSlideDir] = useState<'next' | 'prev' | null>(null);
    const isOnline = useOnlineStatus();

    // ── Touch refs (swipe navigation) ─────────────────
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);

    // ── Exercise data ─────────────────────────────────
    const exercise = planEx.expand?.exercise_id;
    const isCustomText = !planEx.exercise_id;
    const category = exercise?.training_category;
    const illustration = exercise?.illustration;

    // coach_cues i18n fallback: en → ru → cn
    const coachCues = exercise
        ? exercise[`coach_cues_${locale}` as `coach_cues_${typeof locale}`]
        || exercise.coach_cues_en
        || exercise.coach_cues_ru
        || exercise.coach_cues_cn
        : undefined;

    const customText = isCustomText
        ? (planEx[`custom_text_${locale}` as `custom_text_${typeof locale}`]
            || planEx.custom_text_en
            || planEx.custom_text_ru
            || planEx.custom_text_cn)
        : undefined;

    const exerciseName = isCustomText
        ? (customText || t('log.customExercise'))
        : getExName(planEx, locale);

    const isLastExercise = index === total - 1;

    // ── Autofill from last log ─────────────────────────
    useEffect(() => {
        if (!planEx.exercise_id || !athleteId) return;
        let cancelled = false;
        getLastExerciseLog(athleteId, planEx.exercise_id).then((data) => {
            if (!cancelled && data && data.sets_data) {
                setInitialLogData({ setsData: data.sets_data, rpe: data.rpe ?? undefined });
            }
        }).catch(() => { /* ignore */ });
        return () => { cancelled = true; };
    }, [planEx.exercise_id, athleteId]);

    // ── Swipe navigation (PWA-1: 30px edge guard) ─────
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const dx = endX - touchStartX.current;
        const dy = endY - touchStartY.current;
        const startX = touchStartX.current;
        const screenWidth = window.innerWidth;

        // Only horizontal swipe with 30px edge guard
        if (
            Math.abs(dx) > 50 &&
            Math.abs(dx) > Math.abs(dy) &&
            startX > 30 &&
            startX < screenWidth - 30
        ) {
            if (dx < 0) {
                setSlideDir('next');
                setTimeout(() => setSlideDir(null), 50);
                onNext();   // swipe left → next
            } else {
                setSlideDir('prev');
                setTimeout(() => setSlideDir(null), 50);
                onPrev();   // swipe right → prev
            }
        }
    };

    // ── Save handler ──────────────────────────────────
    const handleSaveLog = async (setsData: SetData[], rpe?: number) => {
        if (!planEx.exercise_id) return;
        setIsSaving(true);
        try {
            await saveLogExercise(logId, planEx.exercise_id, setsData, rpe);
            setSavedFeedback(true);
            // Phase 5: haptic feedback
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(50);
            }
            setTimeout(() => setSavedFeedback(false), 600);
            // Slide next on save
            setSlideDir('next');
            setTimeout(() => setSlideDir(null), 50);
            onNext();
        } catch (e) {
            console.error('FocusCard save failed', e);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Custom text done ──────────────────────────────
    const handleCustomDone = () => {
        onNext();
    };

    // ── Skip handlers ─────────────────────────────────
    const handleSkipReason = (reason: SkipReason) => {
        setShowSkipSheet(false);
        onSkip(reason, planEx.exercise_id);
    };

    // ── CNS dots ──────────────────────────────────────
    const cnsCost = exercise?.cns_cost ?? 0;
    const cnsColor = cnsCostColor(cnsCost);
    const cnsDots = Array.from({ length: 5 }, (_, i) => (
        <span
            key={i}
            className={styles.cnsDot}
            style={{ background: i < cnsCost ? cnsColor : 'var(--color-border)' }}
        />
    ));

    // ── Category fallback icon ────────────────────────
    const FallbackIcon = category ? (CATEGORY_ICON[category] ?? Activity) : Activity;
    const fallbackColor = category
        ? `var(--color-${category})`
        : 'var(--color-text-tertiary)';

    // ─── Render ───────────────────────────────────────

    return (
        <div
            className={styles.focusCard}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* ── Header ── */}
            <div className={styles.focusHeader}>
                <button
                    type="button"
                    className={styles.headerBtn}
                    onClick={onClose}
                    aria-label={t('focus.backToOverview')}
                >
                    <X size={20} />
                    <span className={styles.headerBtnLabel}>{t('focus.backToOverview')}</span>
                </button>

                <span className={styles.headerCounter}>
                    {index + 1} / {total}
                </span>

                {/* Phase 5: Offline badge */}
                {!isOnline && (
                    <span className={styles.offlineBadge} aria-label="Офлайн режим">
                        <WifiOff size={11} aria-hidden />
                        {t('offlineMode' as Parameters<typeof t>[0])}
                    </span>
                )}

                <div className={styles.headerNavBtns}>
                    <button
                        type="button"
                        className={styles.headerNavBtn}
                        onClick={onPrev}
                        disabled={index === 0}
                        aria-label={t('focus.prevExercise')}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        type="button"
                        className={styles.headerNavBtn}
                        onClick={onNext}
                        aria-label={t('focus.nextExercise')}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* ── Scrollable body ── */}
            <div className={[
                styles.focusBody,
                slideDir === 'next' ? styles.slideNext : '',
                slideDir === 'prev' ? styles.slidePrev : '',
            ].filter(Boolean).join(' ')}>
                {/* ── Media block (hidden in reviewMode) ── */}
                {!reviewMode && (
                    <div
                        className={styles.mediaBlock}
                        onClick={() => illustration && setShowMediaSheet(true)}
                        role={illustration ? 'button' : undefined}
                        aria-label={illustration ? t('focus.mediaGallery') : undefined}
                        tabIndex={illustration ? 0 : undefined}
                    >
                        {illustration ? (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={illustration}
                                    alt={exerciseName}
                                    className={styles.mediaImg}
                                />
                                <div className={styles.mediaPlayOverlay}>
                                    <Play size={32} fill="currentColor" />
                                </div>
                            </>
                        ) : (
                            <div className={styles.mediaFallback}>
                                <FallbackIcon size={64} color={fallbackColor} strokeWidth={1.5} />
                            </div>
                        )}
                    </div>
                )}

                {/* ── Exercise title + CNS ── */}
                <div className={styles.exerciseInfo}>
                    <h2 className={styles.exerciseName}>{exerciseName}</h2>
                    {exercise && (
                        <div className={styles.exerciseMeta}>
                            <span className={styles.categoryLabel}>
                                {t(`categories.${exercise.training_category}`)}
                            </span>
                            <span className={styles.cnsDots}>{cnsDots}</span>
                        </div>
                    )}
                </div>

                {/* ── Plan notes (📋) — hidden in reviewMode ── */}
                {!reviewMode && planEx.notes && (
                    <div className={styles.noteBlock}>
                        <span className={styles.noteIcon} aria-hidden>📋</span>
                        <p className={styles.noteText}>{planEx.notes}</p>
                    </div>
                )}

                {/* ── Coach cues (💡) — hidden in reviewMode ── */}
                {!reviewMode && coachCues && (
                    <div className={`${styles.noteBlock} ${styles.noteBlockCue}`}>
                        <span className={styles.noteIcon} aria-hidden>💡</span>
                        <p className={styles.noteText}>{coachCues}</p>
                    </div>
                )}

                {/* ── Custom text ── */}
                {isCustomText && customText && (
                    <div className={`${styles.noteBlock} ${styles.noteBlockCustom}`}>
                        <p className={styles.customText}>{customText}</p>
                    </div>
                )}

                {/* ── SetLogger (hidden for custom_text exercises) ── */}
                {!isCustomText && planEx.exercise_id && (
                    <div className={styles.setLoggerWrap}>
                        <SetLogger
                            planExercise={planEx}
                            mode="log"
                            initialLogData={initialLogData}
                            onSaveLog={handleSaveLog}
                        />
                    </div>
                )}
            </div>

            {/* ── Footer ── */}
            <div className={styles.focusFooter}>
                <button
                    type="button"
                    className={styles.skipBtn}
                    onClick={() => setShowSkipSheet(true)}
                    aria-label={t('focus.skipTitle')}
                >
                    <SkipForward size={16} />
                    <span>{t('focus.skip.label')}</span>
                </button>

                {isCustomText ? (
                    <button
                        type="button"
                        className={`${styles.saveBtn} ${styles.saveBtnDone}`}
                        onClick={handleCustomDone}
                    >
                        <CheckCircle2 size={18} />
                        <span>{t('focus.done')}</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        className={`${styles.saveBtn} ${savedFeedback ? styles.saveBtnSaved : ''}`}
                        disabled={isSaving}
                        onClick={() => {
                            // SetLogger's onSaveLog handles actual save; footer button triggers via form
                            // This is a fallback — primary flow is through SetLogger
                        }}
                        aria-label={isLastExercise ? t('focus.finish') : t('focus.save')}
                    >
                        {isLastExercise ? (
                            <><CheckCircle2 size={18} /><span>{t('focus.finish')}</span></>
                        ) : (
                            <><Save size={18} /><span>{t('focus.save')}</span></>
                        )}
                    </button>
                )}
            </div>

            {/* ── Skip BottomSheet ── */}
            <BottomSheet
                isOpen={showSkipSheet}
                onClose={() => setShowSkipSheet(false)}
                title={t('focus.skipTitle')}
            >
                <div className={styles.skipGrid}>
                    {SKIP_REASONS.map(({ key, icon: Icon }) => (
                        <button
                            key={key}
                            type="button"
                            className={styles.skipChip}
                            onClick={() => handleSkipReason(key)}
                        >
                            <Icon size={18} />
                            <span>{t(`focus.skip.${key}`)}</span>
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    className={styles.skipCancelBtn}
                    onClick={() => setShowSkipSheet(false)}
                >
                    {t('focus.skip.cancel')}
                </button>
            </BottomSheet>

            {/* ── Media Gallery BottomSheet ── */}
            {illustration && (
                <BottomSheet
                    isOpen={showMediaSheet}
                    onClose={() => setShowMediaSheet(false)}
                    title={exerciseName}
                >
                    <div className={styles.mediaGallery}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={illustration}
                            alt={exerciseName}
                            className={styles.mediaGalleryImg}
                        />
                    </div>
                </BottomSheet>
            )}
        </div>
    );
}
