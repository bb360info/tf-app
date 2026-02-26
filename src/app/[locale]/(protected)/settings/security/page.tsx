'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { SettingsSectionCard } from '@/components/settings';
import { useToast } from '@/lib/hooks/useToast';
import { useAuth } from '@/lib/pocketbase/AuthProvider';
import { changePassword } from '@/lib/pocketbase/auth';
import styles from './security.module.css';

function passwordStrength(password: string): number {
    if (!password) {
        return 0;
    }

    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    return score;
}

export default function SecuritySettingsPage() {
    const t = useTranslations();
    const { user } = useAuth();
    const { showToast } = useToast();

    const [saving, setSaving] = useState(false);
    const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });

    const strength = useMemo(() => passwordStrength(passwords.new), [passwords.new]);

    const handleChangePassword = async () => {
        if (!user || !passwords.old || !passwords.new || passwords.new !== passwords.confirm) {
            showToast({ message: t('settings.passwordChangeFailed'), type: 'error' });
            return;
        }

        setSaving(true);
        try {
            await changePassword(user.id, passwords.old, passwords.new, passwords.confirm);
            setPasswords({ old: '', new: '', confirm: '' });
            showToast({ message: t('settings.passwordChanged'), type: 'success' });
        } catch (error) {
            console.error('Failed to change password:', error);
            showToast({ message: t('settings.passwordChangeFailed'), type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.page}>
            <PageWrapper maxWidth="narrow">
                <PageHeader title={t('settings.security')} backHref="/settings" />

                <SettingsSectionCard title={t('settings.security')}>
                    <div className={styles.row}>
                        <div className={styles.rowLabel}>
                            <div className={styles.rowIconWrap}>
                                <Lock size={18} aria-hidden="true" />
                            </div>
                            <div className={styles.rowInfo}>
                                <span className={styles.rowName}>{t('settings.changePassword')}</span>
                                <span className={styles.rowDesc}>{t('settings.securityDesc')}</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.block}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>{t('settings.currentPassword')}</label>
                            <input
                                type="password"
                                value={passwords.old}
                                onChange={(event) =>
                                    setPasswords((prev) => ({ ...prev, old: event.target.value }))
                                }
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>{t('settings.newPassword')}</label>
                            <input
                                type="password"
                                value={passwords.new}
                                onChange={(event) =>
                                    setPasswords((prev) => ({ ...prev, new: event.target.value }))
                                }
                                className={styles.input}
                            />

                            {passwords.new.length > 0 && (
                                <div className={styles.strengthBar}>
                                    <div className={styles.strengthFill} data-level={String(strength)} />
                                </div>
                            )}
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>{t('settings.confirmPassword')}</label>
                            <input
                                type="password"
                                value={passwords.confirm}
                                onChange={(event) =>
                                    setPasswords((prev) => ({ ...prev, confirm: event.target.value }))
                                }
                                className={styles.input}
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handleChangePassword}
                            className={styles.saveButton}
                            disabled={saving}
                        >
                            {saving ? t('app.loading') : t('settings.save')}
                        </button>
                    </div>
                </SettingsSectionCard>
            </PageWrapper>
        </div>
    );
}
