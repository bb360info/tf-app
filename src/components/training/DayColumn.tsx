'use client';

import { useState, useCallback, useId } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
    Plus, ChevronUp, ChevronDown, Trash2, Zap, ClipboardCheck,
    CheckCircle2, Sun, Moon, Flame, X, Wind, ChevronDown as ChevronDownIcon,
    MessageSquare, LayoutGrid, Bookmark,
} from 'lucide-react';
import { getExerciseName, cnsCostColor } from '@/lib/pocketbase/services/exercises';
import type { PlanExerciseWithExpand } from '@/lib/pocketbase/services/plans';
import { listTemplates } from '@/lib/pocketbase/services/templates';
import type { TrainingTemplateRecord } from '@/lib/pocketbase/types';
import type { UnitType } from '@/lib/pocketbase/types';
import styles from './DayColumn.module.css';

// ─── Types ───────────────────────────────────────────────────────

export interface UpdateExerciseData {
    sets?: number;
    reps?: string;
    intensity?: string;
    weight?: number;
    duration?: number;
    distance?: number;
    rest_seconds?: number;
}

export interface AdHocWarmupData {
    custom_text_ru: string;
    custom_text_en?: string;
    custom_text_cn?: string;
    duration_seconds?: number;
}

interface Props {
    dayOfWeek: number; // 0=Mon, 6=Sun
    date: Date | null;
    /** All exercises for this day, grouped by session */
    exercisesBySession: Record<number, PlanExerciseWithExpand[]>;
    onAdd: (session: number) => void;
    onUpdate: (id: string, data: UpdateExerciseData) => void;
    onRemove: (id: string) => void;
    onReorder: (id: string, direction: 'up' | 'down') => void;
    // Warmup integration
    onStampTemplate?: (day: number, session: number, templateId: string) => void;
    onEjectWarmup?: (day: number, session: number) => void;
    onAddWarmupItem?: (day: number, session: number, data: AdHocWarmupData) => void;
    // Training Day Template integration (Phase 4)
    onAppendTemplate?: (day: number, session: number, templateId: string) => void;
    onSaveAsTemplate?: (day: number, session: number, name: string) => void;
    // Training Log
    planId?: string;
    athleteId?: string;
    hasLog?: boolean;
    onLogResult?: () => void;
    readOnly?: boolean;
    /** Coach note text for this day (from plan.day_notes) */
    dayNote?: string;
    /** Called when coach edits day note; undefined = view-only */
    onDayNoteChange?: (note: string) => void;
    /** Group readiness data for mini badges */
    groupReadiness?: Map<string, number>;
}

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function DayColumn({
    dayOfWeek,
    date,
    exercisesBySession,
    onAdd,
    onUpdate,
    onRemove,
    onReorder,
    onStampTemplate,
    onEjectWarmup,
    onAddWarmupItem,
    onAppendTemplate,
    onSaveAsTemplate,
    athleteId,
    hasLog,
    onLogResult,
    readOnly,
    dayNote = '',
    onDayNoteChange,
    groupReadiness,
}: Props) {
    const t = useTranslations();
    const locale = useLocale() as 'ru' | 'en' | 'cn';

    const formattedDate = date ? (
        locale === 'en'
            ? date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            : date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    ) : null;

    const [hasPMSession, setHasPMSession] = useState(
        () => (exercisesBySession[1]?.length ?? 0) > 0
    );

    const allSessions: number[] = [0];
    if (hasPMSession || (exercisesBySession[1]?.length ?? 0) > 0) allSessions.push(1);

    const totalExercises = allSessions.reduce(
        (sum, s) => sum + (exercisesBySession[s]?.length ?? 0),
        0
    );

    return (
        <div className={styles.column}>
            {/* Day header */}
            <div className={styles.dayHeader}>
                <div className={styles.dayHeaderContent}>
                    <span className={styles.dayName}>
                        {t(`training.day_${DAY_KEYS[dayOfWeek]}`)}
                    </span>
                    {formattedDate && (
                        <span className={styles.dayDate}>{formattedDate}</span>
                    )}
                </div>

                {groupReadiness && groupReadiness.size > 0 && (
                    <div className={styles.readinessBadgesRow}>
                        {Array.from(groupReadiness.values()).map((score, i) => {
                            const color = score >= 80 ? 'var(--color-success)'
                                : score >= 60 ? 'var(--color-warning)'
                                    : 'var(--color-error)';
                            return (
                                <span key={i} className={styles.readinessBadge} style={{ background: color }} title={`${t('training.readinessScore')}: ${score}`}>
                                    {score}
                                </span>
                            );
                        })}
                    </div>
                )}

                <span className={styles.exerciseCount}>
                    {hasLog ? (
                        <CheckCircle2 size={14} color="var(--color-success)" aria-label="Logged" />
                    ) : totalExercises}
                </span>
            </div>

            {/* Sessions */}
            {allSessions.map((session) => {
                const sessionExercises = exercisesBySession[session] ?? [];
                const sessionLabel = session === 0
                    ? t('training.sessionAM')
                    : t('training.sessionPM');
                const SessionIcon = session === 0 ? Sun : Moon;

                // Split into warmup / main
                const warmupItems = sessionExercises.filter((e) => e.block === 'warmup');
                const mainItems = sessionExercises.filter((e) => e.block !== 'warmup');
                const hasWarmup = warmupItems.length > 0;

                return (
                    <div key={session} className={styles.sessionBlock}>
                        {/* Session header (only when PM session exists) */}
                        {allSessions.length > 1 && (
                            <div className={`${styles.sessionHeader} ${session === 1 ? styles.sessionHeaderPM : ''}`}>
                                <SessionIcon size={12} />
                                <span>{sessionLabel}</span>
                            </div>
                        )}

                        {/* ── Warmup section ── */}
                        {(hasWarmup || (!readOnly && (onStampTemplate || onAddWarmupItem))) && (
                            <div className={styles.warmupSection}>
                                <div className={styles.sectionDivider}>
                                    <Wind size={11} aria-hidden="true" />
                                    <span>{t('training.warmupBlock')}</span>
                                    {hasWarmup && !readOnly && onEjectWarmup && (
                                        <button
                                            className={styles.ejectBtn}
                                            onClick={() => onEjectWarmup(dayOfWeek, session)}
                                            title={t('training.ejectWarmup')}
                                            aria-label={t('training.ejectWarmup')}
                                        >
                                            <X size={11} aria-hidden="true" />
                                        </button>
                                    )}
                                </div>

                                {/* Warmup items */}
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

                                {/* Warmup add controls */}
                                {!readOnly && (
                                    <div className={styles.warmupAddRow}>
                                        {onStampTemplate && (
                                            <WarmupTemplatePicker
                                                onSelect={(tplId) => onStampTemplate(dayOfWeek, session, tplId)}
                                            />
                                        )}
                                        {onAddWarmupItem && (
                                            <AdHocWarmupStepBtn
                                                onAdd={(data) => onAddWarmupItem(dayOfWeek, session, data)}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Main section ── */}
                        <div className={styles.mainSection}>
                            {hasWarmup && mainItems.length > 0 && (
                                <div className={`${styles.sectionDivider} ${styles.mainDivider}`}>
                                    <Zap size={11} aria-hidden="true" />
                                    <span>{t('training.mainBlock')}</span>
                                </div>
                            )}

                            <div className={styles.exerciseList}>
                                {mainItems.map((planEx, index) => (
                                    <ExerciseCard
                                        key={planEx.id}
                                        planExercise={planEx}
                                        locale={locale}
                                        index={index}
                                        total={mainItems.length}
                                        onUpdate={onUpdate}
                                        onRemove={onRemove}
                                        onReorder={onReorder}
                                    />
                                ))}
                            </div>

                            {/* Add main exercise button per session */}
                            {!readOnly && (
                                <div className={styles.mainToolbar}>
                                    <button
                                        className={styles.addBtn}
                                        onClick={() => onAdd(session)}
                                        aria-label={t('training.addExercise')}
                                    >
                                        <Plus size={14} />
                                        <span>{t('training.addExercise')}</span>
                                    </button>
                                    {/* Quick apply training_day template */}
                                    {onAppendTemplate && (
                                        <TrainingTemplatePicker
                                            onSelect={(tplId) => onAppendTemplate(dayOfWeek, session, tplId)}
                                        />
                                    )}
                                    {/* Save day as template (inline name input) */}
                                    {onSaveAsTemplate && mainItems.length > 0 && (
                                        <SaveAsDayTemplateBtn
                                            onSave={(name) => onSaveAsTemplate(dayOfWeek, session, name)}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Add PM Session button */}
            {!readOnly && !hasPMSession && (exercisesBySession[1]?.length ?? 0) === 0 && (
                <button
                    className={styles.addSessionBtn}
                    onClick={() => setHasPMSession(true)}
                    aria-label={t('training.addSession')}
                >
                    <Moon size={12} />
                    <span>{t('training.addSession')}</span>
                </button>
            )}

            {/* Log result button */}
            {!readOnly && athleteId && onLogResult && totalExercises > 0 && (
                <button
                    className={styles.logBtn}
                    onClick={onLogResult}
                    aria-label={t('training.log.record')}
                >
                    <ClipboardCheck size={16} />
                    <span>{hasLog ? t('training.log.edit') : t('training.log.record')}</span>
                </button>
            )}

            {/* Day Note: coach per-day annotation */}
            {(dayNote || onDayNoteChange) && (
                <div className={styles.dayNote}>
                    <div className={styles.dayNoteHeader}>
                        <MessageSquare size={11} aria-hidden="true" />
                        <span className={styles.dayNoteLabel}>{t('training.dayNote')}</span>
                    </div>
                    {onDayNoteChange ? (
                        <textarea
                            className={styles.dayNoteTextarea}
                            value={dayNote}
                            onChange={(e) => onDayNoteChange(e.target.value)}
                            maxLength={500}
                            rows={2}
                            placeholder={t('training.dayNotePlaceholder')}
                            aria-label={t('training.dayNote')}
                        />
                    ) : (
                        <p className={styles.dayNoteReadOnly}>{dayNote}</p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── WarmupCard ──────────────────────────────────────────────────

interface WarmupCardProps {
    item: PlanExerciseWithExpand;
    locale: 'ru' | 'en' | 'cn';
    onRemove: (id: string) => void;
    readOnly?: boolean;
}

function WarmupCard({ item, locale, onRemove, readOnly }: WarmupCardProps) {
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
            <Wind size={10} className={styles.warmupCardIcon} aria-hidden="true" />
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
                    <Trash2 size={11} aria-hidden="true" />
                </button>
            )}
        </div>
    );
}

// ─── WarmupTemplatePicker ─────────────────────────────────────────

interface WarmupTemplatePickerProps {
    onSelect: (templateId: string) => void;
}

function WarmupTemplatePicker({ onSelect }: WarmupTemplatePickerProps) {
    const t = useTranslations('training');
    const [open, setOpen] = useState(false);
    const [templates, setTemplates] = useState<TrainingTemplateRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const uid = useId();

    const handleOpen = useCallback(async () => {
        if (open) { setOpen(false); return; }
        setOpen(true);
        if (templates.length > 0) return;
        setLoading(true);
        try {
            const all = await listTemplates();
            setTemplates(all.filter((t) => t.type === 'warmup'));
        } catch { /* non-blocking */ }
        finally { setLoading(false); }
    }, [open, templates.length]);

    return (
        <div className={styles.warmupPickerWrap}>
            <button
                type="button"
                className={styles.warmupBtn}
                onClick={handleOpen}
                aria-expanded={open}
                aria-haspopup="listbox"
                id={`${uid}-warmup-btn`}
            >
                <Flame size={12} aria-hidden="true" />
                {t('warmupPicker')}
                <ChevronDownIcon size={10} aria-hidden="true" className={open ? styles.rotated : ''} />
            </button>
            {open && (
                <div className={styles.warmupDropdown} role="listbox" aria-labelledby={`${uid}-warmup-btn`}>
                    {loading && <div className={styles.warmupDropdownLoading} />}
                    {!loading && templates.length === 0 && (
                        <div className={styles.warmupDropdownEmpty}>{t('warmupPickerEmpty')}</div>
                    )}
                    {templates.map((tpl) => (
                        <button
                            key={tpl.id}
                            type="button"
                            role="option"
                            aria-selected={false}
                            className={styles.warmupDropdownItem}
                            onClick={() => { onSelect(tpl.id); setOpen(false); }}
                        >
                            {tpl.name_ru || tpl.name_en}
                            {tpl.total_minutes ? (
                                <span className={styles.warmupDropdownMin}>{tpl.total_minutes}m</span>
                            ) : null}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── AdHocWarmupStepBtn ───────────────────────────────────────────

interface AdHocWarmupStepBtnProps {
    onAdd: (data: AdHocWarmupData) => void;
}

function AdHocWarmupStepBtn({ onAdd }: AdHocWarmupStepBtnProps) {
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
            <button type="button" className={styles.adHocSave} onClick={submit}><Plus size={12} /></button>
            <button type="button" className={styles.adHocCancel} onClick={() => setOpen(false)}><X size={12} /></button>
        </div>
    );
}

// ─── Exercise Card (main block) ───────────────────────────────────

interface CardProps {
    planExercise: PlanExerciseWithExpand;
    locale: 'ru' | 'en' | 'cn';
    index: number;
    total: number;
    onUpdate: (id: string, data: UpdateExerciseData) => void;
    onRemove: (id: string) => void;
    onReorder: (id: string, direction: 'up' | 'down') => void;
}

function ExerciseCard({ planExercise, locale, index, total, onUpdate, onRemove, onReorder }: CardProps) {
    const exercise = planExercise.expand?.exercise_id;
    const unitType: UnitType = exercise?.unit_type ?? 'reps';
    const [editing, setEditing] = useState(false);

    const [sets, setSets] = useState(planExercise.sets?.toString() ?? '');
    const [reps, setReps] = useState(planExercise.reps ?? '');
    const [intensity, setIntensity] = useState(planExercise.intensity ?? '');
    const [weight, setWeight] = useState(planExercise.weight?.toString() ?? '');
    const [duration, setDuration] = useState(planExercise.duration?.toString() ?? '');
    const [distance, setDistance] = useState(planExercise.distance?.toString() ?? '');
    const [restSeconds, setRestSeconds] = useState(planExercise.rest_seconds?.toString() ?? '');

    const handleSave = useCallback(() => {
        const data: UpdateExerciseData = {
            sets: sets ? parseInt(sets, 10) : undefined,
        };
        if (unitType === 'reps' || unitType === 'weight') {
            data.reps = reps || undefined;
            data.intensity = intensity || undefined;
        }
        if (unitType === 'weight') {
            data.weight = weight ? parseFloat(weight) : undefined;
        }
        if (unitType === 'time') {
            data.duration = duration ? parseFloat(duration) : undefined;
        }
        if (unitType === 'distance') {
            data.distance = distance ? parseFloat(distance) : undefined;
        }
        if (restSeconds) {
            data.rest_seconds = parseInt(restSeconds, 10);
        }
        onUpdate(planExercise.id, data);
        setEditing(false);
    }, [planExercise.id, sets, reps, intensity, weight, duration, distance, restSeconds, unitType, onUpdate]);

    // Handle items without exercise (custom_text in main block — edge case)
    let name: string;
    let cnsCost = 2;
    if (exercise) {
        name = getExerciseName(exercise, locale);
        cnsCost = exercise.cns_cost ?? 2;
    } else {
        // custom_text item in main block
        const textMap: Record<string, string | null | undefined> = {
            ru: planExercise.custom_text_ru,
            en: planExercise.custom_text_en,
            cn: planExercise.custom_text_cn,
        };
        name = textMap[locale] ?? planExercise.custom_text_ru ?? planExercise.custom_text_en ?? '—';
    }

    const dosageLabel = (() => {
        const s = planExercise.sets;
        if (!s) return '—';
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
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <div
                    className={styles.cnsDot}
                    style={{ backgroundColor: cnsCostColor(cnsCost) }}
                    title={`CNS: ${cnsCost}/5`}
                >
                    <Zap size={8} />
                </div>
                <span className={styles.cardName} title={name}>
                    {name}
                </span>
            </div>

            {editing ? (
                <div className={styles.editForm}>
                    <input
                        type="number"
                        value={sets}
                        onChange={(e) => setSets(e.target.value)}
                        placeholder="Sets"
                        className={styles.editInput}
                        min="1"
                        max="20"
                    />
                    <span className={styles.editSeparator}>×</span>

                    {unitType === 'reps' && (
                        <input type="text" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="Reps" className={styles.editInput} />
                    )}
                    {unitType === 'weight' && (
                        <>
                            <input type="text" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="Reps" className={styles.editInput} />
                            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="kg" className={`${styles.editInput} ${styles.editInputSmall}`} />
                        </>
                    )}
                    {unitType === 'distance' && (
                        <input type="number" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="m" className={styles.editInput} />
                    )}
                    {unitType === 'time' && (
                        <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="sec" className={styles.editInput} />
                    )}
                    {(unitType === 'reps' || unitType === 'weight') && (
                        <input type="text" value={intensity} onChange={(e) => setIntensity(e.target.value)} placeholder="%" className={`${styles.editInput} ${styles.editInputSmall}`} />
                    )}

                    <button className={styles.saveBtn} onClick={handleSave}>✓</button>
                </div>
            ) : (
                <button className={styles.dosage} onClick={() => setEditing(true)}>
                    {dosageLabel}
                </button>
            )}

            <div className={styles.cardActions}>
                <button className={styles.actionBtn} onClick={() => onReorder(planExercise.id, 'up')} disabled={index === 0} aria-label="Move up">
                    <ChevronUp size={14} />
                </button>
                <button className={styles.actionBtn} onClick={() => onReorder(planExercise.id, 'down')} disabled={index === total - 1} aria-label="Move down">
                    <ChevronDown size={14} />
                </button>
                <button className={styles.actionBtn} onClick={() => onRemove(planExercise.id)} aria-label="Remove">
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
}

// ─── TrainingTemplatePicker ───────────────────────────────────────
// Phase 4: Quick-apply training_day template to a day (append-only)
// Follows WarmupTemplatePicker pattern exactly.

interface TrainingTemplatePickerProps {
    onSelect: (templateId: string) => void;
}

function TrainingTemplatePicker({ onSelect }: TrainingTemplatePickerProps) {
    const t = useTranslations('training');
    const [open, setOpen] = useState(false);
    const [templates, setTemplates] = useState<TrainingTemplateRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const uid = useId();

    const handleOpen = useCallback(async () => {
        if (open) { setOpen(false); return; }
        setOpen(true);
        if (templates.length > 0) return;
        setLoading(true);
        try {
            const all = await listTemplates();
            setTemplates(all.filter((tp) => tp.type === 'training_day'));
        } catch { /* non-blocking */ }
        finally { setLoading(false); }
    }, [open, templates.length]);

    return (
        <div className={styles.warmupPickerWrap}>
            <button
                type="button"
                className={styles.warmupBtn}
                onClick={handleOpen}
                aria-expanded={open}
                aria-haspopup="listbox"
                id={`${uid}-tpl-btn`}
            >
                <LayoutGrid size={12} aria-hidden="true" />
                {t('trainingTemplatePicker')}
                <ChevronDownIcon size={10} aria-hidden="true" className={open ? styles.rotated : ''} />
            </button>
            {open && (
                <div className={styles.warmupDropdown} role="listbox" aria-labelledby={`${uid}-tpl-btn`}>
                    {loading && <div className={styles.warmupDropdownLoading} />}
                    {!loading && templates.length === 0 && (
                        <div className={styles.warmupDropdownEmpty}>{t('templatePickerEmpty')}</div>
                    )}
                    {templates.map((tpl) => (
                        <button
                            key={tpl.id}
                            type="button"
                            role="option"
                            aria-selected={false}
                            className={styles.warmupDropdownItem}
                            onClick={() => { onSelect(tpl.id); setOpen(false); }}
                        >
                            {tpl.name_ru || tpl.name_en}
                            {tpl.total_minutes ? (
                                <span className={styles.warmupDropdownMin}>{tpl.total_minutes}m</span>
                            ) : null}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── SaveAsDayTemplateBtn ─────────────────────────────────────────
// Phase 4: Bookmark icon → inline name input → onSave callback.
// User-friendly: no window.prompt(). Pattern mirrors AdHocWarmupStepBtn.

interface SaveAsDayTemplateBtnProps {
    onSave: (name: string) => void;
}

function SaveAsDayTemplateBtn({ onSave }: SaveAsDayTemplateBtnProps) {
    const t = useTranslations('training');
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const uid = useId();

    const handleSubmit = async () => {
        if (!name.trim() || saving) return;
        setSaving(true);
        try {
            await onSave(name.trim());
            setName('');
            setOpen(false);
        } finally {
            setSaving(false);
        }
    };

    if (!open) {
        return (
            <button
                type="button"
                className={styles.warmupBtn}
                onClick={() => setOpen(true)}
                title={t('saveAsTemplate')}
                aria-label={t('saveAsTemplate')}
                id={`${uid}-save-tpl`}
            >
                <Bookmark size={12} aria-hidden="true" />
            </button>
        );
    }

    return (
        <div className={styles.adHocForm}>
            <input
                autoFocus
                className={styles.adHocInput}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('enterTemplateName')}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit();
                    if (e.key === 'Escape') { setOpen(false); setName(''); }
                }}
            />
            <button
                type="button"
                className={styles.adHocSave}
                onClick={handleSubmit}
                disabled={!name.trim() || saving}
                aria-label={t('saveAsTemplate')}
            >
                {saving ? '…' : <Bookmark size={12} />}
            </button>
            <button
                type="button"
                className={styles.adHocCancel}
                onClick={() => { setOpen(false); setName(''); }}
            >
                <X size={12} />
            </button>
        </div>
    );
}

