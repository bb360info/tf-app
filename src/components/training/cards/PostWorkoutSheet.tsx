'use client';

/**
 * PostWorkoutSheet — BottomSheet с выбором режима логирования пост-фактум.
 * 3 режима: Express (batch), Quick Edit (toggles), Full Review (FocusCard).
 */

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Zap, PenLine, SearchCheck } from 'lucide-react';
import styles from './PostWorkoutSheet.module.css';

const BottomSheet = dynamic(() => import('@/components/shared/BottomSheet'), { ssr: false });

export interface PostWorkoutSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onExpress: () => void;
    onQuickEdit: () => void;
    onFullReview: () => void;
}

export function PostWorkoutSheet({
    isOpen,
    onClose,
    onExpress,
    onQuickEdit,
    onFullReview,
}: PostWorkoutSheetProps) {
    const t = useTranslations('training');

    const options = [
        {
            id: 'express',
            icon: Zap,
            label: t('postWorkout.express'),
            desc: t('postWorkout.expressDesc'),
            onClick: onExpress,
            accent: true,
        },
        {
            id: 'quick',
            icon: PenLine,
            label: t('postWorkout.quickEdit'),
            desc: t('postWorkout.quickEditDesc'),
            onClick: onQuickEdit,
            accent: false,
        },
        {
            id: 'full',
            icon: SearchCheck,
            label: t('postWorkout.fullReview'),
            desc: t('postWorkout.fullReviewDesc'),
            onClick: onFullReview,
            accent: false,
        },
    ] as const;

    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={onClose}
            title={t('postWorkout.title')}
        >
            <div className={styles.optionList}>
                {options.map(({ id, icon: Icon, label, desc, onClick, accent }) => (
                    <button
                        key={id}
                        type="button"
                        className={`${styles.optionBtn} ${accent ? styles.optionBtnAccent : ''}`}
                        onClick={onClick}
                    >
                        <span className={`${styles.optionIcon} ${accent ? styles.optionIconAccent : ''}`}>
                            <Icon size={22} aria-hidden="true" />
                        </span>
                        <span className={styles.optionText}>
                            <span className={styles.optionLabel}>{label}</span>
                            <span className={styles.optionDesc}>{desc}</span>
                        </span>
                    </button>
                ))}
            </div>
        </BottomSheet>
    );
}
