import { en } from './en'
import { ru } from './ru'
import { useSettingsStore } from '@/store/settings'

/**
 * Lightweight, dependency-free i18n.
 * - `en` defines the dictionary shape; every locale is typed against it,
 *   so adding a language is: create the file, register it below — the
 *   compiler enforces completeness.
 * - `useT()` subscribes components to locale changes (Zustand), so the whole
 *   UI re-renders instantly on switch.
 * - `getT()` is for non-React code (pipeline steps, toasts).
 */

export type Dict = typeof en
export type Locale = 'en' | 'ru'

export const DICTS: Record<Locale, Dict> = { en, ru }

export const LOCALES: { id: Locale; label: string }[] = [
  { id: 'en', label: 'EN' },
  { id: 'ru', label: 'RU' },
]

export function useT(): Dict {
  const locale = useSettingsStore((s) => s.locale)
  return DICTS[locale]
}

export function getT(): Dict {
  return DICTS[useSettingsStore.getState().locale]
}

/** Interpolates {placeholders}: fmt('{n} / {max}', { n: 2, max: 6 }). */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''))
}
