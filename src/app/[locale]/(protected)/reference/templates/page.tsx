'use client';

/**
 * Training Templates Library
 * Lists system + custom warmup templates and training day templates.
 * Coach can create, copy, edit, delete templates.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import type { TrainingTemplateRecord } from '@/lib/pocketbase/types';
import { listTemplates, copyTemplate, deleteTemplate } from '@/lib/pocketbase/services/templates';
import type { TrainingTemplateWithItems } from '@/lib/pocketbase/services/templates';
import pb from '@/lib/pocketbase/client';
import TemplateList from '@/components/templates/TemplateList';
import TemplateEditor from '@/components/templates/TemplateEditor';
import styles from './templates.module.css';

type TemplateTab = 'warmup' | 'training_day';

export default function TemplatesPage() {
    const t = useTranslations('templates');
    const locale = useLocale();

    const [tab, setTab] = useState<TemplateTab>('warmup');
    const [templates, setTemplates] = useState<TrainingTemplateWithItems[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editorTemplate, setEditorTemplate] = useState<TrainingTemplateRecord | null | 'new'>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const all = await listTemplates();
            setTemplates(all.filter((t) => t.type === tab));
        } catch (e) {
            setError(t('loadError'));
            console.error('[TemplatesPage] load:', e);
        } finally {
            setLoading(false);
        }
    }, [tab, t]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleCopy = useCallback(async (template: TrainingTemplateRecord) => {
        const user = pb.authStore.record;
        if (!user) return;
        try {
            await copyTemplate(template.id, user.id as string);
            await load();
        } catch (e) {
            console.error('[TemplatesPage] copy:', e);
        }
    }, [load]);

    const handleDelete = useCallback(async (template: TrainingTemplateRecord) => {
        const name = template.name_ru || template.name_en || '';
        if (!confirm(t('deleteConfirm', { name }))) return;
        try {
            await deleteTemplate(template.id);
            await load();
        } catch (e) {
            console.error('[TemplatesPage] delete:', e);
        }
    }, [load, t]);

    const handleEdit = useCallback((template: TrainingTemplateRecord) => {
        setEditorTemplate(template);
    }, []);

    const handleCreate = useCallback(() => {
        setEditorTemplate('new');
    }, []);

    const handleEditorClose = useCallback(() => {
        setEditorTemplate(null);
        void load();
    }, [load]);

    const systemTemplates = templates.filter((t) => t.is_system);
    const myTemplates = templates.filter((t) => !t.is_system);

    return (
        <div className={styles.page}>
            {/* Back link */}
            <Link href={`/${locale}/reference`} className={styles.backLink}>
                <ChevronLeft size={18} aria-hidden="true" />
                {t('back')}
            </Link>

            {/* Header */}
            <header className={styles.header}>
                <h1 className={styles.title}>{t('title')}</h1>
                <p className={styles.subtitle}>{t('subtitle')}</p>
            </header>

            {/* Tabs */}
            <div className={styles.tabs} role="tablist">
                <button
                    role="tab"
                    aria-selected={tab === 'warmup'}
                    className={`${styles.tab} ${tab === 'warmup' ? styles.tabActive : ''}`}
                    onClick={() => setTab('warmup')}
                >
                    {t('warmupTab')}
                </button>
                <button
                    role="tab"
                    aria-selected={tab === 'training_day'}
                    className={`${styles.tab} ${tab === 'training_day' ? styles.tabActive : ''}`}
                    onClick={() => setTab('training_day')}
                >
                    {t('dayTab')}
                </button>
            </div>

            {/* Create button */}
            <div className={styles.actions}>
                <button className={styles.createBtn} onClick={handleCreate} id="templates-create-btn">
                    {t('create')}
                </button>
            </div>

            {/* Error */}
            {error && <div className={styles.errorMsg}>{error}</div>}

            {/* Loading */}
            {loading && <div className={styles.loadingSpinner} aria-label="Loading" />}

            {/* Template Lists */}
            {!loading && (
                <>
                    {/* System templates */}
                    <section aria-labelledby="system-section-title">
                        <h2 id="system-section-title" className={styles.sectionTitle}>
                            {t('systemSection')}
                        </h2>
                        <TemplateList
                            templates={systemTemplates}
                            isSystem
                            defaultLocale={locale as 'ru' | 'en' | 'cn'}
                            onCopy={handleCopy}
                        />
                    </section>

                    {/* My templates */}
                    <section aria-labelledby="my-section-title">
                        <h2 id="my-section-title" className={styles.sectionTitle}>
                            {t('mySection')}
                        </h2>
                        {myTemplates.length === 0 ? (
                            <p className={styles.emptyText}>{t('noMy')}</p>
                        ) : (
                            <TemplateList
                                templates={myTemplates}
                                isSystem={false}
                                defaultLocale={locale as 'ru' | 'en' | 'cn'}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        )}
                    </section>
                </>
            )}

            {/* Editor overlay */}
            {editorTemplate !== null && (
                <TemplateEditor
                    template={editorTemplate === 'new' ? null : editorTemplate}
                    defaultType={tab}
                    onClose={handleEditorClose}
                />
            )}
        </div>
    );
}
