import { setRequestLocale } from 'next-intl/server';
import ReferenceArticleClient from './ReferenceArticleClient';

type Slug = 'technique' | 'errors' | 'periodization' | 'injuries';

interface Props {
    params: Promise<{ slug: string; locale: string }>;
}

// Static params for Next.js static export — must be in a Server Component
export function generateStaticParams() {
    const slugs: Slug[] = ['technique', 'errors', 'periodization', 'injuries'];
    const locales = ['ru', 'en', 'cn'];
    return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export default async function ReferenceSlugPage({ params }: Props) {
    const { slug, locale } = await params;
    setRequestLocale(locale);

    return <ReferenceArticleClient slug={slug as Slug} />;
}
