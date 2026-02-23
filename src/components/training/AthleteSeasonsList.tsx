'use client';

/**
 * AthleteSeasonsList — read-only view of an athlete's seasons.
 * Shows season name, dates, phase timeline, and competition chips.
 * Rendered below AthleteTrainingView on the /training page.
 */

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronUp, Diamond, Minus } from 'lucide-react';
import {
    listSeasonsForAthlete,
    PHASE_COLORS,
    PHASE_LABELS,
    type SeasonWithRelations,
} from '@/lib/pocketbase/services/seasons';
import type { PhaseType } from '@/lib/pocketbase/types';
import { Skeleton } from '@/components/shared/Skeleton';
import styles from './AthleteSeasonsList.module.css';

interface Props {
    athleteId: string;
}

export function AthleteSeasonsList({ athleteId }: Props) {
    const t = useTranslations('training');
    const locale = useLocale() as 'ru' | 'en' | 'cn';
    const [seasons, setSeasons] = useState<SeasonWithRelations[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!athleteId) return;
        let cancelled = false;
        setLoading(true);
        listSeasonsForAthlete(athleteId)
            .then((data) => { if (!cancelled) setSeasons(data); })
            .catch(() => { /* ignore — silently degrade */ })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [athleteId]);

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(
                locale === 'cn' ? 'zh-CN' : locale === 'ru' ? 'ru-RU' : 'en-US',
                { month: 'short', day: 'numeric', year: 'numeric' }
            );
        } catch {
            /* expected: invalid date string */
            return dateStr;
        }
    };

    if (loading) {
        return (
            <div className={styles.root}>
                <h2 className={styles.title}>{t('mySeasons' as Parameters<typeof t>[0])}</h2>
                <div className={styles.list}>
                    <Skeleton variant="card" height={100} />
                    <Skeleton variant="card" height={100} />
                </div>
            </div>
        );
    }

    if (!seasons.length) return null;

    return (
        <div className={styles.root}>
            <h2 className={styles.title}>{t('mySeasons' as Parameters<typeof t>[0])}</h2>
            <div className={styles.list}>
                {seasons.map((season) => {
                    const phases = season.expand?.['training_phases(season_id)'] ?? [];
                    const competitions = season.expand?.['competitions(season_id)'] ?? [];
                    const sortedPhases = [...phases].sort((a, b) => a.order - b.order);

                    return (
                        <div key={season.id} className={styles.card}>
                            <h3 className={styles.seasonName}>{season.name}</h3>
                            <p className={styles.seasonDates}>
                                {formatDate(season.start_date)} — {formatDate(season.end_date)}
                            </p>

                            {sortedPhases.length > 0 && (
                                <>
                                    <div className={styles.phaseTimeline}>
                                        {sortedPhases.map((phase) => (
                                            <div
                                                key={phase.id}
                                                className={styles.phaseBar}
                                                style={{ backgroundColor: PHASE_COLORS[phase.phase_type as PhaseType] }}
                                                title={PHASE_LABELS[phase.phase_type as PhaseType][locale]}
                                            />
                                        ))}
                                    </div>
                                    <div className={styles.phaseBadges}>
                                        {sortedPhases.map((phase) => (
                                            <span
                                                key={phase.id}
                                                className={styles.phaseBadge}
                                                style={{ backgroundColor: PHASE_COLORS[phase.phase_type as PhaseType] }}
                                            >
                                                {PHASE_LABELS[phase.phase_type as PhaseType][locale]}
                                            </span>
                                        ))}
                                    </div>
                                </>
                            )}

                            {competitions.length > 0 && (
                                <div className={styles.competitions}>
                                    {competitions.slice(0, 3).map((comp) => (
                                        <span
                                            key={comp.id}
                                            className={styles.competitionChip}
                                            data-priority={comp.priority}
                                        >
                                            {comp.priority === 'A' ? <ChevronUp size={12} /> : comp.priority === 'B' ? <Diamond size={11} /> : <Minus size={12} />}
                                            {comp.name}
                                        </span>
                                    ))}
                                    {competitions.length > 3 && (
                                        <span className={styles.moreChip}>+{competitions.length - 3}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
