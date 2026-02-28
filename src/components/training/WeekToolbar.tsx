'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
    ArrowLeft, ChevronLeft, ChevronRight,
    CalendarDays, Copy, CheckCircle2, XCircle,
    Wand2, Wind, RotateCcw, Send,
    MoreVertical, Zap, Printer, History, Save, UserCog,
} from 'lucide-react';
import styles from './WeekConstructor.module.css';
import type { PhaseType } from '@/lib/pocketbase/types';

interface CNSInfo {
    status: 'red' | 'yellow' | 'green';
    total: number;
}

interface WeekToolbarProps {
    // Navigation
    onBack: () => void;
    phaseName: string;
    phaseType: PhaseType;
    weekNumber: number;
    maxWeeks: number;
    handlePrevWeek: () => void;
    handleNextWeek: () => void;
    onSwitchToMultiView?: () => void;
    // State flags
    isAutoFilling: boolean;
    isPublishing: boolean;
    isPublished: boolean;
    isReadOnly: boolean;
    showMoreMenu: boolean;
    menuRef: React.RefObject<HTMLDivElement | null>;
    // Confirm actions
    confirmAction: 'autofill' | 'duplicate' | 'publish' | null;
    setConfirmAction: (a: 'autofill' | 'duplicate' | 'publish' | null) => void;
    // Handlers
    handleDuplicateWeek: () => void;
    handleAutoFill: () => void;
    handlePublish: () => void;
    setShowWarmupPanel: (v: boolean) => void;
    setShowMoreMenu: (v: boolean) => void;
    setShowQuickWorkout: (v: boolean) => void;
    setShowHistory: (v: boolean) => void;
    handleSaveSnapshot: () => void;
    handleOpenOverrideModal: () => void;
    // CNS
    cns: CNSInfo;
    cnsColor: string;
    cnsLabelKey: string;
}

/**
 * WeekConstructor toolbar: back, phase name, week nav, actions.
 * Extracted from WeekConstructor to reduce LOC (Track 4.266 Phase 3).
 */
