import { useTranslations } from 'next-intl';
import { Plus, LayoutTemplate, Copy } from 'lucide-react';
import styles from './DayActions.module.css';

interface Props {
    session: number; // 0=AM, 1=PM
    readOnly?: boolean;
    onAddExercise: (session: number) => void;
    onOpenTemplates?: (session: number) => void;
    onSaveAsTemplate?: (session: number, name: string) => void;
}

export function DayActions({
    session,
    readOnly,
    onAddExercise,
    onOpenTemplates,
    onSaveAsTemplate,
}: Props) {
    const t = useTranslations();

    if (readOnly) return null;

    const handleSaveAsTemplate = () => {
        if (!onSaveAsTemplate) return;
        const name = prompt(t('training.saveTemplatePrompt'));
        if (name && name.trim()) {
            onSaveAsTemplate(session, name.trim());
        }
    };

    return (
        <div className={styles.actions}>
            <button
                className={styles.addBtn}
                onClick={() => onAddExercise(session)}
                aria-label={t('training.addExercise')}
            >
                <Plus size={16} />
                <span>{t('training.addExercise')}</span>
            </button>

            <div className={styles.secondaryGroup}>
                {onSaveAsTemplate && (
                    <button
                        className={styles.secondaryBtn}
                        onClick={handleSaveAsTemplate}
                        title={t('training.savePhaseAsTemplate')} // Re-using translation key, although typically generic
                        aria-label="Save block as template"
                    >
                        <Copy size={16} />
                    </button>
                )}
                {onOpenTemplates && (
                    <button
                        className={styles.secondaryBtn}
                        onClick={() => onOpenTemplates(session)}
                        title="Templates"
                        aria-label="Templates"
                    >
                        <LayoutTemplate size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
