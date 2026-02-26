'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter, usePathname } from '@/i18n/navigation';
import {
    Globe,
    Settings,
    ChevronRight,
    Calendar,
    Dumbbell,
    BarChart2,
    Zap,
    Activity,
    Loader,
    Target,
    Check,
} from 'lucide-react';
import { saveMyPreferences, completeOnboarding } from '@/lib/pocketbase/services/preferences';
import { updateUserRole } from '@/lib/pocketbase/auth';
import { getSelfAthleteProfile, updateAthlete } from '@/lib/pocketbase/services/athletes';
import pb from '@/lib/pocketbase/client';
import type { Language, Discipline } from '@/lib/pocketbase/types';
import { detectBrowserLocale } from '@/lib/i18n/detectLocale';
import type { PendingInviteJoinStatus } from '@/lib/utils/pendingInvite';
import { DisciplineSelector } from './DisciplineSelector';
import styles from './onboarding.module.css';

type Role = 'coach' | 'athlete';
type Units = 'metric' | 'imperial';

const TOTAL_STEPS = 4;

export default function OnboardingWizard() {
    const t = useTranslations('onboarding');
    const tc = useTranslations();
    const router = useRouter();
    const pathname = usePathname();

    const [step, setStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [joinedGroupName, setJoinedGroupName] = useState<string | null>(null);
    const [inviteJoinStatus, setInviteJoinStatus] = useState<PendingInviteJoinStatus | null>(null);

    // Form state — language defaults to browser detection
    const [language, setLanguage] = useState<Language>(() => detectBrowserLocale());
    const [units, setUnits] = useState<Units>('metric');
    const [autoAdapt, setAutoAdapt] = useState(true);

    // Specialization state (athletes only)
    const [primaryDiscipline, setPrimaryDiscipline] = useState<Discipline | ''>('');
    const [secondaryDisciplines, setSecondaryDisciplines] = useState<Discipline[]>([]);

    // When user picks a language — update state AND switch the app locale immediately
    const handleLanguageChange = useCallback((lang: Language) => {
        setLanguage(lang);
        router.replace(pathname, { locale: lang });
    }, [pathname, router]);

    const handleNext = useCallback(() => {
        if (step < TOTAL_STEPS - 1) {
            setStep((s) => s + 1);
        }
    }, [step]);

    const handleSkip = useCallback(() => {
        setStep(TOTAL_STEPS - 1);
    }, []);

    // Determine current user role from authStore
    const currentRole = (pb.authStore.record?.role as Role) ?? 'athlete';

    const handleFinish = useCallback(async () => {
        setInviteJoinStatus(null);
        setIsLoading(true);
        let redirectPath: string | null = '/training';
        try {
            const userId = pb.authStore.record?.id;

            // Phase 2: FIRST — try to join pending invite (set by /join page before registration)
            // Must happen BEFORE specialization save (athlete record may not exist yet)
            const { joinWithPendingInvite, getJoinedGroupName } = await import('@/lib/utils/pendingInvite');
            const inviteResult = await joinWithPendingInvite();
            // LoginForm may have already consumed the code — getJoinedGroupName() as fallback
            const groupName = inviteResult.groupName ?? getJoinedGroupName();
            if (inviteResult.status === 'invalidOrExpired' || inviteResult.status === 'coachCannotJoin' || inviteResult.status === 'error') {
                setInviteJoinStatus(inviteResult.status);
                redirectPath = null;
                return;
            }
            if (inviteResult.status === 'joined' || inviteResult.status === 'alreadyMember' || groupName) {
                setJoinedGroupName(groupName);
                redirectPath = '/dashboard'; // Joined group → go to dashboard, not /training
            }
            // Role already set during registration — ensure it's saved
            await updateUserRole(currentRole);

            // Save athlete specialization (athletes only)
            if (currentRole === 'athlete' && userId && primaryDiscipline) {
                try {
                    const myAthlete = await getSelfAthleteProfile();
                    if (myAthlete) {
                        await updateAthlete(myAthlete.id, {
                            primary_discipline: primaryDiscipline as Discipline,
                            secondary_disciplines: secondaryDisciplines,
                        });
                    }
                } catch (e) {
                    // Non-blocking: athlete record may not exist yet, that's OK
                    console.error('Failed to save athlete specialization/PB:', e);
                }
            }

            await saveMyPreferences({
                language,
                units,
                auto_adaptation_enabled: autoAdapt,
                onboarding_complete: true,
            });
            await completeOnboarding();
        } catch (e) {
            // non-blocking: still route to training
            console.error('Onboarding wrap-up failed:', e);
        } finally {
            setIsLoading(false);
            if (redirectPath) {
                router.replace(redirectPath);
            }
        }
    }, [language, units, autoAdapt, currentRole, primaryDiscipline, secondaryDisciplines, router]);

    const isLastStep = step === TOTAL_STEPS - 1;
    const inviteJoinErrorText =
        inviteJoinStatus === 'invalidOrExpired'
            ? tc('auth.inviteExpiredLogin')
            : inviteJoinStatus === 'coachCannotJoin'
                ? tc('auth.inviteCoachBlocked')
                : inviteJoinStatus === 'error'
                    ? tc('auth.inviteJoinFailed')
                    : '';

    return (
        <div className={styles.overlay}>
            <div className={styles.card}>
                {/* Progress bar */}
                <div className={styles.progressBar}>
                    <div
                        className={`${styles.progressFill} ${styles[`progressStep${step + 1}`]}`}
                        role="progressbar"
                        aria-valuenow={step + 1}
                        aria-valuemin={1}
                        aria-valuemax={TOTAL_STEPS}
                    />
                </div>

                {/* Steps */}
                <div className={styles.stepsViewport}>
                    <div className={`${styles.stepsTrack} ${styles[`stepsTrackStep${step}`]}`}>
                        <StepWelcome
                            t={t}
                            language={language}
                            onLanguage={handleLanguageChange}
                        />
                        <StepSpecialization
                            t={t}
                            role={currentRole}
                            primaryDiscipline={primaryDiscipline}
                            onPrimaryChange={setPrimaryDiscipline}
                            secondaryDisciplines={secondaryDisciplines}
                            onSecondaryChange={setSecondaryDisciplines}
                        />
                        <StepPreferences
                            t={t}
                            units={units}
                            onUnits={setUnits}
                            autoAdapt={autoAdapt}
                            onAutoAdapt={setAutoAdapt}
                        />
                        <StepDone t={t} role={currentRole} joinedGroupName={joinedGroupName} />
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

                    {inviteJoinStatus && (
                        <div className={styles.inviteError} role="alert">
                            <p className={styles.inviteErrorText}>{inviteJoinErrorText}</p>
                            <div className={styles.inviteErrorActions}>
                                <Link href="/join" className={styles.inviteErrorLink}>
                                    {tc('auth.openJoinPage')}
                                </Link>
                                <Link href="/settings/groups" className={styles.inviteErrorLink}>
                                    {tc('athleteDashboard.profileMissingGroupsCta')}
                                </Link>
                            </div>
                        </div>
                    )}

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
                            disabled={isLoading}
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

// ─── Step 2: Specialization ────────────────────────────────────────────────

interface SpecializationProps {
    t: ReturnType<typeof useTranslations<'onboarding'>>;
    role: Role;
    primaryDiscipline: Discipline | '';
    onPrimaryChange: (d: Discipline) => void;
    secondaryDisciplines: Discipline[];
    onSecondaryChange: (d: Discipline[]) => void;
}

function StepSpecialization({
    t,
    role,
    primaryDiscipline,
    onPrimaryChange,
    secondaryDisciplines,
    onSecondaryChange,
}: SpecializationProps) {
    // Coaches skip discipline picker — show generic step
    if (role === 'coach') {
        return (
            <div className={styles.step}>
                <div className={styles.stepIcon}>
                    <Target size={28} />
                </div>
                <div>
                    <h2 className={styles.stepTitle}>{t('specialization.title')}</h2>
                    <p className={styles.stepSubtitle}>{t('specialization.subtitle')}</p>
                </div>
                {/* Coaches see a simplified message — discipline is athlete-specific */}
                <div className={styles.roleGroup}>
                    <div className={`${styles.roleCard} ${styles.roleCardStatic}`}>
                        <div className={`${styles.roleCardIcon} ${styles.roleCardCoachIcon}`}>
                            <Target size={20} />
                        </div>
                        <div>
                            <p className={styles.roleCardName}>{t('specialization.disciplines.high_jump')}</p>
                            <p className={styles.roleCardDesc}>{t('specialization.disciplines.long_jump')} · {t('specialization.disciplines.triple_jump')}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Athletes see DisciplineSelector
    const tSpec = (key: string) => {
        // Map specialization keys through t with namespace prefix
        type SpecKey = 'title' | 'subtitle' | 'primary' | 'secondary'
            | 'disciplines.high_jump' | 'disciplines.long_jump' | 'disciplines.triple_jump';
        return t(`specialization.${key}` as SpecKey);
    };

    return (
        <div className={styles.step}>
            <div className={styles.stepIcon}>
                <Target size={28} />
            </div>
            <div>
                <h2 className={styles.stepTitle}>{t('specialization.title')}</h2>
                <p className={styles.stepSubtitle}>{t('specialization.subtitle')}</p>
            </div>
            <DisciplineSelector
                t={tSpec}
                primary={primaryDiscipline}
                onPrimaryChange={onPrimaryChange}
                secondary={secondaryDisciplines}
                onSecondaryChange={onSecondaryChange}
                showSecondary
            />
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
    role: Role;
    joinedGroupName?: string | null;
}

function StepDone({ t, role, joinedGroupName }: DoneProps) {
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
                <h2 className={styles.stepTitle}>{t('done.title')}</h2>
                <p className={styles.stepSubtitle}>{t('done.subtitle')}</p>
            </div>
            {/* Invite success banner — shown when athlete joined a group during onboarding */}
            {joinedGroupName && (
                <div className={styles.inviteSuccess}>
                    <Check size={16} aria-hidden />
                    {t('done.joinedGroup', { name: joinedGroupName })}
                </div>
            )}
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
