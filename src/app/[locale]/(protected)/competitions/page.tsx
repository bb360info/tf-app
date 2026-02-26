import { getTranslations } from 'next-intl/server';
import { CompetitionsHub } from '@/components/competitions/CompetitionsHub';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'competitions' });
    return { title: t('title') };
}

export default function CompetitionsPage() {
    return <CompetitionsHub />;
}
