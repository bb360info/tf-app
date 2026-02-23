'use client';

import { useState, useEffect, useCallback, useRef, useId } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
    Wind,
    Play,
    Pause,
    RotateCcw,
    ChevronLeft,
    RefreshCw,
    AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import {
    listTemplates,
    type TrainingTemplateWithItems,
    type TemplateItemWithExpand,
} from '@/lib/pocketbase/services/templates';
import styles from './warmup.module.css';

// ─── Color palette (cyclic per protocol index) ──────────────────────
const PROTOCOL_COLORS = [
    'var(--color-success)',
    'var(--color-accent-primary)',
    'var(--color-warning)',
];

// ─── Box Breathing Timer ─────────────────────────────────────────────

type BreathPhase = 'inhale' | 'hold1' | 'exhale' | 'hold2';
const PHASE_LABELS: BreathPhase[] = ['inhale', 'hold1', 'exhale', 'hold2'];
const PHASE_SEC = 4;

function BreathingTimer() {
    const t = useTranslations('warmupPage');
    const uid = useId();
    const [running, setRunning] = useState(false);
    const [phaseIdx, setPhaseIdx] = useState(0);
    const [tick, setTick] = useState(PHASE_SEC);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const reset = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setRunning(false);
        setPhaseIdx(0);
        setTick(PHASE_SEC);
    }, []);

    const toggle = useCallback(() => {
        setRunning((prev) => !prev);
    }, []);

    useEffect(() => {
        if (!running) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            return;
        }

        intervalRef.current = setInterval(() => {
            setTick((prev) => {
                if (prev <= 1) {
                    setPhaseIdx((p) => (p + 1) % 4);
                    return PHASE_SEC;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [running]);

    useEffect(() => () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
    }, []);

    const currentPhase = PHASE_LABELS[phaseIdx];
    const progress = ((PHASE_SEC - tick) / PHASE_SEC) * 100;
    const circumference = 2 * Math.PI * 54;

    return (
        <div className={styles.timerCard}>
            <h2 className={styles.timerTitle}>
                <Wind size={18} aria-hidden="true" />
                {t('breathingTitle')}
            </h2>
            <p className={styles.timerSub}>{t('breathingSub')}</p>

            <div className={styles.circleWrap} aria-label={`${t(`breath.${currentPhase}`)} — ${tick}s`}>
                <svg viewBox="0 0 120 120" className={styles.circleSvg} aria-hidden="true">
                    <circle cx="60" cy="60" r="54" className={styles.circleTrack} />
                    <circle
                        cx="60" cy="60" r="54"
                        className={styles.circleProgress}
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - (circumference * progress) / 100}
                    />
                </svg>
                <div className={styles.circleInner}>
                    <span className={styles.circlePhase}>{t(`breath.${currentPhase}`)}</span>
                    <span className={styles.circleTick}>{tick}</span>
                </div>
            </div>

            <div className={styles.phaseDots} role="tablist" aria-label="Phases">
                {PHASE_LABELS.map((p, i) => (
                    <span
                        key={p}
                        className={`${styles.dot} ${i === phaseIdx ? styles.dotActive : ''}`}
                        aria-selected={i === phaseIdx}
                        role="tab"
                    />
                ))}
            </div>

            <div className={styles.controls}>
                <button className={styles.resetBtn} onClick={reset} aria-label={t('reset')}>
                    <RotateCcw size={18} aria-hidden="true" />
                </button>
                <button
                    className={styles.playBtn}
                    onClick={toggle}
                    aria-label={running ? t('pause') : t('start')}
                    id={`${uid}-play`}
                >
                    {running ? <Pause size={22} aria-hidden="true" /> : <Play size={22} aria-hidden="true" />}
                    {running ? t('pause') : t('start')}
                </button>
            </div>
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────

type Locale = 'ru' | 'en' | 'cn';

function getLocalizedText(
    obj: Record<string, unknown>,
    field: string,
    locale: Locale
): string | undefined {
    return (
        (obj[`${field}_${locale}`] as string | undefined)
        || (obj[`${field}_ru`] as string | undefined)
        || (obj[`${field}_en`] as string | undefined)
        || undefined
    );
}

// ─── Warmup Page ─────────────────────────────────────────────────────

export default function WarmupPage() {
    const t = useTranslations('warmupPage');
    const locale = useLocale() as Locale;

    const [templates, setTemplates] = useState<TrainingTemplateWithItems[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listTemplates('warmup');
            setTemplates(data);
        } catch (err) {
            const { logError } = await import('@/lib/utils/errors');
            logError(err, { component: 'WarmupPage', action: 'loadTemplates' });
            setError(t('loadError'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className={styles.page}>
            {/* Back */}
            <Link href={`/${locale}/reference`} className={styles.backLink}>
                <ChevronLeft size={18} aria-hidden="true" />
                {t('back')}
            </Link>

            <header className={styles.header}>
                <h1 className={styles.title}>{t('title')}</h1>
                <p className={styles.subtitle}>{t('subtitle')}</p>
            </header>

            {/* Protocols */}
            <section className={styles.section} aria-labelledby="protocols-title">
                <h2 id="protocols-title" className={styles.sectionTitle}>
                    {t('protocolsTitle')}
                </h2>

                {/* Loading — 3 skeleton cards */}
                {loading && (
                    <div className={styles.protocolGrid}>
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={`${styles.protocolCard} ${styles.skeleton}`}
                                aria-hidden="true"
                            />
                        ))}
                    </div>
                )}

                {/* Error + Retry */}
                {!loading && error && (
                    <div className={styles.emptyState} role="alert">
                        <AlertCircle size={32} aria-hidden="true" />
                        <p>{error}</p>
                        <button className={styles.retryBtn} onClick={load}>
                            <RefreshCw size={16} aria-hidden="true" />
                            {t('retry')}
                        </button>
                    </div>
                )}

                {/* Empty state */}
                {!loading && !error && templates.length === 0 && (
                    <div className={styles.emptyState}>
                        <Wind size={32} aria-hidden="true" />
                        <p>{t('noTemplates')}</p>
                    </div>
                )}

                {/* Protocol cards from PB */}
                {!loading && !error && templates.length > 0 && (
                    <div className={styles.protocolGrid}>
                        {templates.map((tpl, idx) => {
                            const color = PROTOCOL_COLORS[idx % PROTOCOL_COLORS.length];
                            const name = getLocalizedText(tpl as unknown as Record<string, unknown>, 'name', locale) ?? tpl.name_ru;
                            const desc = getLocalizedText(tpl as unknown as Record<string, unknown>, 'description', locale);
                            const items: TemplateItemWithExpand[] = (
                                tpl.expand?.['template_items(template_id)'] ?? []
                            ).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

                            return (
                                <div key={tpl.id} className={styles.protocolCard}>
                                    <div
                                        className={styles.protocolHeader}
                                        style={{ borderLeftColor: color }}
                                    >
                                        <span className={styles.protocolName}>{name}</span>
                                        {tpl.total_minutes != null && (
                                            <span className={styles.protocolDuration}>
                                                {tpl.total_minutes} {t('min')}
                                            </span>
                                        )}
                                    </div>

                                    {desc && (
                                        <p className={styles.protocolDesc}>{desc}</p>
                                    )}

                                    <ol className={styles.phaseList}>
                                        {items.map((item, i) => {
                                            const itemName =
                                                getLocalizedText(
                                                    item as unknown as Record<string, unknown>,
                                                    'custom_text',
                                                    locale
                                                ) ?? `Step ${i + 1}`;
                                            const dMin = item.duration_seconds
                                                ? Math.round(item.duration_seconds / 60)
                                                : null;
                                            return (
                                                <li key={item.id} className={styles.phaseItem}>
                                                    <span className={styles.phaseNum}>{i + 1}</span>
                                                    <span className={styles.phaseName}>{itemName}</span>
                                                    {dMin != null && dMin > 0 && (
                                                        <span className={styles.phaseDur}>
                                                            {dMin} {t('min')}
                                                        </span>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ol>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Breathing Timer — unchanged */}
            <section className={styles.section}>
                <BreathingTimer />
            </section>
        </div>
    );
}
