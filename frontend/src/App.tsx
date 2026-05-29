import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  CircleDollarSign,
  Copy,
  Headphones,
  Mail,
  MessageCircle,
  Moon,
  Plane,
  Sparkles,
  SquarePen,
  Sun,
  X,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CheckoutApiError, createCheckout, getJSON } from './api'
import type { Checkout, Payment, Plan, SiteConfig } from './types'

type Theme = 'light' | 'dark'
type FormStatus = { kind: 'idle' | 'success' | 'error'; message: string }
type AccessDialog =
  | { type: 'success'; checkout: Checkout; payment?: Payment }
  | { type: 'failure'; checkout?: Checkout; message: string }

type TelegramWebApp = {
  initData?: string
  ready?: () => void
  expand?: () => void
}

// Telegram кладёт WebApp в window, когда страница открыта как Mini App из бота.
// Вне Telegram объект отсутствует, и initData остаётся пустым (браузерный путь).
function getTelegramWebApp(): TelegramWebApp | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram
    ?.WebApp
}

const defaultConfig: SiteConfig = {
  brandName: 'Простор',
  supportTelegramUrl: 'https://t.me/bezgraniz_support_bot',
  supportEmail: 'support@example.com',
  paymentProvider: 'online',
  checkoutEnabled: true,
  provisioningEnabled: false,
}

const TRIAL_PLAN_ID = 'trial'
const logoLightSrc = `${import.meta.env.BASE_URL}assets/logo-light.svg`
const logoDarkSrc = `${import.meta.env.BASE_URL}assets/logo-dark.svg`

const fallbackPlans: Plan[] = [
  {
    id: 'trial',
    name: 'Пробный период',
    period: '30 дней',
    months: 0,
    priceRub: 0,
    trafficLimitGb: 100,
    devices: 2,
    highlight: '30 дней для проверки скорости',
    provisionDuration: '720h0m0s',
  },
  {
    id: 'month',
    name: 'Доступ на месяц',
    period: '30 дней',
    months: 1,
    priceRub: 299,
    trafficLimitGb: 0,
    devices: 5,
    highlight: 'Гибкий старт',
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
    highlight: 'Выгодный период без лишних настроек',
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
    highlight: 'Самая спокойная цена',
    provisionDuration: '8760h0m0s',
  },
]

const navItems = [
  ['Главная', '#top'],
  ['Сценарии', '#services'],
  ['Тарифы', '#pricing'],
  ['Оформить', '#checkout'],
] as const

const features: Array<{
  title: string
  text: string
  icon: LucideIcon
  tone: string
}> = [
  {
    title: 'Моментальная выдача',
    text: 'После оформления личная страница подписки появляется прямо на сайте.',
    icon: Zap,
    tone: 'text-[var(--accent-strong)] bg-[var(--accent-soft)]',
  },
  {
    title: 'Лимиты без сюрпризов',
    text: 'Срок подписки и объем данных берутся из выбранного тарифа автоматически.',
    icon: BadgeCheck,
    tone: 'text-[var(--teal)] bg-[var(--teal-soft)]',
  },
  {
    title: 'Поддержка в Telegram',
    text: 'Если активация не прошла, поддержка быстро найдет оформление и доведет подключение.',
    icon: Headphones,
    tone: 'text-[var(--rose)] bg-[var(--rose-soft)]',
  },
]

type ServiceArt = 'media' | 'social' | 'work' | 'travel'

const services: Array<{ label: string; title: string; text: string; art: ServiceArt }> = [
  {
    label: 'Медиа',
    title: 'Видео и стриминг',
    text: 'Стабильный доступ к видео, трансляциям и обучающим платформам.',
    art: 'media',
  },
  {
    label: 'Общение',
    title: 'Соцсети и мессенджеры',
    text: 'Привычные сервисы на телефоне и десктопе без лишних действий.',
    art: 'social',
  },
  {
    label: 'Работа',
    title: 'Рабочие инструменты',
    text: 'Почта, AI-сервисы, облака, таск-трекеры и ежедневные рабочие кабинеты.',
    art: 'work',
  },
  {
    label: 'Путешествия',
    title: 'Путешествия',
    text: 'В дороге проще сохранить привычные сайты, подписки и личные кабинеты.',
    art: 'travel',
  },
]

const faqs = [
  {
    question: 'Когда я получу доступ?',
    answer:
      'Обычно сразу после оформления. Сайт покажет личную ссылку подписки прямо в браузере.',
  },
  {
    question: 'Что делать со ссылкой?',
    answer:
      'Открой ее и следуй инструкции внутри личного кабинета.',
  },
  {
    question: 'Что если автоматическая выдача недоступна?',
    answer:
      'Оформление сохранится, а поддержка поможет выдать доступ вручную по выбранному тарифу.',
  },
]

