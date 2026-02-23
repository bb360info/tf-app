'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Globe, Zap, Check, Moon, Ruler, LogOut, User, Users, Lock, ChevronRight, Edit2, X, Bell } from 'lucide-react';
import { useAuth } from '@/lib/pocketbase/AuthProvider';
import { getMyPreferences, saveMyPreferences } from '@/lib/pocketbase/services/preferences';
import { listMyAthletes } from '@/lib/pocketbase/services/athletes';
import { changePassword, updateUserName } from '@/lib/pocketbase/auth';
import { useToast } from '@/lib/hooks/useToast';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LocaleSwitcher } from '@/components/shared/LocaleSwitcher';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageWrapper } from '@/components/shared/PageWrapper';
import styles from './settings.module.css';

// ─── Helpers ───────────────────────────────────────────

function passwordStrength(pw: string): number {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
}

function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString();
    } catch {
        /* expected: invalid date string */
        return dateStr;
    }
}

// ─── Types ─────────────────────────────────────────────

type UnitSystem = 'metric' | 'imperial';
type Language = 'ru' | 'en' | 'cn';

interface LocalSettings {
    units: UnitSystem;
    autoAdaptation: boolean;
}

interface AthleteProfile {
    height_cm?: number;
    birth_date?: string;
    coachName?: string;
    groupName?: string;
}

// ─── Component ─────────────────────────────────────────

