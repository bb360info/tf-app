import { useState } from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getExerciseName, cnsCostColor } from '@/lib/pocketbase/services/exercises';
import type { PlanExerciseWithExpand } from '@/lib/pocketbase/services/plans';
import type { UnitType } from '@/lib/pocketbase/types';
import type { UpdateExerciseData } from '../types';
import { SetLogger } from './SetLogger';
import styles from './ExerciseRow.module.css';

interface RowProps {
    planExercise: PlanExerciseWithExpand;
    locale: 'ru' | 'en' | 'cn';
    onUpdate: (id: string, data: UpdateExerciseData) => void;
    onRemove: (id: string) => void;
}

export function ExerciseRow({ planExercise, locale, onUpdate, onRemove }: RowProps) {
    const exercise = planExercise.expand?.exercise_id;
    const unitType: UnitType = exercise?.unit_type ?? 'reps';
    const [editing, setEditing] = useState(false);

    // dnd-kit integration
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: planExercise.id });

    const dndStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const rowClassName = `${styles.row} ${isDragging ? styles.rowDragging : ''}`;

    // Handle items without exercise (custom_text edge case)
    let name: string;
    let cnsCost = 2;
    if (exercise) {
        name = getExerciseName(exercise, locale);
        cnsCost = exercise.cns_cost ?? 2;
    } else {
        const textMap: Record<string, string | null | undefined> = {
            ru: planExercise.custom_text_ru,
            en: planExercise.custom_text_en,
            cn: planExercise.custom_text_cn,
        };
        name = textMap[locale] ?? planExercise.custom_text_ru ?? planExercise.custom_text_en ?? '—';
    }

    const dosageLabel = (() => {
        const s = planExercise.sets;
        if (!s) return '+'; // Prompt to add
        switch (unitType) {
            case 'weight':
                return `${s}×${planExercise.reps || '?'}${planExercise.weight ? ` @${planExercise.weight}kg` : ''}`;
            case 'distance':
                return `${s}×${planExercise.distance ? `${planExercise.distance}m` : '?m'}`;
            case 'time':
                return `${s}×${planExercise.duration ? `${planExercise.duration}s` : '?s'}`;
            default:
                return planExercise.reps
                    ? `${s}×${planExercise.reps}${planExercise.intensity ? ` @${planExercise.intensity}` : ''}`
                    : `${s} sets`;
        }
    })();

    return (
        <div ref={setNodeRef} style={dndStyle} className={rowClassName}>
            <div className={styles.rowHeader}>
                <div
                    className={styles.dragHandle}
                    {...attributes}
                    {...listeners}
                    aria-label="Drag handle"
                >
                    <GripVertical size={16} />
                </div>
                <div
                    className={styles.cnsDot}
                    style={{ backgroundColor: cnsCostColor(cnsCost) }}
                    title={`CNS: ${cnsCost}/5`}
                />
                <span className={styles.rowName} title={name}>
                    {name}
                </span>

                <div className={styles.rowActions}>
                    <button
                        className={styles.actionBtn}
                        onClick={() => onRemove(planExercise.id)}
                        aria-label="Remove"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {editing ? (
                <div style={{ padding: '0 var(--space-3) var(--space-3)' }}>
                    <SetLogger
                        planExercise={planExercise}
                        mode="plan"
                        onUpdate={(id, data) => {
                            onUpdate(id, data);
                            setEditing(false);
                        }}
                    />
                </div>
            ) : (
                <div className={styles.rowMeta}>
                    <button className={styles.dosageBtn} onClick={() => setEditing(true)}>
                        {dosageLabel}
                    </button>
                </div>
            )}
        </div>
    );
}
