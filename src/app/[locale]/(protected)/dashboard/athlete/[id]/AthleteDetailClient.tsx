'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/pocketbase/AuthProvider';
import {
    ArrowLeft,
    Activity,
    Dumbbell,
    BarChart2,
    Heart,
    TrendingUp,
} from 'lucide-react';
import { getAthlete, getLatestCheckin, readinessLevel, type AthleteRecord } from '@/lib/pocketbase/services/athletes';
import { calculateReadiness } from '@/lib/readiness/calculator';
import { logError } from '@/lib/utils/errors';
import { getInitials, getDisplayName } from '@/lib/utils/nameHelpers';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { Skeleton } from '@/components/shared/Skeleton';
import { OverviewTab } from './OverviewTab';
import { TrainingTab } from './TrainingTab';
import { TestsTab } from './TestsTab';
import { ReadinessTab } from './ReadinessTab';
import styles from './athleteDetail.module.css';

// ─── Types ─────────────────────────────────────────────────────────
type Tab = 'overview' | 'training' | 'tests' | 'readiness';

const TABS: Tab[] = ['overview', 'training', 'tests', 'readiness'];

/** Read athlete ID from query (?id=...), fallback to pathname for legacy links. */
function getAthleteIdFromUrl(searchId?: string | null): string {
    const fromQuery = searchId?.trim();
    if (fromQuery) return fromQuery;
    if (typeof window === 'undefined') return '';
    const segments = window.location.pathname.split('/').filter(Boolean);
    // Legacy URL: /<locale>/dashboard/athlete/<id>
    const last = segments[segments.length - 1] || '';
    if (last === 'athlete') return '';
    return last;
}

// ─── Icon helper ──────────────────────────────────────────────────
function TabIcon({ tab, size }: { tab: Tab; size: number }) {
    switch (tab) {
        case 'overview': return <BarChart2 size={size} />;
        case 'training': return <Dumbbell size={size} />;
        case 'tests': return <TrendingUp size={size} />;
        case 'readiness': return <Heart size={size} />;
    }
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function AthleteDetailPage() {
    const t = useTranslations('athleteDetail');
    const locale = useLocale() as 'ru' | 'en' | 'cn';
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const isCoach = user?.role === 'coach';
    const athleteId = useMemo(() => getAthleteIdFromUrl(searchParams.get('id')), [searchParams]);

    const [athlete, setAthlete] = useState<AthleteRecord | null>(null);
    const [readiness, setReadiness] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load base athlete data + readiness
    useEffect(() => {
        if (!athleteId) {
            setLoading(false);
            setError(t('noData'));
            return;
        }
        const load = async () => {
            setLoading(true);
            try {
                const [a, checkin] = await Promise.all([
                    getAthlete(athleteId),
                    getLatestCheckin(athleteId),
                ]);
                setAthlete(a);
                if (checkin) {
                    const score = calculateReadiness({
                        sleepDuration: checkin.sleep_hours ?? 0,
                        sleepQuality: checkin.sleep_quality ?? 0,
                        soreness: checkin.pain_level ?? 0,
                        mood: checkin.mood ?? 0,
                    });
                    setReadiness(score);
                } else {
                    setReadiness(null);
                }
            } catch (err) {
                logError(err, { component: 'AthleteDetailClient', action: 'loadProfile' });
                setError(t('loadError'));
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [athleteId, t]);

    const age = athlete?.birth_date
        ? new Date().getFullYear() - new Date(athlete.birth_date).getFullYear()
        : null;

    const level = readiness != null ? readinessLevel(readiness) : null;

    if (loading) return (
        <div className={styles.page}>
            <PageWrapper maxWidth="standard">
                <div className={styles.skeletonHero}>
                    <Skeleton variant="circular" width={64} height={64} />
                    <Skeleton variant="text" width={200} height={32} />
                </div>
                <Skeleton variant="text" width="100%" height={48} style={{ marginBottom: 'var(--space-6)' }} />
                <div className={styles.skeletonGrid}>
                    <Skeleton variant="card" height={160} />
                    <Skeleton variant="card" height={160} />
                </div>
            </PageWrapper>
        </div>
    );

    if (error || !athlete) return (
        <div className={styles.page}>
            <PageWrapper maxWidth="standard">
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ArrowLeft size={16} /> {t('back')}
                </button>
                <p className={styles.errorText}>{error ?? t('noData')}</p>
            </PageWrapper>
        </div>
    );

    return (
        <div className={styles.page}>
            <PageWrapper maxWidth="standard">
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ArrowLeft size={16} /> {t('back')}
                </button>

                {/* ── Hero ─────────────────────────────────────────── */}
                <div className={styles.hero}>
                    <div className={styles.heroAvatar} aria-hidden="true">
                        {getInitials(athlete)}
                    </div>
                    <div className={styles.heroInfo}>
                        <h1 className={styles.heroName}>{getDisplayName(athlete)}</h1>
                        {athlete.primary_discipline && (
                            <span className={styles.disciplineChip}>
                                {t(`disciplines.${athlete.primary_discipline}` as 'disciplines.high_jump' | 'disciplines.long_jump' | 'disciplines.triple_jump') ?? athlete.primary_discipline.replace('_', ' ')}
                            </span>
                        )}
                        <div className={styles.heroMeta}>
                            {age != null && (
                                <span>{age} {t('yearsOld')}</span>
                            )}
                            {athlete.gender && (
                                <span>{athlete.gender === 'male' ? t('male') : t('female')}</span>
                            )}
                            {athlete.height_cm && (
                                <span>{athlete.height_cm} {t('cm')}</span>
                            )}
                        </div>
                        {readiness != null && (
                            <div className={styles.readinessBadge} data-level={level}>
                                <Activity size={14} />
                                <span>{readiness}%</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Tabs ─────────────────────────────────────────── */}
                <div className={styles.tabBar} role="tablist">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            role="tab"
                            aria-selected={activeTab === tab}
                            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            <TabIcon tab={tab} size={15} />
                            <span className={styles.tabLabel}>{t(tab)}</span>
                        </button>
                    ))}
                </div>

                {/* ── Tab Content ──────────────────────────────────── */}
                <div className={styles.tabContent}>
                    {activeTab === 'overview' && (
                        <OverviewTab athleteId={athleteId} readiness={readiness} locale={locale} t={t} isCoach={isCoach} />
                    )}
                    {activeTab === 'training' && (
                        <TrainingTab athleteId={athleteId} locale={locale} t={t} />
                    )}
                    {activeTab === 'tests' && (
                        <TestsTab athleteId={athleteId} locale={locale} t={t} />
                    )}
                    {activeTab === 'readiness' && (
                        <ReadinessTab athleteId={athleteId} locale={locale} t={t} />
                    )}
                </div>
            </PageWrapper>
        </div>
    );
}