const fieldClass =
  'form-field h-12 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3.5 text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]'

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [config, setConfig] = useState<SiteConfig>(defaultConfig)
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState(TRIAL_PLAN_ID)
  const [telegram, setTelegram] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formStatus, setFormStatus] = useState<FormStatus>({
    kind: 'idle',
    message: '',
  })
  const [dialog, setDialog] = useState<AccessDialog | null>(null)

  useScrollReveal()
  useSectionFocus()
  useMagneticScroll()
  const activeNavHref = useActiveNavHref()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('site-theme', theme)
  }, [theme])

  useEffect(() => {
    const tg = getTelegramWebApp()
    tg?.ready?.()
    tg?.expand?.()
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadInitialData() {
      const [configResult, plansResult] = await Promise.allSettled([
        getJSON<SiteConfig>('/api/config'),
        getJSON<{ plans: Plan[] }>('/api/plans'),
      ])

      if (ignore) return

      if (configResult.status === 'fulfilled') {
        setConfig({ ...defaultConfig, ...configResult.value })
        document.title = `${configResult.value.brandName || defaultConfig.brandName} — цифровая подписка`
      }

      const loadedPlans =
        plansResult.status === 'fulfilled' && Array.isArray(plansResult.value.plans)
          ? plansResult.value.plans
          : fallbackPlans
      setPlans(loadedPlans)

      const preferredPlan =
        loadedPlans.find((plan) => plan.id === TRIAL_PLAN_ID) || loadedPlans[0]
      if (preferredPlan) {
        setSelectedPlanId(preferredPlan.id)
      }
    }

    loadInitialData()

    return () => {
      ignore = true
    }
  }, [])

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || plans[0],
    [plans, selectedPlanId],
  )

  const configNotice = getConfigNotice(config)

  async function handleCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedPlan) {
      setFormStatus({ kind: 'error', message: 'Тарифы еще загружаются.' })
      return
    }

    if (selectedPlan.id !== TRIAL_PLAN_ID) {
      setSelectedPlanId(TRIAL_PLAN_ID)
      setFormStatus({
        kind: 'error',
        message: 'Оплата платных тарифов пока не активна. Сейчас можно оформить только пробный период.',
      })
      return
    }

    const hasTelegramInitData = Boolean(getTelegramWebApp()?.initData)
    if (!hasTelegramInitData && !telegram.trim() && !email.trim()) {
      setFormStatus({
        kind: 'error',
        message: 'Оставь Telegram или email для профиля и восстановления доступа.',
      })
      return
    }

    setSubmitting(true)
    setFormStatus({
      kind: 'idle',
      message: 'Оформляем пробный доступ...',
    })

    try {
      const result = await createCheckout({
        planId: selectedPlan.id,
        telegram: telegram.trim(),
        email: email.trim(),
        consent,
        initData: getTelegramWebApp()?.initData ?? '',
      })
      setFormStatus({
        kind: 'success',
        message: 'Готово: пробный доступ активирован, ссылка получена.',
      })
      setDialog({ type: 'success', checkout: result.checkout, payment: result.payment })
      setTelegram('')
      setEmail('')
      setConsent(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось выпустить доступ'

      if (error instanceof CheckoutApiError && error.checkout) {
        setDialog({ type: 'failure', checkout: error.checkout, message })
      }

      setFormStatus({ kind: 'error', message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text)]">
      <SiteHeader
        brandName={config.brandName}
        supportUrl={config.supportTelegramUrl}
        theme={theme}
        activeHref={activeNavHref}
        onToggleTheme={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
      />

      <main>
        <Hero brandName={config.brandName} />
        <FeatureSection />
        <ServicesSection />
        <PricingSection
          plans={plans}
          selectedPlanId={selectedPlanId}
          onSelectPlan={setSelectedPlanId}
        />
        <CheckoutSection
          configNotice={configNotice}
          selectedPlan={selectedPlan}
          plans={plans}
          selectedPlanId={selectedPlanId}
          onSelectPlan={setSelectedPlanId}
          telegram={telegram}
          email={email}
          consent={consent}
          submitting={submitting}
          formStatus={formStatus}
          onTelegramChange={setTelegram}
          onEmailChange={setEmail}
          onConsentChange={setConsent}
          onSubmit={handleCheckout}
        />
        <FaqSection />
      </main>

      <SiteFooter
        brandName={config.brandName}
        supportUrl={config.supportTelegramUrl}
        supportEmail={config.supportEmail}
        theme={theme}
      />

      <AccessModal
        dialog={dialog}
        supportUrl={config.supportTelegramUrl}
        onClose={() => setDialog(null)}
      />
    </div>
  )
}

function SiteHeader({
  brandName,
  supportUrl,
  theme,
  activeHref,
  onToggleTheme,
}: {
  brandName: string
  supportUrl: string
  theme: Theme
  activeHref: string
  onToggleTheme: () => void
}) {
  const ThemeIcon = theme === 'dark' ? Sun : Moon
  const logoSrc = theme === 'dark' ? logoDarkSrc : logoLightSrc

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--page-bg)_92%,transparent)] backdrop-blur-xl">
      <nav
        className="mx-auto flex h-20 w-[min(1180px,calc(100vw-32px))] items-center justify-between gap-4"
        aria-label="Основная навигация"
      >
        <a href="#top" className="flex min-w-0 items-center gap-3 no-underline">
          <img
            className="size-10 shrink-0 rounded-lg"
            src={logoSrc}
            width="40"
            height="40"
            alt=""
          />
          <span className="truncate text-3xl font-black leading-none">{brandName}</span>
        </a>

        <div className="hidden min-h-14 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] p-2 md:flex">
          {navItems.map(([label, href]) => {
            const active = href === activeHref
            return (
              <a
                className={clsx('nav-link rounded-full px-5 py-3 text-base font-extrabold no-underline transition', active && 'is-active')}
                href={href}
                key={href}
                aria-current={active ? 'page' : undefined}
              >
                {label}
              </a>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--text)] transition hover:border-[var(--line-strong)] hover:bg-[var(--surface-muted)]"
            type="button"
            onClick={onToggleTheme}
            aria-label="Переключить тему"
            title="Тема"
          >
            <ThemeIcon aria-hidden="true" className="size-5" />
          </button>
          <a
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-extrabold no-underline transition hover:border-[var(--line-strong)] hover:bg-[var(--surface-muted)]"
            href={supportUrl}
            target="_blank"
            rel="noreferrer"
          >
            <Headphones aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Поддержка</span>
          </a>
        </div>
      </nav>
    </header>
  )
}

