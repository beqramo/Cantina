import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'pt'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ requestLocale }) => {
  // Use requestLocale from the request, or default to 'en'
  // requestLocale comes from the [locale] route param when using i18n routing
  const locale = (await requestLocale) || 'en';

  // Validate that the incoming locale is valid
  const validLocale = locales.includes(locale as Locale)
    ? (locale as Locale)
    : 'en';

  // Import messages based on locale
  let messages;
  if (validLocale === 'en') {
    messages = (await import('../messages/en.json')).default;
  } else {
    messages = (await import('../messages/pt.json')).default;
  }

  return {
    locale: validLocale,
    messages,
  };
});
