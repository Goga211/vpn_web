import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getJSON } from './api'
import type { Plan, SiteConfig } from './types'
import { defaultConfig, fallbackPlans } from './siteData'

type Theme = 'light' | 'dark'

type SiteContextValue = {
  config: SiteConfig
  plans: Plan[]
  theme: Theme
  toggleTheme: () => void
}

const SiteContext = createContext<SiteContextValue | null>(null)

// localStorage и matchMedia могут быть недоступны во встроенном WebView (приватный
// режим, запрет хранилища) и бросать SecurityError. Любой такой бросок здесь — это
// синхронный краш в инициализаторе useState, то есть серый экран. Поэтому всё под
// try/catch с безопасными значениями по умолчанию.
function readStoredTheme(): Theme | null {
  try {
    const saved = window.localStorage.getItem('site-theme')
    return saved === 'light' || saved === 'dark' ? saved : null
  } catch {
    return null
  }
}

function prefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return readStoredTheme() ?? (prefersDark() ? 'dark' : 'light')
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [config, setConfig] = useState<SiteConfig>(defaultConfig)
  const [plans, setPlans] = useState<Plan[]>(fallbackPlans)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    try {
      window.localStorage.setItem('site-theme', theme)
    } catch {
      // Запись в хранилище может быть запрещена — тема просто не сохранится между
      // сессиями, но приложение продолжит работать.
    }
  }, [theme])

  useEffect(() => {
    let ignore = false

    async function loadInitialData() {
      const [configResult, plansResult] = await Promise.allSettled([
        getJSON<SiteConfig>('/api/config'),
        getJSON<{ plans: Plan[] }>('/api/plans'),
      ])

      if (ignore) return

      if (configResult.status === 'fulfilled') {
        const merged = { ...defaultConfig, ...configResult.value }
        if (!configResult.value.brandName) merged.brandName = defaultConfig.brandName
        setConfig(merged)
        document.title = `${merged.brandName} — цифровая подписка`
      }

      if (plansResult.status === 'fulfilled' && Array.isArray(plansResult.value.plans)) {
        setPlans(plansResult.value.plans)
      }
    }

    loadInitialData()

    return () => {
      ignore = true
    }
  }, [])

  const value: SiteContextValue = {
    config,
    plans,
    theme,
    toggleTheme: () => setTheme((value) => (value === 'dark' ? 'light' : 'dark')),
  }

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

// Хук колоцирован с провайдером намеренно. Правило касается только Fast Refresh
// (HMR) в dev-режиме и не влияет на прод-сборку.
// eslint-disable-next-line react-refresh/only-export-components
export function useSite(): SiteContextValue {
  const value = useContext(SiteContext)
  if (!value) throw new Error('useSite must be used inside SiteProvider')
  return value
}
