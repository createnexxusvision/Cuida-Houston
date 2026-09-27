import en from '@/messages/en.json';
import es from '@/messages/es.json';

export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';
export type Messages = typeof en;

const dictionaries: Record<Locale, Messages> = { en, es };

export function isLocale(v: string): v is Locale {
  return (locales as readonly string[]).includes(v);
}

export function getMessages(locale: string): Messages {
  return dictionaries[isLocale(locale) ? locale : defaultLocale];
}

/** Replace {name} placeholders. */
export function fmt(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
