import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Sun, Moon, Wind, X, MessageSquare, Zap } from 'lucide-react';

import type { PlanExerciseWithExpand } from '@/lib/pocketbase/services/plans';
import type { UpdateExerciseData, AdHocWarmupData } from './types';
import { DayHeader } from './cards/DayHeader';
import { DayActions } from './cards/DayActions';
import { ExerciseRow } from './cards/ExerciseRow';
import { WarmupCard } from './cards/WarmupCard';
import { AdHocWarmupStepBtn } from './cards/AdHocWarmupStep';
import styles from './DayConstructor.module.css';

interface Props {
    dayOfWeek: number; // 0=Mon, 6=Sun
    date: Date | null;
    exercisesBySession: Record<number, PlanExerciseWithExpand[]>;
    onAdd: (session: number) => void;
    onUpdate: (id: string, data: UpdateExerciseData) => void;
    onRemove: (id: string) => void;
    onReorder: (id: string, direction: 'up' | 'down') => void;
    onReorderDrag?: (updates: { id: string; order: number }[]) => void;
    onClose: () => void;
    readOnly?: boolean;
    dayNote?: string;
    onDayNoteChange?: (note: string) => void;
    onOpenTemplates?: (session: number) => void;
    onSaveAsTemplate?: (session: number, name: string) => void | Promise<void>;
    onEjectWarmup?: (day: number, session: number) => void;
    onAddWarmupItem?: (day: number, session: number, data: AdHocWarmupData) => void;
    onAddFromCatalog?: (session: number) => void;
    hasLog?: boolean;
    groupReadiness?: Map<string, number>;
    /** If provided — shows per-exercise UserCog adjustment button (athlete-specific plans only) */
    onAdjustExercise?: (planExerciseId: string) => void;
}

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function DayConstructor({
    dayOfWeek,
    date,
    exercisesBySession,
    onAdd,
    onUpdate,
    onRemove,
    onReorderDrag,
    onClose,
    readOnly,
    dayNote = '',
    onDayNoteChange,
    onOpenTemplates,
    onSaveAsTemplate,
    onEjectWarmup,
    onAddWarmupItem,
    onAddFromCatalog,
    hasLog = false,
    groupReadiness,
    onAdjustExercise,
}: Props) {
    const t = useTranslations();
    const locale = useLocale() as 'ru' | 'en' | 'cn';

    const [hasPMSession, setHasPMSession] = useState(
        () => (exercisesBySession[1]?.length ?? 0) > 0
    );

    const [localDayNote, setLocalDayNote] = useState(dayNote);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync local state when switching active days
    useEffect(() => {
        setLocalDayNote(dayNote);
    }, [dayNote]);

    const handleNoteTextChange = (value: string) => {
        setLocalDayNote(value);
        if (!onDayNoteChange) return;

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            onDayNoteChange(value);
        }, 500);
    };

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, []);

    const formattedDate = date ? (
        locale === 'en'
            ? date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            : date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    ) : null;

    const allSessions = [0];
    if (hasPMSession || (exercisesBySession[1]?.length ?? 0) > 0) allSessions.push(1);

    const totalExercises = allSessions.reduce(
        (sum, s) => sum + (exercisesBySession[s]?.length ?? 0),
        0
    );

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 }, // 5px movement before dragging starts
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent, session: number) => {
        const { active, over } = event;
        if (!over || active.id === over.id || !onReorderDrag) return;

        const sessionExercises = exercisesBySession[session] ?? [];
        const oldIndex = sessionExercises.findIndex((e) => e.id === active.id);
        const newIndex = sessionExercises.findIndex((e) => e.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const reordered = arrayMove(sessionExercises, oldIndex, newIndex);

            // Map to order updates array suitable for the backend
            const updates = reordered.map((ex, i) => ({
                id: ex.id,
                order: i, // Assuming original order logic mapped 1:1 with index
            }));

            onReorderDrag(updates);
        }
    };

    return (
        <div className={styles.container}>
            <DayHeader
                dayName={t(`training.day_${DAY_KEYS[dayOfWeek]}`)}
                formattedDate={formattedDate}
                totalExercises={totalExercises}
                hasLog={hasLog}
                groupReadiness={groupReadiness}
                onBack={onClose}
            />

            <div className={styles.content}>
                {allSessions.map((session) => {
                    const sessionExercises = exercisesBySession[session] ?? [];
                    const sessionLabel = session === 0 ? t('training.sessionAM') : t('training.sessionPM');
                    const SessionIcon = session === 0 ? Sun : Moon;

                    const warmupItems = sessionExercises.filter((e) => e.block === 'warmup');
                    const mainItems = sessionExercises.filter((e) => e.block !== 'warmup');
                    const hasWarmup = warmupItems.length > 0;

                    return (
                        <div key={session} className={styles.sessionBlock}>
                            {allSessions.length > 1 && (
                                <div className={`${styles.sessionHeader} ${session === 1 ? styles.sessionHeaderPM : ''}`}>
                                    <SessionIcon size={14} />
                                    <span>{sessionLabel}</span>
                                </div>
                            )}

                            {/* Warmup block */}
                            {(hasWarmup || (!readOnly && onAddWarmupItem)) && (
                                <div className={styles.warmupSection}>
                                    <div className={styles.sectionDivider}>
                                        <Wind size={16} aria-hidden="true" />
                                        <span>{t('training.warmupBlock')}</span>
                                        {hasWarmup && !readOnly && onEjectWarmup && (
                                            <button
                                                className={styles.ejectBtn}
                                                onClick={() => onEjectWarmup(dayOfWeek, session)}
                                                title={t('training.ejectWarmup')}
                                                aria-label={t('training.ejectWarmup')}
                                            >
                                                <X size={16} aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>

                                    <div className={styles.exerciseList}>
                                        {warmupItems.map((item) => (
                                            <WarmupCard
                                                key={item.id}
                                                item={item}
                                                locale={locale}
                                                onRemove={onRemove}
                                                readOnly={readOnly}
                                            />
                                        ))}
                                    </div>

                                    {!readOnly && onAddWarmupItem && (
                                        <div className={styles.warmupAddRow}>
                                            <AdHocWarmupStepBtn
                                                onAdd={(data) => onAddWarmupItem(dayOfWeek, session, data)}
                                                onAddFromCatalog={onAddFromCatalog ? () => onAddFromCatalog(session) : undefined}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Main block */}
                            <div className={styles.mainSection}>
                                {hasWarmup && mainItems.length > 0 && (
                                    <div className={`${styles.sectionDivider} ${styles.mainDivider}`}>
                                        <Zap size={12} aria-hidden="true" />
                                        <span>{t('training.mainBlock')}</span>
                                    </div>
                                )}

                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={(e) => handleDragEnd(e, session)}
                                >
                                    <SortableContext
                                        items={mainItems.map(i => i.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className={styles.exerciseList}>
                                            {mainItems.map((planEx) => (
                                                <ExerciseRow
                                                    key={planEx.id}
                                                    planExercise={planEx}
                                                    locale={locale}
                                                    onUpdate={onUpdate}
                                                    onRemove={onRemove}
                                                    onAdjust={onAdjustExercise}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>

                                <DayActions
                                    session={session}
                                    readOnly={readOnly}
                                    onAddExercise={onAdd}
                                    onOpenTemplates={onOpenTemplates}
                                    onSaveAsTemplate={onSaveAsTemplate ? (s, n) => onSaveAsTemplate(s, n) : undefined}
                                />
                            </div>
                        </div>
                    );
                })}

                {!readOnly && !hasPMSession && (exercisesBySession[1]?.length ?? 0) === 0 && (
                    <button
                        className={styles.addSessionBtn}
                        onClick={() => setHasPMSession(true)}
                        aria-label={t('training.addSession')}
                    >
                        <Moon size={14} />
                        <span>{t('training.addSession')}</span>
                    </button>
                )}

                {(dayNote || onDayNoteChange) && (
                    <div className={styles.dayNote}>
                        <div className={styles.dayNoteHeader}>
                            <MessageSquare size={12} aria-hidden="true" />
                            <span className={styles.dayNoteLabel}>{t('training.dayNote')}</span>
                        </div>
                        {onDayNoteChange ? (
                            <textarea
                                className={styles.dayNoteTextarea}
                                value={localDayNote}
                                onChange={(e) => handleNoteTextChange(e.target.value)}
                                maxLength={500}
                                rows={3}
                                placeholder={t('training.dayNotePlaceholder')}
                                aria-label={t('training.dayNote')}
                            />
                        ) : (
                            <p className={styles.dayNoteReadOnly}>{dayNote}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
