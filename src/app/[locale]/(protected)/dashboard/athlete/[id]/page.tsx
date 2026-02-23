import { setRequestLocale } from 'next-intl/server';
import AthleteDetailClient from './AthleteDetailClient';

interface Props {
    params: Promise<{ id: string; locale: string }>;
}

/**
 * Static Export compatibility:
 * With `output: 'export'`, Next.js requires generateStaticParams for all dynamic routes.
 * We return a placeholder param — the real athlete IDs are loaded client-side from PocketBase.
 *
 * For this to work in production, nginx must have a try_files fallback:
 *   location /dashboard/athlete/ {
 *     try_files $uri $uri/ /dashboard/athlete/placeholder.html;
 *   }
 *
 * Client-side navigation (from dashboard → athlete card click) works natively
 * because React Router handles the transition without a full page reload.
 */
export function generateStaticParams() {
    const locales = ['ru', 'en', 'cn'];
    return locales.map((locale) => ({ locale, id: 'placeholder' }));
}

export default async function AthleteDetailPage({ params }: Props) {
    const { locale } = await params;
    setRequestLocale(locale);

    return <AthleteDetailClient />;
}
