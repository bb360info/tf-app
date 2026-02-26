import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { AuthProvider } from '@/lib/pocketbase/AuthProvider';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { FontScaleProvider } from '@/lib/theme/FontScaleProvider';
import { ErrorBoundaryWrapper } from '@/components/shared/ErrorBoundaryWrapper';
import { DynamicDocumentTitle } from '@/components/shared/DynamicDocumentTitle';
import '../globals.css';

type Props = {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const messages = (await import(`../../../messages/${locale}/common.json`))
        .default;

    return {
        title: 'Jumpedia',
        description: messages.app?.description ?? 'Training platform for high jump athletes',
        manifest: '/manifest.json',
        appleWebApp: {
            capable: true,
            statusBarStyle: 'default',
            title: 'Jumpedia',
        },
    };
}

export const viewport: Viewport = {
    themeColor: '#2383e2',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
};

export default async function LocaleLayout({ children, params }: Props) {
    const { locale } = await params;

    if (!hasLocale(routing.locales, locale)) {
        notFound();
    }

    setRequestLocale(locale);

    const messages = await getMessages();

    return (
        <html lang={locale === 'cn' ? 'zh-CN' : locale}>
            {/* Anti-FOUC: reads localStorage before React hydrates to set correct theme */}
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `(function(){try{var t=localStorage.getItem('jp-theme');var r=t==='dark'?'dark':t==='light'?'light':(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',r);}catch(e){}})();`,
                    }}
                />
            </head>
            <body>
                <NextIntlClientProvider messages={messages}>
                    <FontScaleProvider>
                        <ThemeProvider>
                            <AuthProvider>
                                <ErrorBoundaryWrapper>
                                    <DynamicDocumentTitle />
                                    {children}
                                    <div id="portal-root" />
                                </ErrorBoundaryWrapper>
                            </AuthProvider>
                        </ThemeProvider>
                    </FontScaleProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
