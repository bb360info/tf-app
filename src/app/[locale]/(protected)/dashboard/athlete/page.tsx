import { setRequestLocale } from 'next-intl/server';
import AthleteDetailClient from './[id]/AthleteDetailClient';

interface Props {
    params: Promise<{ locale: string }>;
}

export default async function AthleteDetailStaticPage({ params }: Props) {
    const { locale } = await params;
    setRequestLocale(locale);

    return <AthleteDetailClient />;
}
