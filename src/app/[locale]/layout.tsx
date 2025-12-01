import { ThemeProvider } from '@/components/theme-provider';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { WelcomePopup } from '@/components/WelcomePopup';
import { locales } from '@/i18n';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  // Ensure locale is valid
  const validLocale = locales.includes(locale as (typeof locales)[number])
    ? (locale as (typeof locales)[number])
    : 'en';

  // Set the locale for this request - this makes it available to getMessages()
  setRequestLocale(validLocale);

  // Get messages for the current locale (automatically uses locale from setRequestLocale)
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <ThemeProvider
        attribute='class'
        defaultTheme='system'
        enableSystem
        disableTransitionOnChange>
        <Header />
        {children}
        <WelcomePopup />
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
