'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
    Bell,
    Globe,
    Lock,
    LogOut,
    Moon,
    Ruler,
    User,
    Users,
    Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LocaleSwitcher } from '@/components/shared/LocaleSwitcher';
import { useAuth } from '@/lib/pocketbase/AuthProvider';
import { getMyPreferences, saveMyPreferences } from '@/lib/pocketbase/services/preferences';
import { useFontScale } from '@/lib/theme/FontScaleProvider';
import {
    SettingsNavRow,
    SettingsSectionCard,
    SettingsSegmentedRow,
    SettingsSelectRow,
    SettingsToggleRow,
} from '@/components/settings';
import styles from './settings.module.css';

type UnitSystem = 'metric' | 'imperial';
type Language = 'ru' | 'en' | 'cn';

interface LocalSettings {
    units: UnitSystem;
    autoAdaptation: boolean;
}

export default function SettingsPage() {
    const t = useTranslations();
    const locale = useLocale() as Language;
    const { user, logout } = useAuth();
    const { fontScale, setFontScale } = useFontScale();

    const [settings, setSettings] = useState<LocalSettings>({
        units: 'metric',
        autoAdaptation: true,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function init() {
            setLoading(true);
            try {
                const prefs = await getMyPreferences();
                const localUnits = (localStorage.getItem('units') as UnitSystem) ?? 'metric';

                setSettings({
                    units: localUnits,
                    autoAdaptation: prefs?.auto_adaptation_enabled ?? true,
                });
            } catch {
                // non-critical: preferences may not exist yet
            } finally {
                setLoading(false);
            }
        }

        init();
    }, []);

    useEffect(() => {
        localStorage.setItem('units', settings.units);
    }, [settings.units]);

    useEffect(() => {
        if (loading) {
            return;
        }

        saveMyPreferences({
            language: locale,
            auto_adaptation_enabled: settings.autoAdaptation,
        }).catch((error) => {
            console.error('Auto-save settings failed:', error);
        });
    }, [locale, loading, settings.autoAdaptation]);

    const updateSetting = <K extends keyof LocalSettings>(key: K, value: LocalSettings[K]) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const profileName = useMemo(() => {
        if (!user) {
            return '—';
        }

        const first = user.first_name?.trim() ?? '';
        const last = (user as unknown as { last_name?: string }).last_name?.trim() ?? '';
        const splitName = [first, last].filter(Boolean).join(' ').trim();

        return splitName || user.name || '—';
    }, [user]);

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
                <PageHeader title={t('nav.settings')} backHref="/dashboard" />

                <SettingsSectionCard title={t('language.label')}>
                    <SettingsSegmentedRow
                        icon={Globe}
                        name={t('settings.appLanguage')}
                        description={t('settings.appLanguageDesc')}
                        control={<LocaleSwitcher />}
                    />
                </SettingsSectionCard>

                <SettingsSectionCard title={t('settings.profileAndSecurity')}>
                    <SettingsNavRow
                        icon={User}
                        name={user?.role === 'athlete' ? t('settings.athleteProfile') : t('settings.profile')}
                        description={
                            user?.role === 'athlete'
                                ? t('settings.athleteProfileDesc')
                                : t('settings.profileDesc')
                        }
                        value={profileName}
                        href={`/${locale}/settings/profile`}
                    />

                    <SettingsNavRow
                        icon={Lock}
                        name={t('settings.security')}
                        description={t('settings.securityDesc')}
                        href={`/${locale}/settings/security`}
                    />
                </SettingsSectionCard>

                <SettingsSectionCard title={t('settings.appearance')}>
                    <SettingsSegmentedRow
                        icon={Moon}
                        name={t('settings.theme')}
                        control={<ThemeToggle />}
                    />

                    <SettingsSegmentedRow
                        icon={Ruler}
                        name={t('settings.fontScale')}
                        description={t('settings.fontScaleDesc')}
                        control={
                            <div className={styles.fontScaleControl}>
                                <span className={styles.scaleLabelSmall}>A</span>
                                <input
                                    type="range"
                                    min="0.8"
                                    max="1.5"
                                    step="0.1"
                                    value={fontScale}
                                    className={styles.range}
                                    onChange={(event) =>
                                        setFontScale(Number.parseFloat(event.target.value))
                                    }
                                    aria-label={t('settings.fontScale')}
                                />
                                <span className={styles.scaleLabelLarge}>A</span>
                                <span className={styles.rangeValue}>{fontScale.toFixed(1)}x</span>
                            </div>
                        }
                    />
                </SettingsSectionCard>

                <SettingsSectionCard title={t('settings.training')}>
                    <SettingsSelectRow
                        icon={Ruler}
                        name={t('settings.units')}
                        description={t('settings.unitsDesc')}
                        id="settings-units"
                        value={settings.units}
                        onChange={(value) => updateSetting('units', value as UnitSystem)}
                        options={[
                            { value: 'metric', label: t('settings.metric') },
                            { value: 'imperial', label: t('settings.imperial') },
                        ]}
                    />

                    <SettingsToggleRow
                        icon={Zap}
                        name={t('settings.autoAdaptation')}
                        description={t('settings.autoAdaptationDesc')}
                        checked={settings.autoAdaptation}
                        inputId="settings-auto-adaptation"
                        onChange={(checked) => updateSetting('autoAdaptation', checked)}
                    />
                </SettingsSectionCard>

                <SettingsSectionCard>
                    <SettingsNavRow
                        icon={Users}
                        name={t('groups.manageGroups')}
                        description={t('settings.groupsDesc')}
                        href={`/${locale}/settings/groups`}
                    />

                    <SettingsNavRow
                        icon={Bell}
                        name={t('notifications.preferences')}
                        description={t('settings.notificationsDesc')}
                        href={`/${locale}/settings/notifications`}
                    />
                </SettingsSectionCard>

                <SettingsSectionCard title={t('settings.account')}>
                    <div className={styles.logoutRow}>
                        <button
                            type="button"
                            className={styles.logoutButton}
                            onClick={() => {
                                logout();
                                window.location.href = `/${locale}/auth/login`;
                            }}
                        >
                            <LogOut size={18} aria-hidden="true" />
                            {t('nav.logout')}
                        </button>
                    </div>
                </SettingsSectionCard>

                <div className={styles.version}>Jumpedia v0.1.0 • {t('settings.version')}</div>
            </PageWrapper>
        </div>
    );
}
