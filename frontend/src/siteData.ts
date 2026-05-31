import type { Plan, SiteConfig } from './types'

export const TRIAL_PLAN_ID = 'trial'

export const defaultConfig: SiteConfig = {
  brandName: 'ПЛАТЕЖНЫЙ СЕРВЕР',
  supportTelegramUrl: 'https://t.me/bezgraniz_support_bot',
  supportEmail: 'support@example.com',
  paymentProvider: 'online',
  checkoutEnabled: true,
  provisioningEnabled: false,
}

export const fallbackPlans: Plan[] = [
  {
    id: 'trial',
    name: 'Пробный период',
    period: '30 дней',
    months: 0,
    priceRub: 0,
    trafficLimitGb: 100,
    devices: 2,
    highlight: '30 дней, чтобы попробовать без оплаты',
    provisionDuration: '720h0m0s',
  },
  {
    id: 'month',
    name: 'Месяц',
    period: '30 дней',
    months: 1,
    priceRub: 299,
    trafficLimitGb: 0,
    devices: 5,
    highlight: 'Гибкий старт без обязательств',
    provisionDuration: '720h0m0s',
  },
  {
    id: 'halfyear',
    name: '6 месяцев',
    period: '180 дней',
    months: 6,
    priceRub: 1490,
    oldPriceRub: 1794,
    trafficLimitGb: 0,
    devices: 7,
    popular: true,
    highlight: 'Выгодный период с экономией 17%',
    provisionDuration: '4320h0m0s',
  },
  {
    id: 'year',
    name: '12 месяцев',
    period: '365 дней',
    months: 12,
    priceRub: 2790,
    oldPriceRub: 3588,
    trafficLimitGb: 0,
    devices: 10,
    highlight: 'Спокойная цена и максимальный приоритет',
    provisionDuration: '8760h0m0s',
  },
]

export function formatPrice(value: number): string {
  if (!value) return 'Бесплатно'
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
}

export function trafficLabel(plan: Plan): string {
  return plan.trafficLimitGb > 0 ? `${plan.trafficLimitGb} ГБ` : 'Безлимитный трафик'
}

export function devicesLabel(plan: Plan): string {
  return `До ${plan.devices} одновременных потоков`
}

export function qualityLabel(plan: Plan): string {
  if (plan.id === 'trial') return 'Стандартный канал'
  if (plan.months >= 12) return 'Premium · максимальный приоритет'
  if (plan.months >= 6) return 'Премиум-канал'
  return 'Расширенный канал'
}

export function speedLabel(plan: Plan): string {
  if (plan.id === 'trial') return 'Стабильная скорость'
  if (plan.months >= 12) return 'Без ограничений по скорости'
  if (plan.months >= 6) return 'Высокая скорость, приоритет'
  return 'Высокая скорость'
}

export function getConfigNotice(config: SiteConfig): string {
  if (!config.checkoutEnabled) {
    return 'Онлайн-оформление временно недоступно. Напишите в поддержку, чтобы получить доступ.'
  }
  if (!config.provisioningEnabled) {
    return 'Автоматическая выдача временно недоступна. Напишите в поддержку, и мы поможем оформить доступ.'
  }
  return ''
}

export function statusLabel(status: string): string {
  return (
    {
      paid: 'оплата подтверждена',
      provisioned: 'доступ выдан',
      failed: 'ошибка выдачи',
    }[status] || status
  )
}