export function WeekToolbar({
    onBack, phaseName, phaseType,
    weekNumber, maxWeeks, handlePrevWeek, handleNextWeek, onSwitchToMultiView,
    isAutoFilling, isPublishing, isPublished, isReadOnly,
    showMoreMenu, menuRef,
    confirmAction, setConfirmAction,
    handleDuplicateWeek, handleAutoFill, handlePublish,
    setShowWarmupPanel, setShowMoreMenu, setShowQuickWorkout,
    setShowHistory, handleSaveSnapshot, handleOpenOverrideModal,
    cns, cnsColor, cnsLabelKey,
}: WeekToolbarProps) {
    const t = useTranslations();

    return (
        <div className={styles.toolbar}>
            <button className={styles.backBtn} onClick={onBack} aria-label={t('training.back')}>
                <ArrowLeft size={20} />
            </button>
            <div className={styles.toolbarCenter}>
                <span className={styles.phaseName}>{phaseName}</span>
                <span className={styles.phaseGuideline}>
                    {t(`training.phaseGuideline_${phaseType}`)}
                </span>
                <div className={styles.weekNav}>
                    <button
                        className={styles.weekBtn}
                        onClick={handlePrevWeek}
                        disabled={weekNumber <= 1}
                        aria-label="Previous week"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className={styles.weekLabel}>
                        {t('training.weekConstructor')} {weekNumber}/{maxWeeks}
                    </span>
                    <button
                        className={styles.weekBtn}
                        onClick={handleNextWeek}
                        disabled={weekNumber >= maxWeeks}
                        aria-label="Next week"
                    >
                        <ChevronRight size={16} />
                    </button>

                    {onSwitchToMultiView && (
                        <button
                            className={styles.multiViewBtn}
                            onClick={onSwitchToMultiView}
                            title={t('training.multiWeekView')}
                        >
                            <CalendarDays size={16} />
                        </button>
                    )}

                    {/* Duplicate previous week */}
                    {weekNumber > 1 && !isReadOnly && (
                        confirmAction === 'duplicate' ? (
                            <div className={styles.inlineConfirmRow}>
                                <button className={styles.confirmYesBtn} onClick={handleDuplicateWeek} aria-label={t('confirm')}><CheckCircle2 size={14} /></button>
                                <button className={styles.confirmNoBtn} onClick={() => setConfirmAction(null)} aria-label={t('cancel')}><XCircle size={14} /></button>
                            </div>
                        ) : (
                            <button
                                className={styles.multiViewBtn}
                                onClick={() => setConfirmAction('duplicate')}
                                title={t('training.duplicateWeek')}
                                aria-label={t('training.duplicateWeek')}
                            >
                                <Copy size={16} />
                            </button>
                        )
                    )}
                </div>
            </div>

            <div className={styles.actionsRight}>
                {confirmAction === 'autofill' ? (
                    <div className={styles.inlineConfirmRow}>
                        <button className={styles.confirmYesBtn} onClick={handleAutoFill} aria-label={t('confirm')}><CheckCircle2 size={14} /></button>
                        <button className={styles.confirmNoBtn} onClick={() => setConfirmAction(null)} aria-label={t('cancel')}><XCircle size={14} /></button>
                    </div>
                ) : (
                    <button
                        className={styles.autoFillBtn}
                        onClick={() => setConfirmAction('autofill')}
                        disabled={isAutoFilling || isReadOnly}
                        title={t('training.autoFill')}
                    >
                        <Wand2 size={20} className={isAutoFilling ? 'animate-spin' : ''} />
                    </button>
                )}

                {/* A3: Apply Warmup to Week */}
                {!isReadOnly && (
                    <button
                        className={styles.autoFillBtn}
                        onClick={() => setShowWarmupPanel(true)}
                        title={t('training.applyWarmupToWeek')}
                        aria-label={t('training.applyWarmupToWeek')}
                    >
                        <Wind size={20} />
                    </button>
                )}

                {/* Publish / Revert to Draft */}
                {confirmAction === 'publish' ? (
                    <div className={styles.inlineConfirmRow}>
                        <button className={styles.confirmYesBtn} onClick={handlePublish} aria-label={t('confirm')}><CheckCircle2 size={14} /></button>
                        <button className={styles.confirmNoBtn} onClick={() => setConfirmAction(null)} aria-label={t('cancel')}><XCircle size={14} /></button>
                    </div>
                ) : (
                    <button
                        className={styles.publishBtn}
                        onClick={() => isPublished ? handlePublish() : setConfirmAction('publish')}
                        disabled={isPublishing}
                        title={isPublished ? t('training.revertAction') : t('training.publishAction')}
                        style={{
                            background: isPublished
                                ? 'var(--color-warning)'
                                : 'var(--color-success)',
                        }}
                    >
                        {isPublished ? <RotateCcw size={16} /> : <Send size={16} />}
                    </button>
                )}

                <div className={styles.moreMenuContainer} ref={menuRef}>
                    <button
                        className={styles.exportBtn}
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        title={t('training.moreActions')}
                    >
                        <MoreVertical size={16} />
                    </button>

                    {showMoreMenu && (
                        <div className={styles.moreMenuDropdown}>
                            <button
                                className={styles.dropdownItem}
                                onClick={() => { setShowQuickWorkout(true); setShowMoreMenu(false); }}
                            >
                                <Zap size={16} />
                                {t('training.quickWorkout') || 'Quick Workout'}
                            </button>
                            <button
                                className={styles.dropdownItem}
                                onClick={() => { window.print(); setShowMoreMenu(false); }}
                            >
                                <Printer size={16} />
                                {t('training.print')}
                            </button>
                            <button
                                className={styles.dropdownItem}
                                onClick={() => { setShowHistory(true); setShowMoreMenu(false); }}
                            >
                                <History size={16} />
                                {t('training.history')}
                            </button>
                            <button
                                className={styles.dropdownItem}
                                onClick={() => { handleSaveSnapshot(); setShowMoreMenu(false); }}
                            >
                                <Save size={16} />
                                {t('training.saveVersion')}
                            </button>
                            {isPublished && (
                                <button
                                    className={styles.dropdownItem}
                                    onClick={() => { handleOpenOverrideModal(); setShowMoreMenu(false); }}
                                >
                                    <UserCog size={16} />
                                    {t('training.createOverride')}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div
                    className={styles.cnsIndicator}
                    style={{ borderColor: cnsColor }}
                    title={`${t('training.cnsLabel')}: ${cns.total} (${t(`training.${cnsLabelKey}`)})`}
                >
                    <Zap size={14} style={{ color: cnsColor }} />
                    <span style={{ color: cnsColor }}>{cns.total}</span>
                </div>
            </div>
        </div>
    );
}
