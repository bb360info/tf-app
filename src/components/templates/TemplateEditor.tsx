'use client';

/**
 * TemplateEditor — creates or edits a training template.
 * Supports:
 *  - 3-locale names (ru/en/cn)
 *  - warmup type: single "warmup" section
 *  - training_day type: "warmup" + "main" sections
 *  - Items: from exercise catalog OR custom text step
 *  - @dnd-kit/sortable for item reordering within each section
 */

import { useState, useEffect, useCallback, useId } from 'react';
import { useTranslations } from 'next-intl';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical, Trash2, Plus, ChevronDown } from 'lucide-react';
import type { TrainingTemplateRecord } from '@/lib/pocketbase/types';
import type { TemplateType, TemplateItemBlock } from '@/lib/pocketbase/types';
import type { TemplateItemWithExpand } from '@/lib/pocketbase/services/templates';
import {
    createTemplate,
    updateTemplate,
    listTemplateItems,
    addTemplateItem,
    updateTemplateItem,
    removeTemplateItem,
    reorderTemplateItems,
} from '@/lib/pocketbase/services/templates';
import pb from '@/lib/pocketbase/client';
import styles from './TemplateEditor.module.css';

// ─── ExercisePicker ───────────────────────────────────────────

interface ExerciseOption { id: string; name: string; }

interface ExercisePickerProps {
    onSelect: (ex: ExerciseOption) => void;
}

function ExercisePicker({ onSelect }: ExercisePickerProps) {
    const t = useTranslations('templates');
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ExerciseOption[]>([]);
    const [loading, setLoading] = useState(false);
    const uid = useId();

    useEffect(() => {
        if (query.length < 2) { setResults([]); return; }
        const id = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await pb.collection('exercises').getList(1, 20, {
                    filter: `name_ru ~ "${query}" || name_en ~ "${query}"`,
                    sort: 'name_en',
                });
                setResults(res.items.map((ex) => ({
                    id: ex.id,
                    name: (ex.name_ru as string) || (ex.name_en as string),
                })));
            } catch { /* non-critical: search error */ setResults([]); }
            finally { setLoading(false); }
        }, 300);
        return () => clearTimeout(id);
    }, [query]);

    if (!open) {
        return (
            <button type="button" className={styles.addBtn} onClick={() => setOpen(true)} id={`${uid}-catalog`}>
                <Plus size={14} aria-hidden="true" />
                {t('addFromCatalog')}
            </button>
        );
    }

    return (
        <div className={styles.pickerWrap}>
            <input
                autoFocus
                className={styles.pickerInput}
                placeholder={t('addFromCatalog')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                id={`${uid}-picker-input`}
            />
            {loading && <div className={styles.pickerLoading} />}
            {results.length > 0 && (
                <ul className={styles.pickerList} role="listbox">
                    {results.map((ex) => (
                        <li
                            key={ex.id}
                            role="option"
                            aria-selected={false}
                            className={styles.pickerItem}
                            onClick={() => { onSelect(ex); setOpen(false); setQuery(''); setResults([]); }}
                        >
                            {ex.name}
                        </li>
                    ))}
                </ul>
            )}
            <button type="button" className={styles.pickerClose}
                onClick={() => { setOpen(false); setQuery(''); setResults([]); }}
                aria-label="Close"
            >
                <X size={14} aria-hidden="true" />
            </button>
        </div>
    );
}

// ─── SortableItemRow ──────────────────────────────────────────

interface ItemRowProps {
    item: TemplateItemWithExpand;
    onRemove: (id: string) => void;
    onUpdate: (id: string, field: string, value: string | number | undefined) => void;
}

