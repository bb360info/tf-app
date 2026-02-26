'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageWrapper } from '@/components/shared/PageWrapper';
import { Settings, BookOpen, Video, WifiOff, Bell } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { FeatureTeaser } from '@/components/shared/FeatureTeaser';
import styles from './page.module.css';

export default function MoreMenuPage() {
    const t = useTranslations('nav');
    const tFeature = useTranslations('feature');

    return (
        <main className={styles.page}>
            <PageWrapper maxWidth="standard">
                <PageHeader title={t('more')} />

                <section className={styles.section}>
                    <div className={styles.menuList}>
                        <Link href="/settings" className={styles.menuItem}>
                            <div className={styles.iconWrapper}>
                                <Settings size={22} className={styles.icon} />
                            </div>
                            <span className={styles.menuLabel}>{t('settings')}</span>
                        </Link>

                        <Link href="/reference" className={styles.menuItem}>
                            <div className={styles.iconWrapper}>
                                <BookOpen size={22} className={styles.icon} />
                            </div>
                            <span className={styles.menuLabel}>{t('reference')}</span>
                        </Link>

                        <Link href="/notifications" className={styles.menuItem}>
                            <div className={styles.iconWrapper}>
                                <Bell size={22} className={styles.icon} />
                            </div>
                            <span className={styles.menuLabel}>{t('notifications')}</span>
                        </Link>
                    </div>
                </section>

                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>{tFeature('upcoming')}</h3>
                    <div className={styles.teasers}>
                        <FeatureTeaser
                            title={tFeature('video.title')}
                            description={tFeature('video.description')}
                            icon={Video}
                        />
                        <FeatureTeaser
                            title={tFeature('offline.title')}
                            description={tFeature('offline.description')}
                            icon={WifiOff}
                        />
                    </div>
                </section>
            </PageWrapper>
        </main>
    );
}
