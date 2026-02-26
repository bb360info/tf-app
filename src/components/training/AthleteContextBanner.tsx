'use client';

/**
 * AthleteContextBanner — Hero-block on training page.
 * Shows season progress timeline, current phase focus, and nearest competition countdown.
 */

import { Target, Trophy } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import type { SeasonWithRelations } from '@/lib/pocketbase/services/seasons';
import { PHASE_COLORS, PHASE_LABELS } from '@/lib/pocketbase/services/seasons';
import type { Language } from '@/lib/pocketbase/types';
import { toLocalISODate } from '@/lib/utils/dateHelpers';
import styles from './AthleteContextBanner.module.css';

interface AthleteContextBannerProps {
    season: SeasonWithRelations;
    today: Date;
}

export function AthleteContextBanner({ season, today }: AthleteContextBannerProps) {
    const t = useTranslations('training');
    const locale = useLocale() as Language;

    const phases = season.expand?.['training_phases(season_id)'] ?? [];
    const competitions = season.expand?.['competitions(season_id)'] ?? [];

    // ─── Season Progress ─────────────────────────────────────────────
    const seasonStart = new Date(season.start_date);
    const seasonEnd = new Date(season.end_date);
    const totalMs = Math.max(1, seasonEnd.getTime() - seasonStart.getTime());
    const todayMs = today.getTime() - seasonStart.getTime();
    const todayPct = Math.min(100, Math.max(0, (todayMs / totalMs) * 100));

    // ─── Current Phase ───────────────────────────────────────────────
    const todayISO = toLocalISODate(today);
    const currentPhase = phases.find(
        (p) => p.start_date && p.end_date && p.start_date <= todayISO && p.end_date >= todayISO
    ) ?? null;

    // ─── Nearest Competition ─────────────────────────────────────────
    const upcomingComps = competitions
        .filter((c) => c.date > todayISO && c.status !== 'cancelled')
        .sort((a, b) => a.date.localeCompare(b.date));
    const nearestComp = upcomingComps[0] ?? null;
    const daysUntilComp = nearestComp
        ? Math.ceil((new Date(nearestComp.date).getTime() - today.getTime()) / 86_400_000)
        : null;

    const hasInfoRow = currentPhase !== null || (nearestComp !== null && daysUntilComp !== null);

    return (
        <section className={styles.banner} aria-label={t('contextBanner.label' as Parameters<typeof t>[0])}>
            {/* Season Progress Timeline */}
            <div className={styles.timeline}>
                <div className={styles.timelineTrack} role="img" aria-label={t('contextBanner.label' as Parameters<typeof t>[0])}>
                    {phases.map((phase) => {
                        if (!phase.start_date || !phase.end_date) return null;
                        const phaseStartMs = new Date(phase.start_date).getTime() - seasonStart.getTime();
                        const phaseEndMs = new Date(phase.end_date).getTime() - seasonStart.getTime();
                        const left = Math.max(0, (phaseStartMs / totalMs) * 100);
                        const width = Math.min(100 - left, ((phaseEndMs - phaseStartMs) / totalMs) * 100);
                        return (
                            <div
                                key={phase.id}
                                className={styles.phaseSegment}
                                style={{
                                    left: `${left}%`,
                                    width: `${width}%`,
                                    background: PHASE_COLORS[phase.phase_type],
                                }}
                                title={PHASE_LABELS[phase.phase_type][locale]}
                            />
                        );
                    })}
                    {/* Today marker */}
                    <div
                        className={styles.todayMarker}
                        style={{ left: `${todayPct}%` }}
                        aria-hidden="true"
                    />
                </div>
            </div>

            {hasInfoRow && (
                <div className={styles.infoRow}>
                    {/* Current phase */}
                    {currentPhase && (
                        <div className={styles.infoBlock}>
                            <Target size={14} className={styles.infoIcon} aria-hidden="true" />
                            <div className={styles.infoText}>
                                <p className={styles.infoLabel}>{t('contextBanner.currentPhase' as Parameters<typeof t>[0])}</p>
                                <p className={styles.infoValue}>
                                    {PHASE_LABELS[currentPhase.phase_type][locale]}
                                    {currentPhase.focus && (
                                        <span className={styles.phaseFocus}> · {currentPhase.focus}</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Nearest competition */}
                    {nearestComp && daysUntilComp !== null && (
                        <div className={styles.infoBlock}>
                            <Trophy size={14} className={styles.infoIcon} aria-hidden="true" />
                            <div className={styles.infoText}>
                                <p className={styles.infoLabel}>{t('contextBanner.nextComp' as Parameters<typeof t>[0])}</p>
                                <p className={styles.infoValue}>
                                    <span className={styles.compName}>{nearestComp.name}</span>
                                    <span className={styles.daysChip}>
                                        {t('contextBanner.daysLeft' as Parameters<typeof t>[0], { days: daysUntilComp })}
                                    </span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
