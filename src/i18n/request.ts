import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
    const requested = await requestLocale;
    const locale = hasLocale(routing.locales, requested)
        ? requested
        : routing.defaultLocale;

    // Загружаем кусочки словаря
    const shared = (await import(`../../messages/${locale}/shared.json`)).default;
    const auth = (await import(`../../messages/${locale}/auth.json`)).default;
    const training = (await import(`../../messages/${locale}/training.json`)).default;
    const dashboard = (await import(`../../messages/${locale}/dashboard.json`)).default;
    const settings = (await import(`../../messages/${locale}/settings.json`)).default;
    const analytics = (await import(`../../messages/${locale}/analytics.json`)).default;
    const reference = (await import(`../../messages/${locale}/reference.json`)).default;

    return {
        locale,
        messages: {
            ...shared,
            ...auth,
            ...training,
            ...dashboard,
            ...settings,
            ...analytics,
            ...reference
        },
    };
});
