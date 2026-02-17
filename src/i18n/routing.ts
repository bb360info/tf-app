import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
    locales: ['ru', 'en', 'cn'],
    defaultLocale: 'en',
});

export type Locale = (typeof routing.locales)[number];
