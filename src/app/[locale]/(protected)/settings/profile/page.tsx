'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Edit2, Mail, User, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { AthleteProfileSettingsPanel, SettingsSectionCard } from '@/components/settings';
import { useToast } from '@/lib/hooks/useToast';
import { useAuth } from '@/lib/pocketbase/AuthProvider';
import { updateUserName } from '@/lib/pocketbase/auth';
import { getSelfAthleteProfile } from '@/lib/pocketbase/services/athletes';
import type { Discipline } from '@/lib/pocketbase/types';
import styles from './profile.module.css';

interface AthleteProfile {
    id: string;
    height_cm?: number;
    birth_date?: string;
    primary_discipline?: Discipline;
    secondary_disciplines?: Discipline[];
}

function formatDate(value: string | undefined): string {
    if (!value) {
        return '—';
    }

    try {
        return new Date(value).toLocaleDateString();
    } catch {
        return value;
    }
}

export default function ProfileSettingsPage() {
    const t = useTranslations();
    const { user } = useAuth();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [savingName, setSavingName] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [newFirstName, setNewFirstName] = useState('');
    const [newLastName, setNewLastName] = useState('');
    const [athleteProfile, setAthleteProfile] = useState<AthleteProfile | null>(null);

    useEffect(() => {
        const currentUser = user;

        if (!currentUser) {
            setLoading(false);
            return;
        }

        const authUser = currentUser;
        const first = authUser.first_name?.trim() ?? '';
        const last = (authUser as unknown as { last_name?: string }).last_name?.trim() ?? '';

        if (first || last) {
            setNewFirstName(first);
            setNewLastName(last);
        } else if (authUser.name) {
            const parts = authUser.name.trim().split(/\s+/);
            setNewFirstName(parts[0] ?? '');
            setNewLastName(parts.slice(1).join(' '));
        }

        async function loadAthleteProfile() {
            if (authUser.role !== 'athlete') {
                setAthleteProfile(null);
                setLoading(false);
                return;
            }

            try {
                const profile = await getSelfAthleteProfile();
                if (profile) {
                    setAthleteProfile({
                        id: profile.id,
                        height_cm: profile.height_cm,
                        birth_date: profile.birth_date,
                        primary_discipline: profile.primary_discipline,
                        secondary_disciplines: profile.secondary_disciplines ?? [],
                    });
                }
            } catch {
                setAthleteProfile(null);
            } finally {
                setLoading(false);
            }
        }

        loadAthleteProfile();
    }, [user]);

    const displayName = useMemo(() => {
        const value = [newFirstName, newLastName].filter(Boolean).join(' ').trim();
        return value || user?.name || '—';
    }, [newFirstName, newLastName, user?.name]);

    const handleUpdateName = async () => {
        if (!user || !newFirstName.trim()) {
            return;
        }

        setSavingName(true);
        try {
            await updateUserName(user.id, {
                first_name: newFirstName.trim(),
                last_name: newLastName.trim(),
            });
            setEditingName(false);
            showToast({ message: t('settings.saved'), type: 'success' });
        } catch (error) {
            console.error('Failed to update profile name:', error);
            showToast({ message: t('settings.profileUpdateFailed'), type: 'error' });
        } finally {
            setSavingName(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <PageWrapper maxWidth="narrow">
                    <div className={styles.loading}>{t('app.loading')}</div>
                </PageWrapper>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <PageWrapper maxWidth="narrow">
                <PageHeader title={t('settings.profile')} backHref="/settings" />

                <SettingsSectionCard title={t('settings.profile')}>
                    <div className={styles.row}>
                        <div className={styles.rowLabel}>
                            <div className={styles.rowIconWrap}>
                                <User size={18} aria-hidden="true" />
                            </div>
                            <div className={styles.rowInfo}>
                                <span className={styles.rowName}>{t('settings.name')}</span>
                                {!editingName && <span className={styles.rowDesc}>{displayName}</span>}
                            </div>
                        </div>

                        <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => setEditingName((prev) => !prev)}
                            aria-label={editingName ? t('settings.cancel') : t('settings.edit')}
                        >
                            {editingName ? <X size={16} /> : <Edit2 size={16} />}
                        </button>
                    </div>

                    {editingName && (
                        <div className={styles.block}>
                            <div className={styles.nameRow}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>{t('auth.firstName')}</label>
                                    <input
                                        type="text"
                                        value={newFirstName}
                                        onChange={(event) => setNewFirstName(event.target.value)}
                                        className={styles.input}
                                        placeholder={t('auth.firstNamePlaceholder')}
                                        autoComplete="given-name"
                                    />
                                </div>

                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>{t('auth.lastName')}</label>
                                    <input
                                        type="text"
                                        value={newLastName}
                                        onChange={(event) => setNewLastName(event.target.value)}
                                        className={styles.input}
                                        placeholder={t('auth.lastNamePlaceholder')}
                                        autoComplete="family-name"
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                className={styles.saveButton}
                                onClick={handleUpdateName}
                                disabled={savingName}
                            >
                                {savingName ? t('app.loading') : t('settings.save')}
                            </button>
                        </div>
                    )}

                    <div className={styles.row}>
                        <div className={styles.rowLabel}>
                            <div className={styles.rowIconWrap}>
                                <Mail size={18} aria-hidden="true" />
                            </div>
                            <div className={styles.rowInfo}>
                                <span className={styles.rowName}>{t('settings.email')}</span>
                                <span className={styles.rowDesc}>{user?.email ?? '—'}</span>
                            </div>
                        </div>
                    </div>

                    {user?.role === 'athlete' && athleteProfile && (
                        <>
                            {typeof athleteProfile.height_cm === 'number' && athleteProfile.height_cm > 0 && (
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>{t('settings.height')}</span>
                                    <span className={styles.infoValue}>
                                        {athleteProfile.height_cm} {t('settings.cm')}
                                    </span>
                                </div>
                            )}

                            {athleteProfile.birth_date && (
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>{t('settings.birthDate')}</span>
                                    <span className={styles.infoValue}>
                                        {formatDate(athleteProfile.birth_date)}
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </SettingsSectionCard>

                {user?.role === 'athlete' && athleteProfile?.id && (
                    <AthleteProfileSettingsPanel
                        athleteId={athleteProfile.id}
                        initialPrimaryDiscipline={athleteProfile.primary_discipline}
                        initialSecondaryDisciplines={athleteProfile.secondary_disciplines}
                    />
                )}
            </PageWrapper>
        </div>
    );
}
