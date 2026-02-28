import { Trash2, Wind } from 'lucide-react';
import { getExerciseName } from '@/lib/pocketbase/services/exercises';
import type { PlanExerciseWithExpand } from '@/lib/pocketbase/services/plans';
import styles from '../DayColumn.module.css';

interface WarmupCardProps {
    item: PlanExerciseWithExpand;
    locale: 'ru' | 'en' | 'cn';
    onRemove: (id: string) => void;
    readOnly?: boolean;
}

export function WarmupCard({ item, locale, onRemove, readOnly }: WarmupCardProps) {
    const exercise = item.expand?.exercise_id;

    // Resolve display name
    let name: string;
    if (exercise) {
        name = getExerciseName(exercise, locale);
    } else {
        // Custom text item
        const textMap: Record<string, string | null | undefined> = {
            ru: item.custom_text_ru,
            en: item.custom_text_en,
            cn: item.custom_text_cn,
        };
        name = textMap[locale] ?? item.custom_text_ru ?? item.custom_text_en ?? '—';
    }

    const durationSec = item.duration_seconds ?? (item.duration ? Math.round(item.duration) : null);

    return (
        <div className={styles.warmupCard}>
            <Wind size={16} className={styles.warmupCardIcon} aria-hidden="true" />
            <span className={styles.warmupCardName}>{name}</span>
            {durationSec ? (
                <span className={styles.warmupCardDur}>{durationSec}s</span>
            ) : null}
            {!readOnly && (
                <button
                    className={styles.warmupCardRemove}
                    onClick={() => onRemove(item.id)}
                    aria-label="Remove warmup item"
                >
                    <Trash2 size={16} aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
