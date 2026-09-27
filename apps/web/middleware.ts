import { NextResponse, type NextRequest } from 'next/server';
import { locales, defaultLocale } from '@/lib/i18n';

// Send "/" and un-prefixed paths to /es or /en based on the browser's language.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;
  const accept = req.headers.get('accept-language') ?? '';
  const preferred = /^\s*en\b/i.test(accept) && !/\bes\b/i.test(accept.split(',')[0]) ? 'en' : defaultLocale;
  const url = req.nextUrl.clone();
  url.pathname = `/${preferred}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/((?!api|_next|favicon.ico|.*\\..*).*)'] };
