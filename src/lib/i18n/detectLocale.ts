/**
 * Detect the best supported locale from the browser/device language settings.
 *
 * Priority:
 * 1. navigator.languages (ordered preference list)
 * 2. navigator.language (single value)
 * 3. Fallback: 'en'
 *
 * Mapping:
 * - ru-*, ru → 'ru'
 * - zh-*, zh → 'cn'
 * - anything else → 'en'
 */

export type SupportedLocale = 'ru' | 'en' | 'cn';

const SUPPORTED: SupportedLocale[] = ['ru', 'en', 'cn'];

function mapBrowserTag(tag: string): SupportedLocale | null {
    const lower = tag.toLowerCase();
    if (lower.startsWith('ru')) return 'ru';
    if (lower.startsWith('zh')) return 'cn';
    if (lower.startsWith('en')) return 'en';
    return null;
}

/**
 * Returns the best matching supported locale based on browser preference.
 * Always returns a valid locale — never undefined.
 */
export function detectBrowserLocale(): SupportedLocale {
    if (typeof navigator === 'undefined') return 'en'; // SSR guard

    const languages: readonly string[] =
        navigator.languages?.length ? navigator.languages : [navigator.language ?? 'en'];

    for (const lang of languages) {
        const matched = mapBrowserTag(lang);
        if (matched) return matched;
    }

    return 'en';
}

/**
 * Check if a given string is a supported locale.
 */
export function isSupportedLocale(value: unknown): value is SupportedLocale {
    return SUPPORTED.includes(value as SupportedLocale);
}