export default function SettingsPage() {
    const t = useTranslations();
    const locale = useLocale() as Language;
    const { user, logout } = useAuth();
    const { showToast } = useToast();


    const [settings, setSettings] = useState<LocalSettings>({
        units: 'metric',
        autoAdaptation: true,
    });
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);

    // Profile state
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState('');
    const [athleteProfile, setAthleteProfile] = useState<AthleteProfile | null>(null);

    // Password state
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
    const pwStrength = passwordStrength(passwords.new);

    // Load saved preferences from PB + localStorage
    useEffect(() => {
        if (user?.name) setNewName(user.name);

        async function init() {
            setLoading(true);
            try {
                const prefs = await getMyPreferences();
                const storedUnits = (localStorage.getItem('units') as UnitSystem) ?? 'metric';
                setSettings({
                    units: storedUnits,
                    autoAdaptation: prefs?.auto_adaptation_enabled ?? true,
                });

                // Load athlete profile fields for athlete role
                if (user?.role === 'athlete') {
                    try {
                        const athletes = await listMyAthletes();
                        const mine = athletes[0];
                        if (mine) {
                            setAthleteProfile({
                                height_cm: mine.height_cm,
                                birth_date: mine.birth_date,
                            });
                        }
                    } catch {
                        /* non-critical: athlete profile enrichment */
                    }
                }
            } catch {
                /* non-critical: preferences not yet created */
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [locale, user?.name, user?.role]);

    // Persist units in localStorage
    useEffect(() => {
        localStorage.setItem('units', settings.units);
    }, [settings.units]);

    // Save to PocketBase + show badge
    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            await saveMyPreferences({
                language: locale as Language,
                auto_adaptation_enabled: settings.autoAdaptation,
            });

            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            console.error('Settings save failed:', err);
        } finally {
            setSaving(false);
        }
    }, [settings, locale]);

    const handleUpdateProfile = async () => {
        if (!user || !newName.trim()) return;
        setSaving(true);
        try {
            await updateUserName(user.id, newName);
            setEditingName(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            console.error('Failed to update name:', err);
            showToast({ message: t('settings.profileUpdateFailed'), type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!user || !passwords.old || !passwords.new || passwords.new !== passwords.confirm) {
            showToast({ message: t('settings.passwordChangeFailed'), type: 'error' });
            return;
        }
        setSaving(true);
        try {
            await changePassword(user.id, passwords.old, passwords.new, passwords.confirm);
            setShowPasswordForm(false);
            setPasswords({ old: '', new: '', confirm: '' });
            setSaved(true);
            showToast({ message: t('settings.passwordChanged'), type: 'success' });
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            console.error('Failed to change password:', err);
            showToast({ message: t('settings.passwordChangeFailed'), type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const update = <K extends keyof LocalSettings>(key: K, value: LocalSettings[K]) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
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
                {/* Header */}
                <PageHeader
                    title={t('nav.settings')}
                    backHref="/dashboard"
                />

                {/* Language section */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>{t('language.label')}</div>
                    <div className={styles.row}>
                        <div className={styles.rowLabel}>
                            <div className={styles.rowIconWrap}>
                                <Globe size={18} />
                            </div>
                            <div className={styles.rowInfo}>
                                <span className={styles.rowName}>{t('settings.appLanguage')}</span>
                                <span className={styles.rowDesc}>{t('settings.appLanguageDesc')}</span>
                            </div>
                        </div>
                        <LocaleSwitcher />
                    </div>
                </div>

                {/* Profile section */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>{t('settings.profile')}</div>
                    {user && (
                        <>
                            <div className={styles.row}>
                                <div className={styles.rowLabel}>
                                    <div className={styles.rowIconWrap}>
                                        <User size={18} />
                                    </div>
                                    <div className={styles.rowInfo}>
                                        <span className={styles.rowName}>{t('settings.name')}</span>
                                        {!editingName && <span className={styles.rowDesc}>{user.name || '-'}</span>}
                                    </div>
                                </div>
                                {!editingName ? (
                                    <button onClick={() => setEditingName(true)} className={styles.backBtn}>
                                        <Edit2 size={16} />
                                    </button>
                                ) : (
                                    <div className={styles.rowActions}>
                                        <button onClick={() => setEditingName(false)} className={styles.backBtn}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            {editingName && (
                                <div className={styles.rowBlock}>
                                    <div className={styles.inputGroup}>
                                        <input
                                            type="text"
                                            value={newName}
                                            onChange={e => setNewName(e.target.value)}
                                            className={styles.input}
                                            placeholder={t('settings.name')}
                                        />
                                        <button onClick={handleUpdateProfile} className={styles.saveBtn} disabled={saving}>
                                            {saving ? t('app.loading') : t('settings.save')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Athlete-only: My Profile (height, birthdate) */}
                            {user?.role === 'athlete' && athleteProfile && (
                                <>
                                    {athleteProfile.height_cm && (
                                        <div className={styles.profileField}>
                                            <span className={styles.profileFieldLabel}>{t('settings.height')}</span>
                                            <span className={styles.profileFieldValue}>{athleteProfile.height_cm} {t('settings.cm')}</span>
                                        </div>
                                    )}
                                    {athleteProfile.birth_date && (
                                        <div className={styles.profileField}>
                                            <span className={styles.profileFieldLabel}>{t('settings.birthDate')}</span>
                                            <span className={styles.profileFieldValue}>{formatDate(athleteProfile.birth_date)}</span>
                                        </div>
                                    )}
                                </>
                            )}
                            <div className={styles.row}>
                                <div className={styles.rowLabel}>
                                    <div className={styles.rowIconWrap}>
                                        <Zap size={18} />
                                    </div>
                                    <div className={styles.rowInfo}>
                                        <span className={styles.rowName}>{t('settings.email')}</span>
                                        <span className={styles.rowDesc}>{user.email}</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Security section */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>{t('settings.security')}</div>
                    <div className={styles.row} onClick={() => setShowPasswordForm(!showPasswordForm)} style={{ cursor: 'pointer' }}>
                        <div className={styles.rowLabel}>
                            <div className={styles.rowIconWrap}>
                                <Lock size={18} />
                            </div>
                            <div className={styles.rowInfo}>
                                <span className={styles.rowName}>{t('settings.changePassword')}</span>
                            </div>
                        </div>
                        <ChevronRight
                            size={16}
                            className={`${styles.chevronIcon}${showPasswordForm ? ` ${styles.chevronOpen}` : ''}`}
                        />
                    </div>

                    {showPasswordForm && (
                        <div className={styles.rowBlock}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>{t('settings.currentPassword')}</label>
                                <input
                                    type="password"
                                    value={passwords.old}
                                    onChange={e => setPasswords({ ...passwords, old: e.target.value })}
                                    className={styles.input}
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>{t('settings.newPassword')}</label>
                                <input
                                    type="password"
                                    value={passwords.new}
                                    onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                                    className={styles.input}
                                />
                                {passwords.new.length > 0 && (
                                    <div className={styles.strengthBar}>
                                        <div
                                            className={styles.strengthFill}
                                            data-level={String(pwStrength)}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>{t('settings.confirmPassword')}</label>
                                <input
                                    type="password"
                                    value={passwords.confirm}
                                    onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                                    className={styles.input}
                                />
                            </div>
                            <button onClick={handleChangePassword} className={styles.saveBtn} disabled={saving}>
                                {saving ? t('app.loading') : t('settings.save')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Appearance section */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>{t('settings.appearance')}</div>
                    <div className={styles.row}>
                        <div className={styles.rowLabel}>
                            <div className={styles.rowIconWrap}>
                                <Moon size={18} />
                            </div>
                            <div className={styles.rowInfo}>
                                <span className={styles.rowName}>{t('settings.theme')}</span>
                            </div>
                        </div>
                        <ThemeToggle />
                    </div>
                </div>

                {/* Training section */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>{t('settings.training')}</div>

                    {/* Units */}
                    <div className={styles.row}>
                        <div className={styles.rowLabel}>
                            <div className={styles.rowIconWrap}>
                                <Ruler size={18} />
                            </div>
                            <div className={styles.rowInfo}>
                                <span className={styles.rowName}>{t('settings.units')}</span>
                                <span className={styles.rowDesc}>{t('settings.unitsDesc')}</span>
                            </div>
                        </div>
                        <select
                            id="units-select"
                            value={settings.units}
                            onChange={(e) => update('units', e.target.value as UnitSystem)}
                            className={styles.select}
                        >
                            <option value="metric">{t('settings.metric')}</option>
                            <option value="imperial">{t('settings.imperial')}</option>
                        </select>
                    </div>

                    {/* Auto-adaptation */}
                    <div className={styles.row}>
                        <div className={styles.rowLabel}>
                            <div className={styles.rowIconWrap}>
                                <Zap size={18} />
                            </div>
                            <div className={styles.rowInfo}>
                                <span className={styles.rowName}>{t('settings.autoAdaptation')}</span>
                                <span className={styles.rowDesc}>{t('settings.autoAdaptationDesc')}</span>
                            </div>
                        </div>
                        <label className={styles.toggle} htmlFor="auto-adaptation-toggle">
                            <input
                                id="auto-adaptation-toggle"
                                type="checkbox"
                                checked={settings.autoAdaptation}
                                onChange={(e) => update('autoAdaptation', e.target.checked)}
                            />
                            <span className={styles.toggleTrack} />
                        </label>
                    </div>
                </div>

                {/* Groups & Invites link */}
                <div className={styles.section}>
                    <Link
                        href={`/${locale}/settings/groups`}
                        className={styles.row}
                    >
                        <div className={styles.rowLabel}>
                            <div className={styles.rowIconWrap}>
                                <Users size={18} />
                            </div>
                            <div className={styles.rowInfo}>
                                <span className={styles.rowName}>{t('groups.manageGroups')}</span>
                            </div>
                        </div>
                        <ChevronRight size={16} className={styles.chevronIcon} />
                    </Link>

                    {/* Notification settings link */}
                    <Link
                        href={`/${locale}/settings/notifications`}
                        className={styles.row}
                    >
                        <div className={styles.rowLabel}>
                            <div className={styles.rowIconWrap}>
                                <Bell size={18} />
                            </div>
                            <div className={styles.rowInfo}>
                                <span className={styles.rowName}>{t('notifications.preferences')}</span>
                            </div>
                        </div>
                        <ChevronRight size={16} className={styles.chevronIcon} />
                    </Link>
                </div>

                {/* Save button */}
                <div className={styles.section}>
                    <div className={styles.row}>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={styles.saveBtn}
                        >
                            {saving ? t('app.loading') : t('settings.save')}
                        </button>
                    </div>
                </div>

                {/* Account section */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>{t('settings.account')}</div>
                    <div className={styles.row}>
                        <button
                            onClick={() => {
                                logout();
                                window.location.href = `/${locale}/auth/login`;
                            }}
                            className={styles.logoutBtn}
                        >
                            <LogOut size={18} />
                            {t('nav.logout')}
                        </button>
                    </div>
                </div>

                {/* Version info */}
                <div className={styles.version}>Jumpedia v0.1.0 • {t('settings.version')}</div>

                {/* Save success badge */}
                {saved && (
                    <div className={styles.savedBadge}>
                        <Check size={16} />
                        {t('settings.saved')}
                    </div>
                )}
            </PageWrapper>
        </div>
    );
}

