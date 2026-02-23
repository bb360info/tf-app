'use client';

/**
 * TemplateList — renders a list of training templates (system or user-owned).
 * System templates: show Copy button only.
 * User templates: show Edit + Delete buttons.
 */

import { useTranslations } from 'next-intl';
import { Copy, Pencil, Trash2, Clock } from 'lucide-react';
import type { TrainingTemplateRecord } from '@/lib/pocketbase/types';
import styles from './TemplateList.module.css';

type Language = 'ru' | 'en' | 'cn';

interface Props {
    templates: TrainingTemplateRecord[];
    isSystem: boolean;
    defaultLocale: Language;
    onCopy?: (template: TrainingTemplateRecord) => void;
    onEdit?: (template: TrainingTemplateRecord) => void;
    onDelete?: (template: TrainingTemplateRecord) => void;
}

function getLocalizedName(template: TrainingTemplateRecord, locale: Language): string {
    switch (locale) {
        case 'ru': return template.name_ru || template.name_en || '';
        case 'cn': return template.name_cn || template.name_en || '';
        default: return template.name_en || '';
    }
}

export default function TemplateList({ templates, isSystem, defaultLocale, onCopy, onEdit, onDelete }: Props) {
    const t = useTranslations('templates');

    if (templates.length === 0) return null;

    return (
        <ul className={styles.list} role="list">
            {templates.map((template) => (
                <li key={template.id} className={styles.card}>
                    {/* Left: info */}
                    <div className={styles.info}>
                        <span className={styles.name}>
                            {getLocalizedName(template, defaultLocale)}
                        </span>
                        <span className={styles.meta}>
                            <Clock size={12} aria-hidden="true" />
                            {template.total_minutes}&nbsp;{t('min')}
                        </span>
                    </div>

                    {/* Right: actions */}
                    <div className={styles.actions}>
                        {isSystem && onCopy && (
                            <button
                                className={styles.actionBtn}
                                onClick={() => onCopy(template)}
                                title={t('copy')}
                                aria-label={`${t('copy')}: ${getLocalizedName(template, defaultLocale)}`}
                            >
                                <Copy size={16} aria-hidden="true" />
                            </button>
                        )}
                        {!isSystem && onEdit && (
                            <button
                                className={styles.actionBtn}
                                onClick={() => onEdit(template)}
                                title={t('edit')}
                                aria-label={`${t('edit')}: ${getLocalizedName(template, defaultLocale)}`}
                            >
                                <Pencil size={16} aria-hidden="true" />
                            </button>
                        )}
                        {!isSystem && onDelete && (
                            <button
                                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                onClick={() => onDelete(template)}
                                title={t('delete')}
                                aria-label={`${t('delete')}: ${getLocalizedName(template, defaultLocale)}`}
                            >
                                <Trash2 size={16} aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}
