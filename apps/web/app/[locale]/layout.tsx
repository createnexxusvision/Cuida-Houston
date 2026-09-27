import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMessages, isLocale, locales } from '@/lib/i18n';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Cuida HOU',
  description: 'Licensed childcare in Houston, in English and Spanish. Cuidado infantil con licencia en Houston.',
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  const other = locale === 'es' ? 'en' : 'es';
  return (
    <html lang={locale}>
      <body>
        <div className="wrap">
          <header className="top">
            <h1><Link href={`/${locale}`}>Cuida HOU</Link></h1>
            <nav className="links" aria-label="Main">
              <Link href={`/${locale}`}>{t.nav.find}</Link>
              <Link href={`/${locale}/provider-path`}>{t.nav.provide}</Link>
              <Link href={`/${other}`} hrefLang={other} lang={other}>{t.otherLang}</Link>
            </nav>
          </header>
          {children}
          <footer>{t.disclaimer}</footer>
        </div>
      </body>
    </html>
  );
}
