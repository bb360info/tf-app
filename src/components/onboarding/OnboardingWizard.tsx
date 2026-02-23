'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import {
    Globe,
    User,
    Dumbbell,
    Settings,
    ChevronRight,
    Calendar,
    BarChart2,
    Zap,
    Activity,
    Loader,
} from 'lucide-react';
import { saveMyPreferences, completeOnboarding } from '@/lib/pocketbase/services/preferences';
import { updateUserRole, updateUserName } from '@/lib/pocketbase/auth';
import pb from '@/lib/pocketbase/client';
import type { Language } from '@/lib/pocketbase/types';
import { detectBrowserLocale } from '@/lib/i18n/detectLocale';
import styles from './onboarding.module.css';

type Role = 'coach' | 'athlete';
type Units = 'metric' | 'imperial';

const TOTAL_STEPS = 4;

export default function OnboardingWizard() {
    const t = useTranslations('onboarding');
    const router = useRouter();
    const pathname = usePathname();

    const [step, setStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Form state — language defaults to browser detection, not hardcoded 'ru'
    const [language, setLanguage] = useState<Language>(() => detectBrowserLocale());
    const [name, setName] = useState('');
    const [role, setRole] = useState<Role>('athlete');
    const [units, setUnits] = useState<Units>('metric');
    const [autoAdapt, setAutoAdapt] = useState(true);

    // When user picks a language — update state AND switch the app locale immediately
    const handleLanguageChange = useCallback((lang: Language) => {
        setLanguage(lang);
        // Replace current path with same path but new locale prefix
        router.replace(pathname, { locale: lang });
    }, [pathname, router]);

    const progress = ((step + 1) / TOTAL_STEPS) * 100;

    const handleNext = useCallback(() => {
        if (step < TOTAL_STEPS - 1) {
            setStep((s) => s + 1);
        }
    }, [step]);

    const handleSkip = useCallback(() => {
        setStep(TOTAL_STEPS - 1);
    }, []);

    const handleFinish = useCallback(async () => {
        setIsLoading(true);
        try {
            const userId = pb.authStore.record?.id;
            await updateUserRole(role);
            // BUG-2 fix: save the name entered during onboarding
            if (userId && name.trim()) {
                await updateUserName(userId, name.trim());
            }
            await saveMyPreferences({
                language,
                units,
                auto_adaptation_enabled: autoAdapt,
                onboarding_complete: true,
            });
            await completeOnboarding();
        } catch {
            /* non-blocking: still route to training */
        } finally {
            setIsLoading(false);
            router.replace('/training');
        }
    }, [language, units, autoAdapt, role, name, router]);

    const isLastStep = step === TOTAL_STEPS - 1;
    const canProceed = step === 1 ? name.trim().length > 0 : true;

    return (
        <div className={styles.overlay}>
            <div className={styles.card}>
                {/* Progress bar */}
                <div className={styles.progressBar}>
                    <div
                        className={styles.progressFill}
                        style={{ width: `${progress}%` }}
                        role="progressbar"
                        aria-valuenow={step + 1}
                        aria-valuemin={1}
                        aria-valuemax={TOTAL_STEPS}
                    />
                </div>

                {/* Steps */}
                <div className={styles.stepsViewport}>
                    <div
                        className={styles.stepsTrack}
                        style={{ transform: `translateX(-${step * 100}%)` }}
                    >
                        <StepWelcome
                            t={t}
                            language={language}
                            onLanguage={handleLanguageChange}
                        />
                        <StepProfile
                            t={t}
                            name={name}
                            onName={setName}
                            role={role}
                            onRole={setRole}
                        />
                        <StepPreferences
                            t={t}
                            units={units}
                            onUnits={setUnits}
                            autoAdapt={autoAdapt}
                            onAutoAdapt={setAutoAdapt}
                        />
                        <StepDone t={t} name={name} role={role} />
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    {/* Dots */}
                    <div className={styles.dots} aria-hidden="true">
                        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                            <div
                                key={i}
                                className={`${styles.dot} ${i === step ? styles.dotActive : ''}`}
                            />
                        ))}
                    </div>

                    {/* Buttons */}
                    <div className={styles.btnRow}>
                        {!isLastStep && (
                            <button
                                type="button"
                                className={styles.btnSkip}
                                onClick={handleSkip}
                                aria-label={t('skip')}
                            >
                                {t('skip')}
                            </button>
                        )}
                        <button
                            type="button"
                            className={styles.btnNext}
                            onClick={isLastStep ? handleFinish : handleNext}
                            disabled={!canProceed || isLoading}
                            aria-label={isLastStep ? t('finish') : t('next')}
                        >
                            {isLoading ? (
                                <Loader size={18} className={styles.spin} />
                            ) : isLastStep ? (
                                t('finish')
                            ) : (
                                <>
                                    {t('next')}
                                    <ChevronRight size={18} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Step 1: Welcome ───────────────────────────────────────────────────────

interface WelcomeProps {
    t: ReturnType<typeof useTranslations<'onboarding'>>;
    language: Language;
    onLanguage: (l: Language) => void;
}

function StepWelcome({ t, language, onLanguage }: WelcomeProps) {
    const langs: { value: Language; label: string }[] = [
        { value: 'ru', label: 'Русский' },
        { value: 'en', label: 'English' },
        { value: 'cn', label: '中文' },
    ];

    return (
        <div className={styles.step}>
            <div className={styles.stepIcon}>
                <Globe size={28} />
            </div>
            <div>
                <h1 className={styles.stepTitle}>{t('welcome.title')}</h1>
                <p className={styles.stepSubtitle}>{t('welcome.subtitle')}</p>
            </div>
            <div>
                <label className={styles.fieldLabel}>{t('welcome.chooseLanguage')}</label>
                <div className={styles.langGroup}>
                    {langs.map(({ value, label }) => (
                        <button
                            key={value}
                            type="button"
                            className={`${styles.langChip} ${language === value ? styles.langChipActive : ''}`}
                            onClick={() => onLanguage(value)}
                            aria-pressed={language === value}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Step 2: Profile ───────────────────────────────────────────────────────

interface ProfileProps {
    t: ReturnType<typeof useTranslations<'onboarding'>>;
    name: string;
    onName: (n: string) => void;
    role: Role;
    onRole: (r: Role) => void;
}

function StepProfile({ t, name, onName, role, onRole }: ProfileProps) {
    const roles: { value: Role; icon: React.ReactNode; label: string; desc: string }[] = [
        {
            value: 'coach',
            icon: <Dumbbell size={20} />,
            label: t('profile.roleCoach'),
            desc: t('profile.roleCoachDesc'),
        },
        {
            value: 'athlete',
            icon: <User size={20} />,
            label: t('profile.roleAthlete'),
            desc: t('profile.roleAthleteDesc'),
        },
    ];

    return (
        <div className={styles.step}>
            <div className={styles.stepIcon}>
                <User size={28} />
            </div>
            <div>
                <h2 className={styles.stepTitle}>{t('profile.title')}</h2>
                <p className={styles.stepSubtitle}>{t('profile.subtitle')}</p>
            </div>
            <div>
                <label htmlFor="onboarding-name" className={styles.fieldLabel}>
                    {t('profile.yourName')}
                </label>
                <input
                    id="onboarding-name"
                    type="text"
                    className={styles.input}
                    value={name}
                    onChange={(e) => onName(e.target.value)}
                    placeholder={t('profile.namePlaceholder')}
                    autoComplete="name"
                    autoCapitalize="words"
                />
            </div>
            <div>
                <p className={styles.fieldLabel}>{t('profile.role')}</p>
                <div className={styles.roleGroup}>
                    {roles.map(({ value, icon, label, desc }) => {
                        const isActive = role === value;
                        return (
                            <button
                                key={value}
                                type="button"
                                className={`${styles.roleCard} ${isActive ? styles.roleCardActive : ''}`}
                                onClick={() => onRole(value)}
                                aria-pressed={isActive}
                            >
                                <div className={`${styles.roleCardIcon} ${isActive ? styles.roleCardActiveIcon : ''}`}>
                                    {icon}
                                </div>
                                <div>
                                    <p className={styles.roleCardName}>{label}</p>
                                    <p className={styles.roleCardDesc}>{desc}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── Step 3: Preferences ───────────────────────────────────────────────────

interface PrefsProps {
    t: ReturnType<typeof useTranslations<'onboarding'>>;
    units: Units;
    onUnits: (u: Units) => void;
    autoAdapt: boolean;
    onAutoAdapt: (v: boolean) => void;
}

function StepPreferences({ t, units, onUnits, autoAdapt, onAutoAdapt }: PrefsProps) {
    return (
        <div className={styles.step}>
            <div className={styles.stepIcon}>
                <Settings size={28} />
            </div>
            <div>
                <h2 className={styles.stepTitle}>{t('prefs.title')}</h2>
                <p className={styles.stepSubtitle}>{t('prefs.subtitle')}</p>
            </div>
            {/* Units */}
            <div>
                <p className={styles.fieldLabel}>{t('prefs.units')}</p>
                <div className={styles.unitGroup}>
                    {(['metric', 'imperial'] as Units[]).map((u) => (
                        <button
                            key={u}
                            type="button"
                            className={`${styles.unitBtn} ${units === u ? styles.unitBtnActive : ''}`}
                            onClick={() => onUnits(u)}
                            aria-pressed={units === u}
                        >
                            {t(`prefs.${u}`)}
                        </button>
                    ))}
                </div>
            </div>
            {/* Auto-adapt */}
            <div className={styles.prefRow}>
                <div className={styles.prefText}>
                    <p className={styles.prefTitle}>{t('prefs.autoAdapt')}</p>
                    <p className={styles.prefDesc}>{t('prefs.autoAdaptDesc')}</p>
                </div>
                <button
                    type="button"
                    className={`${styles.toggle} ${autoAdapt ? styles.toggleActive : ''}`}
                    onClick={() => onAutoAdapt(!autoAdapt)}
                    role="switch"
                    aria-checked={autoAdapt}
                    aria-label={t('prefs.autoAdapt')}
                >
                    <span className={`${styles.toggleThumb} ${autoAdapt ? styles.toggleThumbActive : ''}`} />
                </button>
            </div>
        </div>
    );
}

// ─── Step 4: Done ──────────────────────────────────────────────────────────

interface DoneProps {
    t: ReturnType<typeof useTranslations<'onboarding'>>;
    name: string;
    role: Role;
}

function StepDone({ t, name, role }: DoneProps) {
    // Coach sees planning features; athlete sees their own workflow
    const coachFeatures = [
        { icon: <Calendar size={18} />, key: 'feature1' },
        { icon: <Dumbbell size={18} />, key: 'feature2' },
        { icon: <Activity size={18} />, key: 'feature3' },
        { icon: <Zap size={18} />, key: 'feature4' },
    ] as const;

    const athleteFeatures = [
        { icon: <Activity size={18} />, key: 'athleteFeature1' },
        { icon: <Dumbbell size={18} />, key: 'athleteFeature2' },
        { icon: <BarChart2 size={18} />, key: 'athleteFeature3' },
        { icon: <Zap size={18} />, key: 'athleteFeature4' },
    ] as const;

    const features = role === 'athlete' ? athleteFeatures : coachFeatures;

    return (
        <div className={styles.step}>
            <div className={styles.stepIcon}>
                <BarChart2 size={28} />
            </div>
            <div>
                <h2 className={styles.stepTitle}>
                    {name ? `${name}, ` : ''}{t('done.title')}
                </h2>
                <p className={styles.stepSubtitle}>{t('done.subtitle')}</p>
            </div>
            <div className={styles.featureList}>
                {features.map(({ icon, key }) => (
                    <div key={key} className={styles.featureItem}>
                        <div className={styles.featureIcon}>{icon}</div>
                        <div>
                            <p className={styles.featureName}>{t(`done.${key}`)}</p>
                            <p className={styles.featureDesc}>{t(`done.${key}Desc`)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
