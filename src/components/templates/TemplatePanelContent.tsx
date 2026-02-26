import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { RefreshCw, Plus } from 'lucide-react';
import type { TrainingTemplateWithItems } from '@/lib/pocketbase/services/templates';
import TemplateList from './TemplateList';
import styles from './TemplatePanel.module.css';

interface TemplatePanelContentProps {
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

export function TemplatePanelContent({
    templates,
    isLoading,
    isValidating,
    fetchError,
    activeTab,
    setActiveTab,
    filterType,
    setFilterType,
    isApplying,
    onApply,
    onCreateTemplate,
    onRefresh
}: TemplatePanelContentProps) {
    const t = useTranslations('templates');
    const locale = useLocale() as 'ru' | 'en' | 'cn';

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.skeletonTop} />
                <div className={styles.skeletonItem} />
                <div className={styles.skeletonItem} />
                <div className={styles.skeletonItem} />
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className={styles.errorContainer}>
                <p className={styles.errorText}>{t('loadError')}</p>
                <button onClick={onRefresh} className={styles.retryBtn}>
                    {t('retry')}
                </button>
            </div>
        );
    }

    const isEmpty = templates.length === 0;

    return (
        <div className={styles.contentWrap}>
            {/* Header / Tabs */}
            <div className={styles.header}>
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'system' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('system')}
                    >
                        {t('systemTemplates')}
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'my' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('my')}
                    >
                        {t('myTemplates')}
                    </button>
                </div>

                <div className={styles.headerActions}>
                    {activeTab === 'my' && (
                        <button
                            className={styles.createHeaderBtn}
                            onClick={onCreateTemplate}
                            disabled={isApplying}
                        >
                            <Plus size={16} />
                            {t('create')}
                        </button>
                    )}
                    <button
                        className={`${styles.refreshBtn} ${isValidating ? styles.spin : ''}`}
                        onClick={onRefresh}
                        title={t('refresh')}
                        aria-label={t('refresh')}
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className={styles.filters}>
                {(['all', 'warmup', 'training_day'] as const).map(type => (
                    <button
                        key={type}
                        className={`${styles.filterChip} ${filterType === type ? styles.activeFilter : ''}`}
                        onClick={() => setFilterType(type)}
                    >
                        {t(`filter_${type}`)}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className={styles.listContainer}>
                {isEmpty ? (
                    <div className={styles.emptyState}>
                        <p>{activeTab === 'system' ? t('noSystemTemplates') : t('noMyTemplates')}</p>
                        {activeTab === 'my' && (
                            <button className={styles.createBtn} onClick={onCreateTemplate} disabled={isApplying}>
                                <Plus size={16} />
                                {t('createFirstTemplate')}
                            </button>
                        )}
                    </div>
                ) : (
                    <TemplateList
                        templates={templates}
                        isSystem={activeTab === 'system'}
                        defaultLocale={locale}
                        onApply={(template) => onApply(template.id)}
                    />
                )}
            </div>
        </div>
    );
}
