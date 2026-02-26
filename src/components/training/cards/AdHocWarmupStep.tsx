import { useState, useId } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X } from 'lucide-react';
import type { AdHocWarmupData } from '../types';
import styles from '../DayColumn.module.css';

interface AdHocWarmupStepBtnProps {
    onAdd: (data: AdHocWarmupData) => void;
}

export function AdHocWarmupStepBtn({ onAdd }: AdHocWarmupStepBtnProps) {
    const t = useTranslations('training');
    const [open, setOpen] = useState(false);
    const [text, setText] = useState('');
    const [sec, setSec] = useState(60);
    const uid = useId();

    const submit = () => {
        if (!text.trim()) return;
        onAdd({ custom_text_ru: text.trim(), custom_text_en: text.trim(), custom_text_cn: text.trim(), duration_seconds: sec });
        setText(''); setSec(60); setOpen(false);
    };

    if (!open) {
        return (
            <button type="button" className={styles.warmupBtn} onClick={() => setOpen(true)} id={`${uid}-step`}>
                <Plus size={12} aria-hidden="true" />
                {t('addWarmupStep')}
            </button>
        );
    }

    return (
        <div className={styles.adHocForm}>
            <input
                autoFocus
                className={styles.adHocInput}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('addWarmupStep')}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false); }}
            />
            <input
                type="number" min={0} value={sec}
                onChange={(e) => setSec(Number(e.target.value))}
                className={styles.adHocSec}
                aria-label="seconds"
            />
            <button type="button" className={styles.adHocSave} onClick={submit} aria-label="Add"><Plus size={12} /></button>
            <button type="button" className={styles.adHocCancel} onClick={() => setOpen(false)} aria-label="Cancel"><X size={12} /></button>
        </div>
    );
}
