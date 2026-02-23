import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

/**
 * next-intl middleware with automatic locale detection.
 *
 * Detection order:
 * 1. Locale prefix in URL (e.g. /ru/dashboard) — always wins
 * 2. Accept-Language header from browser/device
 * 3. Fallback: 'en'
 *
 * Supported locales: ru, en, cn
 * Mapping: ru-* → ru, zh-* → cn, everything else → en
 */
export default createMiddleware({
    ...routing,
    // Enable browser language detection via Accept-Language header
    localeDetection: true,
});

export const config = {
    // Match all paths except Next.js internals and static files
    matcher: [
        '/((?!_next|_vercel|.*\\..*).*)',
    ],
};