function Hero({ brandName }: { brandName: string }) {
  return (
    <section
      id="top"
      className="hero-section relative isolate min-h-[calc(100svh-72px)] overflow-hidden border-b border-[var(--line)]"
    >
      <div className="hero-scene" aria-hidden="true" />

      <div className="hero-layout relative z-10 mx-auto grid min-h-[calc(100svh-72px)] w-[min(1180px,calc(100vw-32px))] items-center gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(390px,0.72fr)] lg:py-16">
        <div className="hero-copy max-w-4xl">
          <div className="hero-kicker">
            <Sparkles aria-hidden="true" className="size-4 text-[var(--accent-strong)]" />
            {brandName}
          </div>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-[1.04] text-[var(--text)] sm:text-6xl lg:text-7xl">
            Цифровая подписка с быстрой активацией
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-[var(--muted)] sm:text-xl">
            Оставь контакт и получи личную страницу с настройками пробного доступа.
            Платные тарифы появятся после подключения оплаты.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              className="primary-action inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-extrabold text-white no-underline shadow-[0_14px_28px_rgba(63,166,106,0.18)] transition hover:bg-[var(--accent-strong)]"
              href="#checkout"
            >
              <span>Оформить доступ</span>
              <ArrowRight aria-hidden="true" className="size-4" />
            </a>
            <a
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-5 text-sm font-extrabold no-underline transition hover:border-[var(--line-strong)] hover:bg-[var(--surface)]"
              href="#pricing"
            >
              Посмотреть тарифы
              <CircleDollarSign aria-hidden="true" className="size-4" />
            </a>
          </div>

          <div className="hero-proof mt-12 grid gap-3 sm:grid-cols-3 lg:max-w-3xl">
            {[
              ['1 клик', 'оформление на сайте'],
              ['сразу', 'личная ссылка'],
              ['30 дней', 'пробный период'],
            ].map(([value, label]) => (
              <div
                className="proof-item"
                key={value}
              >
                <div>{value}</div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="product-preview hidden lg:block" aria-hidden="true">
          <div className="preview-shell">
            <div className="preview-topbar">
              <span>{brandName}</span>
              <span>online</span>
            </div>
            <div className="preview-main">
              <div>
                <p>Текущий тариф</p>
                <strong>30 дней</strong>
              </div>
              <span className="preview-status">
                <Check aria-hidden="true" className="size-4" />
                активен
              </span>
            </div>
            <div className="preview-progress">
              <span />
            </div>
            <div className="preview-grid">
              {[
                ['30', 'дней'],
                ['100', 'ГБ'],
                ['24/7', 'помощь'],
                ['1', 'ссылка'],
              ].map(([value, label]) => (
                <div key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="preview-link">
              <span>
                <Copy aria-hidden="true" className="size-4" />
                Ссылка готова
              </span>
              <ArrowRight aria-hidden="true" className="size-4" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeatureSection() {
  return (
    <section id="features" className="feature-section border-b border-[var(--line)] py-20 sm:py-24">
      <div className="mx-auto w-[min(1180px,calc(100vw-32px))]">
        <SectionHeader
          eyebrow="Почему удобно"
          title="Покупка не уводит клиента в ручную обработку"
          text="Сайт держит весь путь оформления в одном месте: выбор тарифа, контакты, активация и личная ссылка."
        />
        <div className="feature-grid">
          {features.map((feature, index) => (
            <article
              className="feature-card"
              key={feature.title}
              data-reveal
              data-reveal-delay={index}
            >
              <div className={clsx('feature-icon', feature.tone)}>
                <feature.icon aria-hidden="true" className="size-5" />
              </div>
              <h3 className="text-lg font-black">{feature.title}</h3>
              <p className="mt-3 text-sm font-medium leading-6 text-[var(--muted)]">
                {feature.text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function ServiceArtwork({ type }: { type: ServiceArt }) {
  if (type === 'media') {
    return (
      <div className="service-art service-art-media" aria-hidden="true">
        <span className="media-play" />
      </div>
    )
  }

  if (type === 'work') {
    return (
      <div className="service-art service-art-work" aria-hidden="true">
        <SquarePen className="service-art-icon" />
      </div>
    )
  }

  if (type === 'social') {
    return (
      <div className="service-art service-art-social" aria-hidden="true">
        <MessageCircle className="service-art-icon" />
      </div>
    )
  }

  return (
    <div className="service-art service-art-travel" aria-hidden="true">
      <Plane className="service-art-icon" />
    </div>
  )
}

function ServicesSection() {
  return (
    <section id="services" className="services-section border-b border-[var(--line)] py-16 sm:py-20">
      <div className="mx-auto w-[min(1180px,calc(100vw-32px))]">
        <SectionHeader
          eyebrow="Сценарии"
          title="Для привычных задач без лишней настройки"
          text="Сервис закрывает ежедневные сценарии: рабочие кабинеты, общение, видео и путешествия."
        />
        <div className="service-grid">
          {services.map((service, index) => (
            <article
              className={clsx('service-card group transition', `tone-${index + 1}`)}
              key={service.title}
              data-reveal
              data-reveal-delay={index}
            >
              <div className="service-card-top">
                <span>{service.label}</span>
              </div>
              <ServiceArtwork type={service.art} />
              <div className="service-content">
                <h3 className="mt-2 text-xl font-black">{service.title}</h3>
                <p className="mt-3 max-w-xl font-medium leading-7 text-[var(--muted)]">
                  {service.text}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingSection({
  plans,
  selectedPlanId,
  onSelectPlan,
}: {
  plans: Plan[]
  selectedPlanId: string
  onSelectPlan: (planId: string) => void
}) {
  const visiblePlans = plans.length > 0 ? plans : fallbackPlans

  return (
    <section id="pricing" className="pricing-section border-b border-[var(--line)] py-16 sm:py-20">
      <div className="mx-auto grid w-[min(1280px,calc(100vw-32px))] gap-8 lg:grid-cols-[minmax(240px,0.32fr)_minmax(0,1fr)] lg:items-start">
        <div className="pricing-copy">
          <SectionHeader
            eyebrow="Тарифы"
            title="Выбери срок подписки"
            text="Сейчас активен пробный период на 30 дней. Платные тарифы появятся после подключения оплаты."
            compact
          />
          <div className="pricing-note" data-reveal data-reveal-delay="1">
            <BadgeCheck aria-hidden="true" className="size-5" />
            <span>Выбранный тариф сразу попадет в форму оформления.</span>
          </div>
        </div>
        <div className="plan-grid">
          {visiblePlans.map((plan, index) => {
            const unavailable = plan.id !== TRIAL_PLAN_ID
            return (
              <PriceCard
                key={plan.id}
                plan={plan}
                selected={plan.id === selectedPlanId}
                unavailable={unavailable}
                onClick={() => {
                  if (!unavailable) onSelectPlan(plan.id)
                }}
                revealDelay={index}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}

function PriceCard({
  plan,
  selected,
  unavailable,
  onClick,
  revealDelay,
}: {
  plan: Plan
  selected: boolean
  unavailable: boolean
  onClick: () => void
  revealDelay: number
}) {
  return (
    <button
      className={clsx(
        'plan-card',
        selected && 'is-selected',
        unavailable && 'is-unavailable',
        plan.popular && 'is-popular',
      )}
      type="button"
      onClick={onClick}
      disabled={unavailable}
      aria-pressed={selected}
      aria-disabled={unavailable}
      data-reveal
      data-reveal-delay={revealDelay}
    >
      {plan.popular ? (
        <span className="plan-badge">
          <Sparkles aria-hidden="true" className="size-3.5" />
          Популярный
        </span>
      ) : null}
      {selected ? (
        <span className="plan-check">
          <Check aria-hidden="true" className="size-4" />
        </span>
      ) : null}
      {unavailable ? <span className="plan-lock">Скоро</span> : null}
      <div className="plan-head">
        <div className="plan-title">
          <div>{plan.name}</div>
          <span>{plan.period}</span>
        </div>
      </div>
      <div className="plan-price">
        <strong>{formatPrice(plan.priceRub)}</strong>
        {plan.oldPriceRub ? (
          <div>
            вместо <span className="line-through">{formatPrice(plan.oldPriceRub)}</span>
          </div>
        ) : null}
      </div>
      <p className="plan-text">
        {plan.highlight || 'Цифровая подписка'}
      </p>
      <div className="plan-meta">
        <MetaPill>{trafficLabel(plan)}</MetaPill>
      </div>
    </button>
  )
}

function CheckoutSection({
  configNotice,
  selectedPlan,
  plans,
  selectedPlanId,
  onSelectPlan,
  telegram,
  email,
  consent,
  submitting,
  formStatus,
  onTelegramChange,
  onEmailChange,
  onConsentChange,
  onSubmit,
}: {
  configNotice: string
  selectedPlan?: Plan
  plans: Plan[]
  selectedPlanId: string
  onSelectPlan: (planId: string) => void
  telegram: string
  email: string
  consent: boolean
  submitting: boolean
  formStatus: FormStatus
  onTelegramChange: (value: string) => void
  onEmailChange: (value: string) => void
  onConsentChange: (value: boolean) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  const visiblePlans = plans.length > 0 ? plans : fallbackPlans

  return (
    <section id="checkout" className="checkout-section border-b border-[var(--line)] py-16 sm:py-20">
      <div className="checkout-layout mx-auto w-[min(1180px,calc(100vw-32px))]">
        <div className="checkout-intro">
          <div>
            <SectionHeader
              eyebrow="Оформление"
              title="Получить пробный доступ"
              text="Укажи Telegram или email. Ссылка появится на этой странице сразу после оформления пробного периода."
              compact
            />
          </div>
        </div>

        <form
          className="checkout-workspace"
          onSubmit={onSubmit}
          data-reveal
          data-reveal-delay="2"
        >
          {configNotice ? (
            <div className="notice-card mb-4 rounded-lg border border-[color-mix(in_srgb,var(--amber)_42%,var(--line))] bg-[var(--amber-soft)] p-3 text-sm font-bold leading-6">
              {configNotice}
            </div>
          ) : null}

          <div className="checkout-grid">
            <aside className="checkout-receipt" aria-label="Выбранный тариф">
              <div className="receipt-orbit" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="receipt-top">
                <span>Пробный период</span>
                <span>
                  <BadgeCheck aria-hidden="true" className="size-4" />
                  готов к оформлению
                </span>
              </div>
              <div className="receipt-plan">
                <div>
                  <strong>{selectedPlan?.name || 'Загрузка'}</strong>
                  <span>{selectedPlan ? `${selectedPlan.period} · ${trafficLabel(selectedPlan)}` : ''}</span>
                </div>
                <b>{selectedPlan ? formatPrice(selectedPlan.priceRub) : '...'}</b>
              </div>
              <div className="receipt-divider" />
              <div className="receipt-details">
                <div>
                  <span>Трафик</span>
                  <strong>{selectedPlan ? trafficLabel(selectedPlan) : '...'}</strong>
                </div>
                <div>
                  <span>Период</span>
                  <strong>{selectedPlan?.period || '...'}</strong>
                </div>
              </div>
              <div className="receipt-status">
                <Check aria-hidden="true" className="size-4" />
                Пробный период оформится без оплаты
              </div>
            </aside>

            <div className="checkout-form">
              <div className="checkout-form-head">
                <div>
                  <span>Форма заказа</span>
                  <strong>Контакт для доступа</strong>
                </div>
                <ArrowRight aria-hidden="true" className="size-5" />
              </div>
              <div className="grid gap-4">
                <div className="checkout-field grid gap-2 text-sm font-black">
                  Тариф
                  <PlanSelect plans={visiblePlans} value={selectedPlanId} onChange={onSelectPlan} />
                </div>

                <div className="checkout-contact-grid grid gap-4 sm:grid-cols-2">
                  <label className="checkout-field grid gap-2 text-sm font-black">
                    Telegram
                    <input
                      className={fieldClass}
                      value={telegram}
                      onChange={(event) => onTelegramChange(event.currentTarget.value)}
                      type="text"
                      name="telegram"
                      placeholder="@username"
                      autoComplete="username"
                    />
                  </label>
                  <label className="checkout-field grid gap-2 text-sm font-black">
                    Email
                    <input
                      className={fieldClass}
                      value={email}
                      onChange={(event) => onEmailChange(event.currentTarget.value)}
                      type="email"
                      name="email"
                      placeholder="name@example.com"
                      autoComplete="email"
                    />
                  </label>
                </div>

                <label className="checkout-consent flex items-start gap-3 text-sm font-bold leading-6 text-[var(--muted)]">
                  <input
                    className="mt-1 size-4 rounded border-[var(--line)] accent-[var(--accent)]"
                    checked={consent}
                    onChange={(event) => onConsentChange(event.currentTarget.checked)}
                    type="checkbox"
                    required
                  />
                  <span>Согласен на оформление доступа и обработку данных для выдачи подписки.</span>
                </label>

                <button
                  className="primary-action inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-black text-white transition hover:bg-[var(--accent-strong)]"
                  type="submit"
                  disabled={submitting}
                >
                  <span>{submitting ? 'Оформляем доступ...' : 'Получить пробный доступ'}</span>
                  <ArrowRight aria-hidden="true" className="size-4" />
                </button>

                <p
                  className={clsx(
                    'min-h-6 text-sm font-bold',
                    formStatus.kind === 'error' && 'text-[var(--rose)]',
                    formStatus.kind === 'success' && 'text-[var(--teal)]',
                    formStatus.kind === 'idle' && 'text-[var(--muted)]',
                  )}
                  role="status"
                  aria-live="polite"
                >
                  {formStatus.message}
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </section>
  )
}

function FaqSection() {
  return (
    <section className="faq-section py-16 sm:py-20">
      <div className="mx-auto w-[min(1180px,calc(100vw-32px))]">
        <SectionHeader
          eyebrow="FAQ"
          title="Коротко о важном"
          text="Ответы на вопросы, которые чаще всего возникают перед оформлением."
        />
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {faqs.map((faq, index) => (
            <details
              className="faq-card group self-start p-0"
              key={faq.question}
              data-reveal
              data-reveal-delay={index}
            >
              <summary className="flex min-h-22 cursor-pointer list-none items-center justify-between gap-4 p-5 font-black">
                {faq.question}
                <ChevronDown
                  aria-hidden="true"
                  className="size-5 shrink-0 text-[var(--muted)] transition group-open:rotate-180"
                />
              </summary>
              <p className="px-5 pb-5 text-sm font-medium leading-6 text-[var(--muted)]">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function useScrollReveal() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))

    if (prefersReducedMotion.matches) {
      items.forEach((item) => item.setAttribute('data-revealed', 'true'))
      return
    }

    document.documentElement.classList.add('reveal-ready')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.setAttribute('data-revealed', 'true')
          observer.unobserve(entry.target)
        })
      },
      {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.14,
      },
    )

    items.forEach((item) => observer.observe(item))

    return () => {
      observer.disconnect()
      document.documentElement.classList.remove('reveal-ready')
    }
  }, [])
}

function useSectionFocus() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const desktopViewport = window.matchMedia('(min-width: 900px) and (pointer: fine)')
    const sections = Array.from(document.querySelectorAll<HTMLElement>('main > section'))
    let animationFrame = 0

    if (!sections.length || prefersReducedMotion.matches || !desktopViewport.matches) return

    function setFocusedSection() {
      animationFrame = 0

      const headerHeight = document.querySelector('header')?.getBoundingClientRect().height || 72
      const visibleHeight = Math.max(1, window.innerHeight - headerHeight)
      const viewportCenter = window.scrollY + headerHeight + visibleHeight / 2

      const activeIndex = sections.reduce(
        (best, section, index) => {
          const rect = section.getBoundingClientRect()
          const sectionCenter = window.scrollY + rect.top + rect.height / 2
          const distance = Math.abs(sectionCenter - viewportCenter)
          return distance < best.distance ? { index, distance } : best
        },
        { index: 0, distance: Number.POSITIVE_INFINITY },
      ).index

      sections.forEach((section, index) => {
        section.dataset.focus = index === activeIndex ? 'active' : 'muted'
      })
    }

    function scheduleFocusUpdate() {
      if (animationFrame) return
      animationFrame = window.requestAnimationFrame(setFocusedSection)
    }

    document.documentElement.classList.add('section-focus-ready')
    setFocusedSection()

    window.addEventListener('scroll', scheduleFocusUpdate, { passive: true })
    window.addEventListener('resize', scheduleFocusUpdate)

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame)
      }
      sections.forEach((section) => {
        delete section.dataset.focus
      })
      document.documentElement.classList.remove('section-focus-ready')
      window.removeEventListener('scroll', scheduleFocusUpdate)
      window.removeEventListener('resize', scheduleFocusUpdate)
    }
  }, [])
}

function useActiveNavHref() {
  const [activeHref, setActiveHref] = useState<string>(navItems[0][1])

  useEffect(() => {
    let animationFrame = 0

    function getHeaderHeight() {
      return document.querySelector('header')?.getBoundingClientRect().height || 72
    }

    function updateActiveHref() {
      animationFrame = 0
      const headerHeight = getHeaderHeight()
      let nextHref: string = navItems[0][1]
      let maxVisibleArea = 0

      for (const [, href] of navItems) {
        const section = document.getElementById(href.slice(1))
        if (!section) continue

        const rect = section.getBoundingClientRect()
        const visibleTop = Math.max(rect.top, headerHeight)
        const visibleBottom = Math.min(rect.bottom, window.innerHeight)
        const visibleArea = Math.max(0, visibleBottom - visibleTop)

        if (visibleArea > maxVisibleArea) {
          maxVisibleArea = visibleArea
          nextHref = href
        }
      }

      setActiveHref((currentHref) => (currentHref === nextHref ? currentHref : nextHref))
    }

    function scheduleActiveUpdate() {
      if (animationFrame) return
      animationFrame = window.requestAnimationFrame(updateActiveHref)
    }

    updateActiveHref()

    window.addEventListener('scroll', scheduleActiveUpdate, { passive: true })
    window.addEventListener('resize', scheduleActiveUpdate)
    window.addEventListener('hashchange', scheduleActiveUpdate)

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame)
      }
      window.removeEventListener('scroll', scheduleActiveUpdate)
      window.removeEventListener('resize', scheduleActiveUpdate)
      window.removeEventListener('hashchange', scheduleActiveUpdate)
    }
  }, [])

  return activeHref
}

function useMagneticScroll() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const desktopViewport = window.matchMedia('(min-width: 900px) and (pointer: fine)')
    if (prefersReducedMotion.matches || !desktopViewport.matches) return

    const scrollKeys = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '])
    let animationFrame = 0
    let isAnimating = false
    let touchStartY = 0
    let touchHandled = false

    function cancelAnimation() {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame)
        animationFrame = 0
      }
      document.documentElement.classList.remove('magnetic-scrolling')
      isAnimating = false
    }

    function getScrollTargets() {
      return Array.from(document.querySelectorAll<HTMLElement>('main > section, footer'))
    }

    function getHeaderHeight() {
      return document.querySelector('header')?.getBoundingClientRect().height || 72
    }

    function hasOpenDialog() {
      return Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'))
    }

    function isInteractiveTarget(target: EventTarget | null) {
      if (!(target instanceof Element)) return false
      return Boolean(
        target.closest('input, textarea, select, [contenteditable="true"], [data-plan-select]'),
      )
    }

    function getTargetScrollPosition(targetIndex: number, currentTargets: HTMLElement[]) {
      const targetElement = currentTargets[targetIndex]
      const headerHeight = getHeaderHeight()
      const visibleHeight = Math.max(1, window.innerHeight - headerHeight)
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      const rect = targetElement.getBoundingClientRect()
      const sectionCenter = window.scrollY + rect.top + rect.height / 2
      const centeredTarget = sectionCenter - headerHeight - visibleHeight / 2
      let target =
        targetIndex === 0
          ? 0
          : targetIndex === currentTargets.length - 1
            ? maxScroll
            : clamp(centeredTarget, 0, maxScroll)

      if (targetIndex < currentTargets.length - 1 && target >= maxScroll - 2) {
        target = Math.max(0, maxScroll - Math.min(visibleHeight * 0.62, 520))
      }

      return Math.round(target)
    }

    function goToRelativeSection(direction: number) {
      const targets = getScrollTargets()
      if (!targets.length) return

      const positions = targets.map((_, index) => getTargetScrollPosition(index, targets))
      const currentY = window.scrollY
      const threshold = clamp(window.innerHeight * 0.08, 56, 120)
      let targetIndex = -1

      if (direction > 0) {
        targetIndex = positions.findIndex((position) => position > currentY + threshold)
      } else {
        for (let index = positions.length - 1; index >= 0; index -= 1) {
          if (positions[index] < currentY - threshold) {
            targetIndex = index
            break
          }
        }
      }

      if (targetIndex === -1) return
      goToTarget(targetIndex, targets)
    }

    function goToTarget(index: number, currentTargets = getScrollTargets()) {
      if (!currentTargets.length) return

      const targetIndex = clamp(index, 0, currentTargets.length - 1)
      const target = getTargetScrollPosition(targetIndex, currentTargets)
      if (Math.abs(target - window.scrollY) < 4) return
      animateScrollTo(target)
    }

    function animateScrollTo(target: number) {
      const start = window.scrollY
      const distance = target - start
      const duration = clamp(Math.abs(distance) * 1.05, 920, 1450)
      const startTime = performance.now()

      isAnimating = true
      document.documentElement.classList.add('magnetic-scrolling')

      function frame(now: number) {
        const elapsed = now - startTime
        const progress = Math.min(1, elapsed / duration)
        const eased = easeInOutCubic(progress)

        window.scrollTo(0, start + distance * eased)

        if (progress < 1 && isAnimating) {
          animationFrame = window.requestAnimationFrame(frame)
          return
        }

        document.documentElement.classList.remove('magnetic-scrolling')
        isAnimating = false
        animationFrame = 0
      }

      animationFrame = window.requestAnimationFrame(frame)
    }

    function onWheel(event: WheelEvent) {
      if (hasOpenDialog()) return
      if (event.ctrlKey || isInteractiveTarget(event.target)) return

      const verticalDelta = Math.abs(event.deltaY)
      if (verticalDelta < 1 || verticalDelta < Math.abs(event.deltaX)) return

      event.preventDefault()
      if (isAnimating) return

      goToRelativeSection(event.deltaY > 0 ? 1 : -1)
    }

    function onTouchStart(event: TouchEvent) {
      if (hasOpenDialog()) return

      touchStartY = event.touches[0]?.clientY || 0
      touchHandled = false
    }

    function onTouchMove(event: TouchEvent) {
      if (hasOpenDialog()) return
      if (isInteractiveTarget(event.target)) return

      if (isAnimating) {
        event.preventDefault()
        return
      }

      if (touchHandled) {
        event.preventDefault()
        return
      }

      const touchY = event.touches[0]?.clientY || touchStartY
      const deltaY = touchStartY - touchY
      if (Math.abs(deltaY) < 12) return

      event.preventDefault()
      touchHandled = true
      goToRelativeSection(deltaY > 0 ? 1 : -1)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (hasOpenDialog()) return
      if (!scrollKeys.has(event.key)) return
      if (event.altKey || event.ctrlKey || event.metaKey || isInteractiveTarget(document.activeElement)) {
        return
      }

      event.preventDefault()
      if (isAnimating) return

      const targets = getScrollTargets()
      if (!targets.length) return

      if (event.key === 'Home') {
        goToTarget(0, targets)
        return
      }
      if (event.key === 'End') {
        goToTarget(targets.length - 1, targets)
        return
      }

      const direction =
        event.key === 'ArrowUp' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)
          ? -1
          : 1
      goToRelativeSection(direction)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('keydown', onKeyDown)

    return () => {
      cancelAnimation()
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])
}

function SiteFooter({
  brandName,
  supportUrl,
  supportEmail,
  theme,
}: {
  brandName: string
  supportUrl: string
  supportEmail: string
  theme: Theme
}) {
  const logoSrc = theme === 'dark' ? logoDarkSrc : logoLightSrc

  return (
    <footer className="border-t border-[var(--line)] bg-[var(--surface)] py-10">
      <div className="mx-auto flex w-[min(1180px,calc(100vw-32px))] flex-col justify-between gap-6 md:flex-row md:items-start">
        <div className="max-w-md">
          <a href="#top" className="flex items-center gap-3 no-underline">
            <img
              className="size-10 rounded-lg"
              src={logoSrc}
              width="40"
              height="40"
              alt=""
            />
            <span className="font-black">{brandName}</span>
          </a>
          <p className="mt-3 text-sm font-medium leading-6 text-[var(--muted)]">
            Стабильный доступ для работы, общения, поездок и ежедневных задач.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-bold text-[var(--muted)]">
          <a className="no-underline hover:text-[var(--text)]" href="#pricing">
            Тарифы
          </a>
          <a className="no-underline hover:text-[var(--text)]" href="#checkout">
            Оформить
          </a>
          <a
            className="no-underline hover:text-[var(--text)]"
            href={supportUrl}
            target="_blank"
            rel="noreferrer"
          >
            Telegram
          </a>
          <a className="no-underline hover:text-[var(--text)]" href={`mailto:${supportEmail}`}>
            Email
          </a>
        </div>
      </div>
    </footer>
  )
}

function PlanSelect({
  plans,
  value,
  onChange,
}: {
  plans: Plan[]
  value: string
  onChange: (planId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedPlan = plans.find((plan) => plan.id === value) || plans[0]
  const availablePlans = plans.filter((plan) => plan.id === TRIAL_PLAN_ID)

  useEffect(() => {
    if (!open) return

    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  if (!selectedPlan) {
    return (
      <div className="h-16 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)]" />
    )
  }

  function selectPlan(plan: Plan) {
    if (plan.id !== TRIAL_PLAN_ID) return
    onChange(plan.id)
    setOpen(false)
  }

  function moveSelection(direction: number) {
    if (!availablePlans.length) return
    const currentIndex = Math.max(
      0,
      availablePlans.findIndex((plan) => plan.id === selectedPlan.id),
    )
    const nextIndex = clamp(currentIndex + direction, 0, availablePlans.length - 1)
    const nextPlan = availablePlans[nextIndex]
    if (nextPlan) onChange(nextPlan.id)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Escape') return

    event.preventDefault()
    event.stopPropagation()

    if (event.key === 'Escape') {
      setOpen(false)
      return
    }

    setOpen(true)
    moveSelection(event.key === 'ArrowDown' ? 1 : -1)
  }

  return (
    <div className="plan-select relative" data-plan-select ref={rootRef} onKeyDown={handleKeyDown}>
      <button
        className={clsx(
          'plan-select-button flex min-h-16 w-full items-center justify-between gap-4 rounded-lg border bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] px-4 py-3 text-left transition',
          'hover:border-[var(--line-strong)] hover:shadow-[0_14px_28px_rgba(23,38,27,0.08)]',
          'focus:outline-none focus:ring-4 focus:ring-[var(--accent-soft)]',
          open
            ? 'border-[color-mix(in_srgb,var(--accent)_54%,var(--line))] ring-4 ring-[var(--accent-soft)]'
            : 'border-[var(--line)]',
        )}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <CircleDollarSign aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-black">
              {selectedPlan.name} · {formatPrice(selectedPlan.priceRub)}
            </span>
            <span className="mt-1 block truncate text-xs font-bold text-[var(--muted)]">
              {selectedPlan.period} · {trafficLabel(selectedPlan)}
            </span>
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={clsx('size-5 shrink-0 text-[var(--muted)] transition', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div
          className="plan-select-menu absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[0_22px_54px_rgba(23,38,27,0.14)]"
          role="listbox"
        >
          <div className="grid max-h-80 gap-1 overflow-y-auto">
            {plans.map((plan) => {
              const selected = plan.id === selectedPlan.id
              const unavailable = plan.id !== TRIAL_PLAN_ID
              return (
                <button
                  className={clsx(
                    'plan-select-option flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition',
                    selected
                      ? 'bg-[var(--accent-soft)] text-[var(--text)]'
                      : 'bg-transparent hover:bg-[var(--surface-muted)]',
                  )}
                  type="button"
                  key={plan.id}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={unavailable}
                  disabled={unavailable}
                  onClick={() => selectPlan(plan)}
                >
                  <span className="min-w-0">
                    <span className="font-black">{plan.name}</span>
                    <span className="mt-1 block text-xs font-bold text-[var(--muted)]">
                      {plan.period} · {trafficLabel(plan)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-base font-black">
                      {unavailable ? 'Скоро' : formatPrice(plan.priceRub)}
                    </span>
                    {selected ? (
                      <span className="grid size-7 place-items-center rounded-full bg-[var(--surface)] text-[var(--accent-strong)]">
                        <Check aria-hidden="true" className="size-4" />
                      </span>
                    ) : null}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function AccessModal({
  dialog,
  supportUrl,
  onClose,
}: {
  dialog: AccessDialog | null
  supportUrl: string
  onClose: () => void
}) {
  if (!dialog) return null

  const checkout = dialog.checkout
  const success = dialog.type === 'success' && Boolean(checkout?.subscriptionUrl)
  const message =
    dialog.type === 'success'
      ? dialog.payment?.message || 'Доступ активирован. Ссылка подписки готова.'
      : dialog.message

  async function copySubscription() {
    if (!checkout?.subscriptionUrl) return
    await navigator.clipboard?.writeText(checkout.subscriptionUrl).catch(() => undefined)
  }

  return (
    <div
      className="dialog-backdrop fixed inset-0 z-50 grid place-items-center px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="access-dialog-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-xl rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <div className="flex items-center justify-between gap-4">
          <h2 id="access-dialog-title" className="text-2xl font-black">
            {success ? 'Доступ готов' : 'Выдача не прошла'}
          </h2>
          <button
            className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] transition hover:bg-[var(--surface-muted)]"
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <p className="mt-4 font-medium leading-7 text-[var(--muted)]">{message}</p>

        {checkout ? (
          <div className="mt-5 grid gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] p-4 text-sm font-bold">
            <div>
              <span className="text-[var(--muted)]">Тариф: </span>
              {checkout.planName} ({formatPrice(checkout.priceRub)})
            </div>
            <div>
              <span className="text-[var(--muted)]">Статус: </span>
              {statusLabel(checkout.status)}
            </div>
          </div>
        ) : null}

        {success && checkout?.subscriptionUrl ? (
          <div className="mt-5 rounded-lg border border-[color-mix(in_srgb,var(--accent)_38%,var(--line))] bg-[var(--accent-soft)] p-4">
            <div className="text-xs font-black uppercase text-[var(--muted)]">
              Страница подписки
            </div>
            <a
              className="mt-2 block break-words font-black text-[var(--accent-strong)]"
              href={checkout.subscriptionUrl}
              target="_blank"
              rel="noreferrer"
            >
              {checkout.subscriptionUrl}
            </a>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {success && checkout?.subscriptionUrl ? (
            <>
              <a
                className="primary-action inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 text-sm font-black text-white no-underline"
                href={checkout.subscriptionUrl}
                target="_blank"
                rel="noreferrer"
              >
                <span>Открыть подписку</span>
                <ArrowRight aria-hidden="true" className="size-4" />
              </a>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-black"
                type="button"
                onClick={copySubscription}
              >
                Скопировать
                <Copy aria-hidden="true" className="size-4" />
              </button>
            </>
          ) : (
            <a
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--surface-strong)] px-4 text-sm font-black text-[var(--page-bg)] no-underline"
              href={supportUrl}
              target="_blank"
              rel="noreferrer"
            >
              Написать в поддержку
              <Mail aria-hidden="true" className="size-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionHeader({
  eyebrow,
  title,
  text,
  compact = false,
}: {
  eyebrow: string
  title: string
  text: string
  compact?: boolean
}) {
  return (
    <div className={clsx('max-w-3xl', compact ? 'mb-0' : 'mb-8')} data-reveal>
      <p className="mb-3 text-sm font-black uppercase text-[var(--accent-strong)]">
        {eyebrow}
      </p>
      <h2 className="text-3xl font-black leading-tight sm:text-4xl">{title}</h2>
      <p className="mt-4 max-w-2xl font-medium leading-7 text-[var(--muted)]">{text}</p>
    </div>
  )
}

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--line)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-black text-[var(--muted)]">
      {children}
    </span>
  )
}

function getInitialTheme(): Theme {
  const saved = window.localStorage.getItem('site-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getConfigNotice(config: SiteConfig) {
  if (!config.checkoutEnabled) {
    return 'Онлайн-оформление временно недоступно. Напишите в поддержку, чтобы получить доступ.'
  }
  if (!config.provisioningEnabled) {
    return 'Автоматическая выдача временно недоступна. Напишите в поддержку, и мы поможем оформить доступ.'
  }
  return ''
}

function formatPrice(value: number) {
  if (!value) return '0 ₽'
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
}

function trafficLabel(plan: Plan) {
  return plan.trafficLimitGb > 0 ? `${plan.trafficLimitGb} ГБ` : 'Безлимит'
}

function statusLabel(status: string) {
  return (
    {
      paid: 'оплата подтверждена',
      provisioned: 'доступ выдан',
      failed: 'ошибка выдачи',
    }[status] || status
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function easeInOutCubic(value: number) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2
}

export default App