function SortableItemRow({ item, onRemove, onUpdate }: ItemRowProps) {
    const t = useTranslations('templates');
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

    const displayName =
        item.custom_text_ru ??
        item.custom_text_en ??
        item.expand?.exercise_id?.name_ru ??
        item.expand?.exercise_id?.name_en ??
        item.exercise_id ??
        '—';

    return (
        <div ref={setNodeRef} style={style} className={styles.itemRow}>
            <span {...attributes} {...listeners} className={styles.dragHandle} aria-label="Drag">
                <GripVertical size={16} aria-hidden="true" />
            </span>
            <span className={styles.itemName}>{displayName}</span>

            {/* custom item: duration */}
            {!item.exercise_id && (
                <input
                    type="number" min={0}
                    value={item.duration_seconds ?? 0}
                    onChange={(e) => onUpdate(item.id, 'duration_seconds', Number(e.target.value))}
                    className={styles.itemInput}
                    aria-label={t('durationSec')}
                />
            )}

            {/* exercise item: sets + reps */}
            {!!item.exercise_id && (
                <>
                    <input
                        type="number" min={1}
                        value={item.sets ?? 3}
                        onChange={(e) => onUpdate(item.id, 'sets', Number(e.target.value))}
                        className={styles.itemInput}
                        aria-label={t('sets')}
                    />
                    <input
                        type="text"
                        value={item.reps ?? ''}
                        onChange={(e) => onUpdate(item.id, 'reps', e.target.value)}
                        className={styles.itemInput}
                        aria-label={t('reps')}
                    />
                </>
            )}

            <button type="button" className={styles.removeBtn} onClick={() => onRemove(item.id)} aria-label={t('removeItem')}>
                <Trash2 size={14} aria-hidden="true" />
            </button>
        </div>
    );
}

// ─── CustomStepForm ───────────────────────────────────────────

interface CustomStepFormProps {
    onAdd: (text: string, durationSec: number) => void;
}

function CustomStepForm({ onAdd }: CustomStepFormProps) {
    const t = useTranslations('templates');
    const [open, setOpen] = useState(false);
    const [text, setText] = useState('');
    const [dur, setDur] = useState(60);
    const uid = useId();

    const submit = () => {
        if (!text.trim()) return;
        onAdd(text.trim(), dur);
        setText(''); setDur(60); setOpen(false);
    };

    if (!open) {
        return (
            <button type="button" className={styles.addBtn} onClick={() => setOpen(true)} id={`${uid}-custom`}>
                <Plus size={14} aria-hidden="true" />
                {t('addCustomStep')}
            </button>
        );
    }

    return (
        <div className={styles.customForm}>
            <input autoFocus className={styles.fieldInput} value={text}
                onChange={(e) => setText(e.target.value)} placeholder={t('customTextPlaceholder')} />
            <input type="number" min={0} value={dur}
                onChange={(e) => setDur(Number(e.target.value))}
                className={styles.fieldInput} aria-label={t('durationSec')} />
            <div className={styles.customActions}>
                <button type="button" className={styles.saveMiniBtn} onClick={submit} aria-label={t('save')}><Plus size={14} /></button>
                <button type="button" className={styles.cancelMiniBtn} onClick={() => setOpen(false)} aria-label={t('cancel')}><X size={14} /></button>
            </div>
        </div>
    );
}

// ─── TemplateSection ──────────────────────────────────────────

interface SectionProps {
    block: TemplateItemBlock;
    items: TemplateItemWithExpand[];
    onAddFromCatalog: (block: TemplateItemBlock, ex: ExerciseOption) => void;
    onAddCustom: (block: TemplateItemBlock, text: string, dur: number) => void;
    onRemove: (id: string) => void;
    onUpdate: (id: string, field: string, value: string | number | undefined) => void;
    onReorder: (block: TemplateItemBlock, activeId: string, overId: string) => void;
}

function TemplateSection({ block, items, onAddFromCatalog, onAddCustom, onRemove, onUpdate, onReorder }: SectionProps) {
    const t = useTranslations('templates');
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    );

    const sectionItems = items.filter((i) => i.block === block);
    const label = block === 'warmup' ? t('warmupSection') : t('mainSection');

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            onReorder(block, active.id as string, over.id as string);
        }
    }

    return (
        <div className={styles.section}>
            <h3 className={styles.sectionLabel}>{label}</h3>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sectionItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                    {sectionItems.map((item) => (
                        <SortableItemRow key={item.id} item={item} onRemove={onRemove} onUpdate={onUpdate} />
                    ))}
                </SortableContext>
            </DndContext>
            <div className={styles.addControls}>
                <ExercisePicker onSelect={(ex) => onAddFromCatalog(block, ex)} />
                <CustomStepForm onAdd={(text, dur) => onAddCustom(block, text, dur)} />
            </div>
        </div>
    );
}

// ─── TemplateEditor ───────────────────────────────────────────

interface Props {
    template: TrainingTemplateRecord | null;
    defaultType: 'warmup' | 'training_day';
    onClose: () => void;
}

