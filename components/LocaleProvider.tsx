'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type Locale = 'ko' | 'en'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  tr: <T>(ko: T, en: T) => T
}

const LocaleContext = createContext<LocaleContextValue | null>(null)
const STORAGE_KEY = 'ai-battle-locale'

export default function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ko')

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    const browserLocale = window.navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en'
    setLocaleState(saved === 'ko' || saved === 'en' ? saved : browserLocale)
  }, [])

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
    window.localStorage.setItem(STORAGE_KEY, nextLocale)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    tr: <T,>(ko: T, en: T) => locale === 'ko' ? ko : en,
  }), [locale, setLocale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext)
  if (!context) throw new Error('useLocale must be used inside LocaleProvider')
  return context
}
