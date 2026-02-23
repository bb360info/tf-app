'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { UserPlus, Users, Zap } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { AthleteDashboard } from '@/components/dashboard/AthleteDashboard';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { EmailVerificationBanner } from '@/components/shared/EmailVerificationBanner';
import { PushPermissionPrompt } from '@/components/notifications/PushPermissionPrompt';
import {
    listMyAthletes,
    getLatestCheckin,
    readinessLevel,
    hardDeleteAthleteWithData,
    type AthleteRecord,
    type AthleteWithStats,
} from '@/lib/pocketbase/services/athletes';
import { logError } from '@/lib/utils/errors';
import { listMyGroups, type GroupWithRelations } from '@/lib/pocketbase/services/groups';
import { sendCoachNote } from '@/lib/pocketbase/services/notifications';
import pb from '@/lib/pocketbase/client';
import { Collections } from '@/lib/pocketbase/collections';
import { AthleteCard } from '@/components/dashboard/AthleteCard';
import { AddAthleteModal } from '@/components/dashboard/AddAthleteModal';
import { EditAthleteModal } from '@/components/dashboard/EditAthleteModal';
import { Skeleton } from '@/components/shared/Skeleton';
import styles from './dashboard.module.css';

export default function DashboardPage() {
    const t = useTranslations('dashboard');
    const tNotif = useTranslations('notifications');
    const router = useRouter();
    const { isAthlete, isLoading: authLoading } = useAuth();

    const [athletes, setAthletes] = useState<AthleteWithStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editTarget, setEditTarget] = useState<AthleteWithStats | null>(null);
    const [groups, setGroups] = useState<GroupWithRelations[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);  // null = All

    // Load athletes + their latest checkins
    const loadAthletes = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const raw: AthleteRecord[] = await listMyAthletes();

            // Load group memberships for all athletes in one query
            const groupMap: Record<string, { groupId: string; groupName: string }> = {};
            try {
                const memberships = await pb
                    .collection(Collections.GROUP_MEMBERS)
                    .getFullList<{ id: string; athlete_id: string; group_id: string; expand?: { group_id?: { name: string } } }>({
                        expand: 'group_id',
                        requestKey: null,
                    });
                for (const m of memberships) {
                    if (!groupMap[m.athlete_id]) {
                        groupMap[m.athlete_id] = {
                            groupId: m.group_id,
                            groupName: m.expand?.group_id?.name ?? '',
                        };
                    }
                }
            } catch {
                /* non-critical: group enrichment */
            }

            // Enrich with readiness (parallel fetches, max 10 per batch to avoid PB rate limits)
            const enriched: AthleteWithStats[] = await Promise.all(
                raw.map(async (a) => {
                    try {
                        const checkin = await getLatestCheckin(a.id);
                        let latestReadiness: number | undefined;
                        if (checkin) {
                            // Use single source of truth: calculateReadiness()
                            const { calculateReadiness } = await import('@/lib/readiness/calculator');
                            latestReadiness = calculateReadiness({
                                sleepDuration: checkin.sleep_hours ?? 0,
                                sleepQuality: checkin.sleep_quality ?? 0,
                                soreness: checkin.pain_level ?? 0,
                                mood: checkin.mood ?? 0,
                            });
                        }
                        return {
                            ...a,
                            latestReadiness,
                            latestCheckinDate: checkin?.date,
                            groupId: groupMap[a.id]?.groupId,
                            groupName: groupMap[a.id]?.groupName,
                        };
                    } catch {
                        /* non-critical: readiness enrichment */
                        return { ...a, ...groupMap[a.id] };
                    }
                })
            );

            setAthletes(enriched);
        } catch (err) {
            logError(err, { component: 'DashboardPage', action: 'loadAthletes' });
            setError(t('loadError'));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        loadAthletes();
        // Load groups for filter chips (fire-and-forget, non-critical)
        listMyGroups().then(setGroups).catch(() => {
            // Groups filter is non-critical — silently ignore
        });
    }, [loadAthletes]);

    // Quick stats — computed from ALL athletes (not filtered)
    const stats = useMemo(() => {
        const total = athletes.length;
        const withCheckin = athletes.filter((a) => a.latestReadiness != null);
        const avgReadiness = withCheckin.length > 0
            ? Math.round(
                withCheckin.reduce((sum, a) => sum + (a.latestReadiness ?? 0), 0) /
                withCheckin.length
            )
            : null;
        const today = new Date().toISOString().slice(0, 10);
        const activeToday = athletes.filter((a) => a.latestCheckinDate === today).length;
        return { total, activeToday, avgReadiness };
    }, [athletes]);

    // Filtered list based on selected group chip
    const filteredAthletes = useMemo(() => {
        if (!selectedGroup) return athletes;
        return athletes.filter((a) => a.groupId === selectedGroup);
    }, [athletes, selectedGroup]);

    const avgLevel = stats.avgReadiness != null ? readinessLevel(stats.avgReadiness) : null;

    const handleAthleteClick = useCallback(
        (id: string) => {
            router.push(`/dashboard/athlete/${id}` as never);
        },
        [router]
    );

    const handleCreated = useCallback(() => {
        setShowAddModal(false);
        loadAthletes();
    }, [loadAthletes]);

    const handleDelete = useCallback(async (id: string) => {
        // Optimistic: remove from list immediately
        setAthletes((prev) => prev.filter((a) => a.id !== id));
        try {
            await hardDeleteAthleteWithData(id);
        } catch (err) {
            logError(err, { component: 'DashboardPage', action: 'handleDelete' });
            // Revert on failure
            loadAthletes();
        }
    }, [loadAthletes]);

    const handleEdit = useCallback((athlete: AthleteWithStats) => {
        setEditTarget(athlete);
    }, []);

    const handleUpdated = useCallback(() => {
        setEditTarget(null);
        loadAthletes();
    }, [loadAthletes]);

    const handleNotify = useCallback(async (athleteId: string, _athleteName: string) => {
        try {
            // athleteId here is actually the user_id from users collection
            await sendCoachNote(
                athleteId,
                `📋 Тестовое уведомление от тренера — проверка связи! (${new Date().toLocaleTimeString()})`
            );
        } catch (err) {
            logError(err, { component: 'DashboardPage', action: 'handleNotify' });
        }
    }, []);

    // Role-switch: athlete sees their own dashboard
    // ⚠️ MUST be AFTER all hooks — Rules of Hooks
    if (!authLoading && isAthlete) {
        return <AthleteDashboard />;
    }

    return (
        <main className={styles.page}>
            <PageWrapper maxWidth="standard">
                {/* Header */}
                <PageHeader
                    title={t('title')}
                    actions={<NotificationBell />}
                    className={styles.stickyHeader}
                />

                {/* Email verification reminder */}
                <EmailVerificationBanner />

                {/* Push permission prompt — shows after 3 visits if not subscribed */}
                {pb.authStore.record?.id && (
                    <PushPermissionPrompt
                        userId={pb.authStore.record.id}
                        labels={{
                            notifTitle: tNotif('pushTitle'),
                            notifText: tNotif('pushText'),
                            allow: tNotif('allow'),
                            dismiss: tNotif('dismiss'),
                            iosTitle: tNotif('iosTitle'),
                            iosStep1: tNotif('iosStep1'),
                            iosStep2: tNotif('iosStep2'),
                            iosStep3: tNotif('iosStep3'),
                        }}
                    />
                )}

                {/* Quick stats */}
                {!isLoading && athletes.length > 0 && (
                    <div className={styles.statsBar} role="region" aria-label="Quick stats">
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{stats.total}</div>
                            <div className={styles.statLabel}>{t('stats.totalAthletes')}</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{stats.activeToday}</div>
                            <div className={styles.statLabel}>{t('stats.activeToday')}</div>
                        </div>
                        <div className={styles.statCard}>
                            <div
                                className={`${styles.statValue} ${avgLevel === 'high'
                                    ? styles.statValueSuccess
                                    : ''
                                    }`}
                            >
                                {stats.avgReadiness != null ? `${stats.avgReadiness}%` : '—'}
                            </div>
                            <div className={styles.statLabel}>{t('stats.avgReadiness')}</div>
                        </div>
                    </div>
                )}

                {/* Athletes section */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>{t('athletes')}</h2>
                        <button
                            type="button"
                            className={styles.addBtn}
                            onClick={() => setShowAddModal(true)}
                            aria-label={t('addAthlete')}
                        >
                            <UserPlus size={16} aria-hidden="true" />
                            {t('addAthlete')}
                        </button>
                        <Link
                            href="/training"
                            className={styles.quickPlanBtn}
                        >
                            <Zap size={16} aria-hidden="true" />
                            {t('quickPlan')}
                        </Link>
                    </div>

                    {/* Group Filter Chips */}
                    {groups.length > 0 && (
                        <div className={styles.groupChips} role="group" aria-label={t('filterByGroup')}>
                            <button
                                type="button"
                                className={`${styles.groupChip} ${selectedGroup === null ? styles.groupChipActive : ''}`}
                                onClick={() => setSelectedGroup(null)}
                            >
                                {t('allGroups')}
                            </button>
                            {groups.map((g) => (
                                <button
                                    key={g.id}
                                    type="button"
                                    className={`${styles.groupChip} ${selectedGroup === g.id ? styles.groupChipActive : ''}`}
                                    onClick={() => setSelectedGroup(g.id === selectedGroup ? null : g.id)}
                                >
                                    {g.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {isLoading && (
                        <div className={styles.skeletonGrid}>
                            <Skeleton variant="card" height={160} />
                            <Skeleton variant="card" height={160} />
                            <Skeleton variant="card" height={160} />
                            <Skeleton variant="card" height={160} />
                        </div>
                    )}

                    {error && <div className={styles.errorState}>{error}</div>}

                    {!isLoading && !error && athletes.length === 0 && (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <Users size={48} aria-hidden="true" />
                            </div>
                            <div className={styles.emptyTitle}>{t('athletes')}</div>
                            <p className={styles.emptyDesc}>{t('noAthletes')}</p>
                            <button
                                type="button"
                                className={`${styles.addBtn} ${styles.addBtnCentered}`}
                                onClick={() => setShowAddModal(true)}
                            >
                                <UserPlus size={16} aria-hidden="true" />
                                {t('addAthlete')}
                            </button>
                        </div>
                    )}

                    {!isLoading && athletes.length > 0 && (
                        <div className={styles.athleteGrid}>
                            {filteredAthletes.map((athlete) => (
                                <AthleteCard
                                    key={athlete.id}
                                    athlete={athlete}
                                    onClick={handleAthleteClick}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onNotify={handleNotify}
                                />
                            ))}
                            {filteredAthletes.length === 0 && (
                                <div className={`${styles.emptyState} ${styles.emptyStateFull}`}>
                                    <p>{t('noAthletesInGroup')}</p>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Add Athlete Modal */}
                {showAddModal && (
                    <AddAthleteModal
                        onClose={() => setShowAddModal(false)}
                        onCreated={handleCreated}
                    />
                )}

                {/* Edit Athlete Modal */}
                {editTarget && (
                    <EditAthleteModal
                        athlete={editTarget}
                        onClose={() => setEditTarget(null)}
                        onUpdated={handleUpdated}
                    />
                )}
            </PageWrapper>
        </main>
    );
}