export default function TemplateEditor({ template, defaultType, onClose }: Props) {
    const t = useTranslations('templates');
    const uid = useId();

    const [nameRu, setNameRu] = useState(template?.name_ru ?? '');
    const [nameEn, setNameEn] = useState(template?.name_en ?? '');
    const [nameCn, setNameCn] = useState(template?.name_cn ?? '');
    const [type, setType] = useState<TemplateType>(template?.type ?? defaultType);
    const [totalMinutes, setTotalMinutes] = useState(template?.total_minutes ?? 15);
    const [items, setItems] = useState<TemplateItemWithExpand[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!template) return;
        listTemplateItems(template.id).then(setItems).catch(console.error);
    }, [template]);

    // ── Save ─────────────────────────────────────────────────

    const handleSave = useCallback(async () => {
        if (!nameRu.trim() || !nameEn.trim()) {
            setError(`${t('nameRu')} & ${t('nameEn')} required`);
            return;
        }
        setSaving(true); setError('');
        try {
            if (template) {
                await updateTemplate(template.id, { name_ru: nameRu, name_en: nameEn, name_cn: nameCn, total_minutes: totalMinutes });
            } else {
                // Get current user for coach_id
                const user = pb.authStore.record;
                if (!user) throw new Error('Not authenticated');
                const newTemplate = await createTemplate({
                    coach_id: user.id as string,
                    name_ru: nameRu,
                    name_en: nameEn,
                    name_cn: nameCn,
                    type,
                    total_minutes: totalMinutes,
                });
                // Re-add local items to real template
                for (const item of items) {
                    await addTemplateItem({
                        template_id: newTemplate.id,
                        order: item.order,
                        block: item.block,
                        exercise_id: item.exercise_id ?? undefined,
                        custom_text_ru: item.custom_text_ru ?? undefined,
                        custom_text_en: item.custom_text_en ?? undefined,
                        custom_text_cn: item.custom_text_cn ?? undefined,
                        duration_seconds: item.duration_seconds ?? undefined,
                        sets: item.sets ?? undefined,
                        reps: item.reps ?? undefined,
                    });
                }
            }
            onClose();
        } catch (e) {
            console.error('[TemplateEditor] save:', e);
            setError(t('saveError'));
        } finally {
            setSaving(false);
        }
    }, [template, nameRu, nameEn, nameCn, type, totalMinutes, items, onClose, t]);

    // ── Item management ───────────────────────────────────────

    const handleAddFromCatalog = useCallback(async (block: TemplateItemBlock, ex: ExerciseOption) => {
        const order = items.filter((i) => i.block === block).length;
        if (template) {
            const newItem = await addTemplateItem({
                template_id: template.id,
                order,
                block,
                exercise_id: ex.id,
                sets: 3,
                reps: '8-10',
            });
            setItems((prev) => [...prev, newItem]);
        } else {
            // Local-only for new template (synthetic record)
            const localItem = {
                id: `local_${Date.now()}`,
                template_id: '',
                order,
                block,
                exercise_id: ex.id,
                custom_text_ru: null,
                custom_text_en: null,
                custom_text_cn: null,
                duration_seconds: null,
                sets: 3,
                reps: '8-10',
                intensity: null,
                weight: null,
                distance: null,
                rest_seconds: null,
                notes: null,
                created: '',
                updated: '',
                collectionId: '',
                collectionName: 'template_items',
                expand: {
                    exercise_id: {
                        id: ex.id,
                        name_ru: ex.name,
                        name_en: ex.name,
                        name_cn: ex.name,
                    },
                },
            } as unknown as TemplateItemWithExpand;
            setItems((prev) => [...prev, localItem]);
        }
    }, [template, items]);

    const handleAddCustom = useCallback(async (block: TemplateItemBlock, text: string, durationSec: number) => {
        const order = items.filter((i) => i.block === block).length;
        if (template) {
            const newItem = await addTemplateItem({
                template_id: template.id,
                order,
                block,
                custom_text_ru: text,
                custom_text_en: text,
                custom_text_cn: text,
                duration_seconds: durationSec,
            });
            setItems((prev) => [...prev, newItem]);
        } else {
            const localItem = {
                id: `local_${Date.now()}`,
                template_id: '',
                order,
                block,
                exercise_id: null,
                custom_text_ru: text,
                custom_text_en: text,
                custom_text_cn: text,
                duration_seconds: durationSec,
                sets: null,
                reps: null,
                intensity: null,
                weight: null,
                distance: null,
                rest_seconds: null,
                notes: null,
                created: '',
                updated: '',
                collectionId: '',
                collectionName: 'template_items',
                expand: undefined,
            } as unknown as TemplateItemWithExpand;
            setItems((prev) => [...prev, localItem]);
        }
    }, [template, items]);

    const handleRemove = useCallback(async (id: string) => {
        if (!id.startsWith('local_') && template) {
            await removeTemplateItem(id).catch(console.error);
        }
        setItems((prev) => prev.filter((i) => i.id !== id));
    }, [template]);

    const handleUpdate = useCallback(async (id: string, field: string, value: string | number | undefined) => {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
        if (!id.startsWith('local_') && template) {
            await updateTemplateItem(id, { [field]: value }).catch(console.error);
        }
    }, [template]);

    const handleReorder = useCallback((block: TemplateItemBlock, activeId: string, overId: string) => {
        setItems((prev) => {
            const blockItems = prev.filter((i) => i.block === block);
            const otherItems = prev.filter((i) => i.block !== block);
            const ai = blockItems.findIndex((i) => i.id === activeId);
            const oi = blockItems.findIndex((i) => i.id === overId);
            const reordered = arrayMove(blockItems, ai, oi).map((item, idx) => ({ ...item, order: idx }));
            if (template) {
                void reorderTemplateItems(reordered.map((i) => ({ id: i.id, order: i.order })));
            }
            return [...otherItems, ...reordered];
        });
    }, [template]);

    // ── Render ────────────────────────────────────────────────

    const isNew = !template;
    const title = isNew ? t('editorTitleNew') : t('editorTitle');
    const currentType = isNew ? type : template.type;

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={title}>
            <div className={styles.panel}>
                {/* Header */}
                <div className={styles.panelHeader}>
                    <h2 className={styles.panelTitle}>{title}</h2>
                    <button className={styles.closeBtn} onClick={onClose} aria-label={t('cancel')}>
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                {/* Body */}
                <div className={styles.body}>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor={`${uid}-name-ru`}>{t('nameRu')}</label>
                        <input id={`${uid}-name-ru`} className={styles.fieldInput} value={nameRu}
                            onChange={(e) => setNameRu(e.target.value)} aria-required="true" />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor={`${uid}-name-en`}>{t('nameEn')}</label>
                        <input id={`${uid}-name-en`} className={styles.fieldInput} value={nameEn}
                            onChange={(e) => setNameEn(e.target.value)} aria-required="true" />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor={`${uid}-name-cn`}>{t('nameCn')}</label>
                        <input id={`${uid}-name-cn`} className={styles.fieldInput} value={nameCn}
                            onChange={(e) => setNameCn(e.target.value)} />
                    </div>

                    <div className={styles.row}>
                        {isNew && (
                            <div className={styles.fieldGroup}>
                                <label className={styles.label} htmlFor={`${uid}-type`}>{t('type')}</label>
                                <div className={styles.selectWrap}>
                                    <select id={`${uid}-type`} className={styles.selectField} value={type}
                                        onChange={(e) => setType(e.target.value as TemplateType)}>
                                        <option value="warmup">{t('typeWarmup')}</option>
                                        <option value="training_day">{t('typeDay')}</option>
                                    </select>
                                    <ChevronDown size={14} className={styles.selectIcon} aria-hidden="true" />
                                </div>
                            </div>
                        )}
                        <div className={styles.fieldGroup}>
                            <label className={styles.label} htmlFor={`${uid}-mins`}>{t('totalMinutes')}</label>
                            <input id={`${uid}-mins`} type="number" min={1} max={240}
                                className={styles.fieldInput} value={totalMinutes}
                                onChange={(e) => setTotalMinutes(Number(e.target.value))} />
                        </div>
                    </div>

                    {/* Sections */}
                    <TemplateSection block="warmup" items={items}
                        onAddFromCatalog={handleAddFromCatalog} onAddCustom={handleAddCustom}
                        onRemove={handleRemove} onUpdate={handleUpdate} onReorder={handleReorder} />

                    {currentType === 'training_day' && (
                        <TemplateSection block="main" items={items}
                            onAddFromCatalog={handleAddFromCatalog} onAddCustom={handleAddCustom}
                            onRemove={handleRemove} onUpdate={handleUpdate} onReorder={handleReorder} />
                    )}

                    {error && <div className={styles.errorMsg}>{error}</div>}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>
                        {t('cancel')}
                    </button>
                    <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving} id={`${uid}-save-btn`}>
                        {saving ? t('saving') : t('save')}
                    </button>
                </div>
            </div>
        </div>
    );
}
