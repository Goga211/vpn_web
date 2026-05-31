import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

type TelegramWebApp = {
  initData?: string
  ready?: () => void
  expand?: () => void
}

// Telegram кладёт WebApp в window, когда страница открыта как Mini App из бота.
// Вне Telegram объект отсутствует, и initData остаётся пустым (браузерный путь).
export function getTelegramWebApp(): TelegramWebApp | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram
    ?.WebApp
}

// useTelegramInit разворачивает Mini App на весь экран при запуске из Telegram.
export function useTelegramInit() {
  useEffect(() => {
    const tg = getTelegramWebApp()
    tg?.ready?.()
    tg?.expand?.()
  }, [])
}

export function useScrollReveal() {
  const location = useLocation()

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))

    if (prefersReducedMotion.matches) {
      items.forEach((item) => item.setAttribute('data-revealed', 'true'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.setAttribute('data-revealed', 'true')
          observer.unobserve(entry.target)
        })
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
    )

    items.forEach((item) => observer.observe(item))

    return () => observer.disconnect()
  }, [location.pathname])
}

export function useHashScroll() {
  const location = useLocation()

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1)
      const el = document.getElementById(id)
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
        return
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname, location.hash])
}
