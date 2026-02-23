import { getTranslations } from 'next-intl/server';
import { NotificationsClientPage } from './NotificationsClientPage';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'notifications' });
    return { title: t('title') };
}

export default async function NotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'notifications' });

    return (
        <NotificationsClientPage
            labels={{
                title: t('title'),
                empty: t('empty'),
                markAllRead: t('markAllRead'),
                types: {
                    all: t('types.all'),
                    plan_published: t('types.plan_published'),
                    checkin_reminder: t('types.checkin_reminder'),
                    achievement: t('types.achievement'),
                    low_readiness: t('types.low_readiness'),
                    coach_note: t('types.coach_note'),
                    invite_accepted: t('types.invite_accepted'),
                    competition_upcoming: t('types.competition_upcoming'),
                    system: t('types.system'),
                },
            }}
        />
    );
}
