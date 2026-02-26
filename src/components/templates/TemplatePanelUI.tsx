'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { TemplatePanelContent } from './TemplatePanelContent';
import type { TrainingTemplateWithItems } from '@/lib/pocketbase/services/templates';
import styles from './TemplatePanel.module.css';

// Lazy load BottomSheet to avoid unnecessary JS on desktop if not used
const BottomSheet = dynamic(() => import('@/components/shared/BottomSheet'), { ssr: false });

interface TemplatePanelUIProps {
    isOpen: boolean;
    onClose: () => void;
    templates: TrainingTemplateWithItems[];
    isLoading: boolean;
    isValidating: boolean;
    fetchError: Error | null;
    activeTab: 'system' | 'my';
    setActiveTab: (tab: 'system' | 'my') => void;
    filterType: 'all' | 'warmup' | 'training_day';
    setFilterType: (type: 'all' | 'warmup' | 'training_day') => void;
    isApplying: boolean;
    onApply: (templateId: string) => void;
    onCreateTemplate: () => void;
    onRefresh: () => void;
}

export function TemplatePanelUI(props: TemplatePanelUIProps) {
    const t = useTranslations('templates');

    // Static Export Safe Responsiveness:
    // Render BOTH the Sidebar (for Desktop) and BottomSheet (for Mobile).
    // CSS media queries will hide/show the correct one.
    // This avoids hydration mismatch caused by JS window.innerWidth checks.

    return (
        <>
            {/* Desktop Overlay Sidebar (hidden on mobile via CSS) */}
            <div className={`${styles.sidebarWrapper} ${props.isOpen ? styles.open : ''}`}>
                <div className={styles.sidebarOverlay} onClick={props.onClose} aria-hidden="true" />
                <aside className={styles.sidebar} role="dialog" aria-modal="true" aria-label={t('panelTitle')}>
                    <div className={styles.sidebarHeader}>
                        <h2 className={styles.sidebarTitle}>{t('panelTitle')}</h2>
                        <button onClick={props.onClose} className={styles.closeButton} aria-label="Close">
                            <X size={20} strokeWidth={2} />
                        </button>
                    </div>
                    <div className={styles.sidebarBody}>
                        <TemplatePanelContent {...props} />
                    </div>
                </aside>
            </div>

            {/* Mobile Bottom Sheet (hidden on desktop via CSS) */}
            <div className={styles.mobileWrapper}>
                <BottomSheet isOpen={props.isOpen} onClose={props.onClose} title={t('panelTitle')}>
                    <TemplatePanelContent {...props} />
                </BottomSheet>
            </div>
        </>
    );
}
