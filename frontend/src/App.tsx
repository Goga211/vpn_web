import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  CircleDollarSign,
  Copy,
  Globe2,
  Headphones,
  Laptop,
  Mail,
  Moon,
  PlugZap,
  Router,
  Smartphone,
  Sparkles,
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

const defaultConfig: SiteConfig = {
  brandName: 'NorthVPN',
  supportTelegramUrl: 'https://t.me/your_vpn_support',
  supportEmail: 'support@example.com',
  paymentProvider: 'online',
  checkoutEnabled: true,
  provisioningEnabled: false,
}

const logoSrc = `${import.meta.env.BASE_URL}assets/logo.svg`

const fallbackPlans: Plan[] = [
  {
    id: 'trial',
    name: 'Пробный',
    period: '3 дня',
    months: 0,
    priceRub: 0,
    trafficLimitGb: 100,
    devices: 2,
    highlight: 'Для проверки скорости',
    provisionDuration: '72h0m0s',
  },
  {
    id: 'month',
    name: '1 месяц',
    period: '30 дней',
    months: 1,
    priceRub: 299,
    trafficLimitGb: 0,
    devices: 5,
    highlight: 'Гибкий старт',
    provisionDuration: '720h0m0s',
  },
  {
    id: 'quarter',
    name: '3 месяца',
    period: '90 дней',
    months: 3,
    priceRub: 799,
    oldPriceRub: 897,
    trafficLimitGb: 0,
    devices: 5,
    popular: true,
    highlight: 'Оптимально на каждый день',
    provisionDuration: '2160h0m0s',
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
    highlight: 'Для семьи и нескольких устройств',
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
  ['Как оформить', '#process'],
  ['Сценарии', '#services'],
  ['Тарифы', '#pricing'],
  ['Оформить', '#checkout'],
]

const features: Array<{
  title: string
  text: string
  icon: LucideIcon
  tone: string
}> = [
  {
    title: 'Моментальная выдача',
    text: 'После подтверждения оплаты личная ссылка подписки появляется прямо на сайте.',
    icon: Zap,
    tone: 'text-[var(--accent-strong)] bg-[var(--accent-soft)]',
  },
  {
    title: 'Лимиты без сюрпризов',
    text: 'Срок, трафик и количество устройств берутся из выбранного тарифа автоматически.',
    icon: BadgeCheck,
    tone: 'text-[var(--teal)] bg-[var(--teal-soft)]',
  },
  {
    title: 'Устройства рядом',
    text: 'Телефон, ноутбук, планшет, ТВ-приставка или роутер работают от одной подписки.',
    icon: Laptop,
    tone: 'text-[var(--amber)] bg-[var(--amber-soft)]',
  },
  {
    title: 'Поддержка в Telegram',
    text: 'Если выдача не прошла, поддержка быстро найдет оформление и доведет подключение.',
    icon: Headphones,
    tone: 'text-[var(--rose)] bg-[var(--rose-soft)]',
  },
]

const services: Array<{ label: string; title: string; text: string; icon: LucideIcon }> = [
  {
    label: 'Media',
    title: 'Видео и стриминг',
    text: 'Стабильный маршрут для видео, трансляций и обучающих платформ.',
    icon: Globe2,
  },
  {
    label: 'Social',
    title: 'Соцсети и мессенджеры',
    text: 'Привычный доступ на телефоне и десктопе без ручной настройки под каждый сервис.',
    icon: Smartphone,
  },
  {
    label: 'Work',
    title: 'Рабочие инструменты',
    text: 'Почта, AI-сервисы, облака, таск-трекеры и ежедневные рабочие кабинеты.',
    icon: PlugZap,
  },
  {
    label: 'Travel',
    title: 'Поездки',
    text: 'За рубежом проще сохранить привычные сайты, подписки и личные кабинеты.',
    icon: Router,
  },
]

const faqs = [
  {
    question: 'Когда я получу доступ?',
    answer:
      'Обычно сразу после подтверждения оплаты. Сайт покажет личную ссылку подписки прямо в браузере.',
  },
  {
    question: 'Что делать со ссылкой?',
    answer:
      'Открой ее на нужном устройстве и импортируй подписку в совместимое VPN-приложение.',
  },
  {
    question: 'Что если автоматическая выдача недоступна?',
    answer:
      'Оформление сохранится, а поддержка поможет выдать доступ вручную по выбранному тарифу.',
  },
]

const fieldClass =
  'h-12 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3.5 text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]'

const textAreaClass =
  'min-h-24 w-full resize-y rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3.5 py-3 text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]'

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [config, setConfig] = useState<SiteConfig>(defaultConfig)
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState('quarter')
  const [telegram, setTelegram] = useState('')
  const [email, setEmail] = useState('')
  const [contact, setContact] = useState('')
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

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('vpn-theme', theme)
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
        setConfig({ ...defaultConfig, ...configResult.value })
        document.title = `${configResult.value.brandName || defaultConfig.brandName} — стабильный VPN`
      }

      const loadedPlans =
        plansResult.status === 'fulfilled' && Array.isArray(plansResult.value.plans)
          ? plansResult.value.plans
          : fallbackPlans
      setPlans(loadedPlans)

      const preferredPlan = loadedPlans.find((plan) => plan.popular) || loadedPlans[0]
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

    if (!telegram.trim() && !email.trim()) {
      setFormStatus({
        kind: 'error',
        message: 'Оставь Telegram или email для профиля и восстановления доступа.',
      })
      return
    }

    setSubmitting(true)
    setFormStatus({
      kind: 'idle',
      message: 'Проверяем оплату и активируем подписку...',
    })

    try {
      const result = await createCheckout({
        planId: selectedPlan.id,
        telegram: telegram.trim(),
        email: email.trim(),
        contact: contact.trim(),
        consent,
      })
      setFormStatus({
        kind: 'success',
        message: 'Готово: доступ активирован, ссылка подписки получена.',
      })
      setDialog({ type: 'success', checkout: result.checkout, payment: result.payment })
      setTelegram('')
      setEmail('')
      setContact('')
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
        onToggleTheme={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
      />

      <main>
        <Hero brandName={config.brandName} />
        <ProcessSection />
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
          contact={contact}
          consent={consent}
          submitting={submitting}
          formStatus={formStatus}
          onTelegramChange={setTelegram}
          onEmailChange={setEmail}
          onContactChange={setContact}
          onConsentChange={setConsent}
          onSubmit={handleCheckout}
        />
        <FaqSection />
      </main>

      <SiteFooter
        brandName={config.brandName}
        supportUrl={config.supportTelegramUrl}
        supportEmail={config.supportEmail}
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
  onToggleTheme,
}: {
  brandName: string
  supportUrl: string
  theme: Theme
  onToggleTheme: () => void
}) {
  const ThemeIcon = theme === 'dark' ? Sun : Moon

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--page-bg)_92%,transparent)] backdrop-blur-xl">
      <nav
        className="mx-auto flex h-18 w-[min(1180px,calc(100vw-32px))] items-center justify-between gap-4"
        aria-label="Основная навигация"
      >
        <a href="#top" className="flex min-w-0 items-center gap-3 no-underline">
          <img
            className="size-10 shrink-0 rounded-lg shadow-[var(--shadow)]"
            src={logoSrc}
            width="40"
            height="40"
            alt=""
          />
          <span className="truncate text-base font-black">{brandName}</span>
        </a>

        <div className="hidden items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] p-1 md:flex">
          {navItems.map(([label, href]) => (
            <a
              className="rounded-full px-3 py-2 text-sm font-bold text-[var(--muted)] no-underline transition hover:bg-[var(--accent-soft)] hover:text-[var(--text)]"
              href={href}
              key={href}
            >
              {label}
            </a>
          ))}
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
      className="relative isolate min-h-[calc(100svh-72px)] overflow-hidden border-b border-[var(--line)]"
    >
      <div className="hero-scene" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-72px)] w-[min(1180px,calc(100vw-32px))] flex-col justify-center py-10 sm:py-14 lg:py-16">
        <div className="max-w-4xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-extrabold text-[var(--muted)] shadow-[var(--shadow)]">
            <Sparkles aria-hidden="true" className="size-4 text-[var(--accent-strong)]" />
            {brandName}
          </div>
          <h1 className="max-w-4xl text-4xl font-black leading-[1.02] text-[var(--text)] sm:text-6xl lg:text-7xl">
            VPN-подписка с мгновенной выдачей
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-[var(--muted)] sm:text-xl">
            Выбери тариф, оплати доступ и сразу получи личную страницу подписки
            для телефона, ноутбука, планшета или роутера.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              className="primary-action inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-black text-white no-underline transition hover:bg-[var(--accent-strong)]"
              href="#checkout"
            >
              Оформить доступ
              <ArrowRight aria-hidden="true" className="size-4" />
            </a>
            <a
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-5 text-sm font-black no-underline transition hover:border-[var(--line-strong)] hover:bg-[var(--surface-muted)]"
              href="#pricing"
            >
              Посмотреть тарифы
              <CircleDollarSign aria-hidden="true" className="size-4" />
            </a>
          </div>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-3 lg:max-w-3xl">
          {[
            ['1 клик', 'оформление на сайте'],
            ['сразу', 'ссылка на подписку'],
            ['до 10', 'устройств на тарифе'],
          ].map(([value, label]) => (
            <div
              className="rounded-lg border border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_86%,transparent)] p-4 backdrop-blur-xl"
              key={value}
            >
              <div className="text-xl font-black">{value}</div>
              <div className="mt-1 text-sm font-semibold text-[var(--muted)]">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProcessSection() {
  const steps = [
    {
      number: '01',
      title: 'Выбираешь тариф',
      text: 'Сначала клиент выбирает срок подписки, цену, лимит трафика и количество устройств.',
      icon: CircleDollarSign,
      tone: 'text-[var(--accent-strong)] bg-[var(--accent-soft)]',
    },
    {
      number: '02',
      title: 'Оставляешь контакт',
      text: 'Достаточно Telegram или email. По нему можно найти оформление и восстановить доступ.',
      icon: Mail,
      tone: 'text-[var(--teal)] bg-[var(--teal-soft)]',
    },
    {
      number: '03',
      title: 'Оплата подтверждается',
      text: 'После подтверждения сайт фиксирует заказ и запускает выдачу VPN-профиля.',
      icon: BadgeCheck,
      tone: 'text-[var(--amber)] bg-[var(--amber-soft)]',
    },
    {
      number: '04',
      title: 'Ссылка появляется на сайте',
      text: 'Личная страница подписки открывается в браузере сразу после готовности доступа.',
      icon: Copy,
      tone: 'text-[var(--rose)] bg-[var(--rose-soft)]',
    },
  ]

  return (
    <section id="process" className="process-section border-b border-[var(--line)] bg-[var(--surface)]">
      <div className="mx-auto grid min-h-[calc(100svh-72px)] w-[min(1180px,calc(100vw-32px))] gap-10 py-16 lg:grid-cols-[minmax(0,0.82fr)_minmax(420px,0.9fr)] lg:items-center lg:py-20">
        <div>
          <div data-reveal>
            <p className="mb-3 text-sm font-black uppercase text-[var(--accent-strong)]">
              Как оформляется
            </p>
            <h2 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
              От выбора тарифа до готовой ссылки без ручного ожидания
            </h2>
            <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-[var(--muted)]">
              Клиент проходит понятный путь на сайте: выбирает тариф, оставляет контакт,
              подтверждает оплату и получает страницу подписки прямо в браузере.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ['1 форма', 'тариф, Telegram или email'],
              ['4 шага', 'весь процесс прозрачен'],
              ['сразу', 'ссылка после выдачи'],
            ].map(([value, label], index) => (
              <div
                className="rounded-lg border border-[var(--line)] bg-[var(--page-bg)] p-4"
                key={value}
                data-reveal
                data-reveal-delay={index}
              >
                <div className="text-xl font-black">{value}</div>
                <div className="mt-1 text-sm font-semibold text-[var(--muted)]">{label}</div>
              </div>
            ))}
          </div>

          <a
            className="primary-action mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-black text-white no-underline transition hover:bg-[var(--accent-strong)]"
            href="#pricing"
            data-reveal
            data-reveal-delay="2"
          >
            Выбрать тариф
            <ArrowRight aria-hidden="true" className="size-4" />
          </a>
        </div>

        <div className="grid gap-3">
          {steps.map((step, index) => (
            <article
              className="process-step grid gap-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[0_1px_0_rgba(0,0,0,0.03)] sm:grid-cols-[48px_1fr_auto]"
              key={step.number}
              data-reveal
              data-reveal-delay={index}
            >
              <div className={clsx('grid size-12 place-items-center rounded-lg', step.tone)}>
                <step.icon aria-hidden="true" className="size-5" />
              </div>
              <div>
                <div className="text-xs font-black uppercase text-[var(--muted)]">
                  Шаг {step.number}
                </div>
                <h3 className="mt-1 text-lg font-black">{step.title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted)]">
                  {step.text}
                </p>
              </div>
              <Check aria-hidden="true" className="hidden size-5 self-center text-[var(--teal)] sm:block" />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureSection() {
  return (
    <section id="features" className="border-b border-[var(--line)] bg-[var(--surface)] py-16 sm:py-20">
      <div className="mx-auto w-[min(1180px,calc(100vw-32px))]">
        <SectionHeader
          eyebrow="Почему удобно"
          title="Покупка не уводит клиента в ручную обработку"
          text="Сайт держит весь путь оформления в одном месте: выбор тарифа, контакты, выдача и ссылка подписки."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature, index) => (
            <article
              className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_1px_0_rgba(0,0,0,0.03)]"
              key={feature.title}
              data-reveal
              data-reveal-delay={index}
            >
              <div className={clsx('mb-5 grid size-11 place-items-center rounded-lg', feature.tone)}>
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

function ServicesSection() {
  return (
    <section id="services" className="border-b border-[var(--line)] bg-[var(--page-bg)] py-16 sm:py-20">
      <div className="mx-auto w-[min(1180px,calc(100vw-32px))]">
        <SectionHeader
          eyebrow="Сценарии"
          title="Для привычных задач без лишней настройки"
          text="Сервис закрывает ежедневные сценарии: рабочие кабинеты, общение, видео и поездки."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service, index) => (
            <article
              className="group grid gap-5 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 transition hover:border-[var(--line-strong)] lg:grid-cols-[56px_1fr]"
              key={service.title}
              data-reveal
              data-reveal-delay={index}
            >
              <div
                className={clsx(
                  'grid size-14 place-items-center rounded-lg text-white',
                  index === 0 && 'bg-[var(--rose)]',
                  index === 1 && 'bg-[var(--surface-strong)] text-[var(--page-bg)]',
                  index === 2 && 'bg-[var(--accent)]',
                  index === 3 && 'bg-[var(--teal)]',
                )}
              >
                <service.icon aria-hidden="true" className="size-6" />
              </div>
              <div>
                <div className="text-xs font-black uppercase text-[var(--muted)]">
                  {service.label}
                </div>
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
    <section id="pricing" className="border-b border-[var(--line)] bg-[var(--surface)] py-16 sm:py-20">
      <div className="mx-auto w-[min(1180px,calc(100vw-32px))]">
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <SectionHeader
            eyebrow="Тарифы"
            title="Выбери срок подписки"
            text="Старшие тарифы дешевле в пересчете на месяц. Трафик и устройства применяются автоматически."
            compact
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {visiblePlans.map((plan, index) => (
            <PriceCard
              key={plan.id}
              plan={plan}
              selected={plan.id === selectedPlanId}
              onClick={() => onSelectPlan(plan.id)}
              revealDelay={index}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function PriceCard({
  plan,
  selected,
  onClick,
  revealDelay,
}: {
  plan: Plan
  selected: boolean
  onClick: () => void
  revealDelay: number
}) {
  return (
    <button
      className={clsx(
        'relative flex min-h-72 flex-col rounded-lg border bg-[var(--surface)] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow)]',
        selected
          ? 'border-[var(--accent)] ring-4 ring-[var(--accent-soft)]'
          : 'border-[var(--line)]',
      )}
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      data-reveal
      data-reveal-delay={revealDelay}
    >
      {plan.popular ? (
        <span className="absolute left-5 top-0 inline-flex -translate-y-1/2 items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs font-black text-[var(--accent-strong)] shadow-[0_12px_28px_rgba(16,17,20,0.12)]">
          <Sparkles aria-hidden="true" className="size-3.5" />
          Популярный
        </span>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-black">{plan.name}</div>
          <div className="mt-1 text-sm font-bold text-[var(--muted)]">{plan.period}</div>
        </div>
        {selected ? (
          <span className="grid size-7 place-items-center rounded-full bg-[var(--accent)] text-white">
            <Check aria-hidden="true" className="size-4" />
          </span>
        ) : null}
      </div>
      <div className="mt-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black">{formatPrice(plan.priceRub)}</span>
        </div>
        {plan.oldPriceRub ? (
          <div className="mt-1 text-sm font-bold text-[var(--muted)]">
            вместо <span className="line-through">{formatPrice(plan.oldPriceRub)}</span>
          </div>
        ) : null}
      </div>
      <p className="mt-4 text-sm font-medium leading-6 text-[var(--muted)]">
        {plan.highlight || 'Подписка VPN'}
      </p>
      <div className="mt-auto flex flex-wrap gap-2 pt-6">
        <MetaPill>{trafficLabel(plan)}</MetaPill>
        <MetaPill>{plan.devices} устр.</MetaPill>
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
  contact,
  consent,
  submitting,
  formStatus,
  onTelegramChange,
  onEmailChange,
  onContactChange,
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
  contact: string
  consent: boolean
  submitting: boolean
  formStatus: FormStatus
  onTelegramChange: (value: string) => void
  onEmailChange: (value: string) => void
  onContactChange: (value: string) => void
  onConsentChange: (value: boolean) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  const visiblePlans = plans.length > 0 ? plans : fallbackPlans

  return (
    <section id="checkout" className="border-b border-[var(--line)] bg-[var(--page-bg)] py-16 sm:py-20">
      <div className="mx-auto grid w-[min(1180px,calc(100vw-32px))] gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(380px,0.68fr)] lg:items-start">
        <div>
          <SectionHeader
            eyebrow="Оформление"
            title="Оплати доступ и получи ссылку подписки"
            text="Укажи Telegram или email, выбери тариф и заверши оформление. Ссылка появится на этой странице после подтверждения."
            compact
          />
          <div className="mt-8 grid gap-3">
            {[
              ['01', 'Выбор тарифа', 'Клиент видит срок, трафик, устройства и итоговую цену.'],
              ['02', 'Подтверждение оплаты', 'Бэк фиксирует оформление и запускает выдачу.'],
              ['03', 'Подписка готова', 'Ссылка отображается в браузере и доступна для копирования.'],
            ].map(([number, title, text], index) => (
              <div
                className="flex gap-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4"
                key={number}
                data-reveal
                data-reveal-delay={index}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--surface-strong)] text-sm font-black text-[var(--page-bg)]">
                  {number}
                </span>
                <div>
                  <h3 className="font-black">{title}</h3>
                  <p className="mt-1 text-sm font-medium leading-6 text-[var(--muted)]">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form
          className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]"
          onSubmit={onSubmit}
          data-reveal
          data-reveal-delay="2"
        >
          {configNotice ? (
            <div className="mb-4 rounded-lg border border-[color-mix(in_srgb,var(--amber)_42%,var(--line))] bg-[var(--amber-soft)] p-3 text-sm font-bold leading-6">
              {configNotice}
            </div>
          ) : null}

          <div className="mb-5 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] p-4">
            <div className="text-xs font-black uppercase text-[var(--muted)]">
              Выбранный тариф
            </div>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-xl font-black">
                  {selectedPlan?.name || 'Загрузка'}
                </div>
                <div className="mt-1 text-sm font-bold text-[var(--muted)]">
                  {selectedPlan ? `${selectedPlan.period} · ${trafficLabel(selectedPlan)}` : ''}
                </div>
              </div>
              <div className="text-2xl font-black">
                {selectedPlan ? formatPrice(selectedPlan.priceRub) : '...'}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2 text-sm font-black">
              Тариф
              <PlanSelect plans={visiblePlans} value={selectedPlanId} onChange={onSelectPlan} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-black">
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
              <label className="grid gap-2 text-sm font-black">
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

            <label className="grid gap-2 text-sm font-black">
              Комментарий
              <textarea
                className={textAreaClass}
                value={contact}
                onChange={(event) => onContactChange(event.currentTarget.value)}
                name="contact"
                rows={3}
                placeholder="Например: нужен доступ на телефон и ноутбук"
              />
            </label>

            <label className="flex items-start gap-3 text-sm font-bold leading-6 text-[var(--muted)]">
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
              {submitting ? 'Оформляем доступ...' : 'Оплатить и получить ссылку'}
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
        </form>
      </div>
    </section>
  )
}

function FaqSection() {
  return (
    <section className="bg-[var(--surface)] py-16 sm:py-20">
      <div className="mx-auto w-[min(1180px,calc(100vw-32px))]">
        <SectionHeader
          eyebrow="FAQ"
          title="Коротко о важном"
          text="Ответы на вопросы, которые чаще всего возникают перед оформлением."
        />
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {faqs.map((faq, index) => (
            <details
              className="faq-card group self-start rounded-lg border border-[var(--line)] bg-[var(--surface)] p-0"
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
    const sections = Array.from(document.querySelectorAll<HTMLElement>('main > section'))
    let animationFrame = 0

    if (!sections.length || prefersReducedMotion.matches) return

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

function useMagneticScroll() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (prefersReducedMotion.matches) return

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

    function getSections() {
      return Array.from(document.querySelectorAll<HTMLElement>('main > section'))
    }

    function getHeaderHeight() {
      return document.querySelector('header')?.getBoundingClientRect().height || 72
    }

    function getCurrentSectionIndex(sections: HTMLElement[]) {
      const headerHeight = getHeaderHeight()
      const visibleHeight = Math.max(1, window.innerHeight - headerHeight)
      const viewportCenter = window.scrollY + headerHeight + visibleHeight / 2

      return sections.reduce(
        (best, section, index) => {
          const rect = section.getBoundingClientRect()
          const sectionCenter = window.scrollY + rect.top + rect.height / 2
          const distance = Math.abs(sectionCenter - viewportCenter)
          return distance < best.distance ? { index, distance } : best
        },
        { index: 0, distance: Number.POSITIVE_INFINITY },
      ).index
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

    function goToRelativeSection(direction: number) {
      const sections = getSections()
      if (!sections.length) return

      const currentIndex = getCurrentSectionIndex(sections)
      goToSection(currentIndex + direction, sections)
    }

    function goToSection(index: number, currentSections = getSections()) {
      if (!currentSections.length) return

      const sectionIndex = clamp(index, 0, currentSections.length - 1)
      const section = currentSections[sectionIndex]
      const headerHeight = getHeaderHeight()
      const visibleHeight = Math.max(1, window.innerHeight - headerHeight)
      const rect = section.getBoundingClientRect()
      const sectionCenter = window.scrollY + rect.top + rect.height / 2
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      const target = clamp(sectionCenter - headerHeight - visibleHeight / 2, 0, maxScroll)

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

      const sections = getSections()
      if (!sections.length) return

      const currentIndex = getCurrentSectionIndex(sections)
      if (event.key === 'Home') {
        goToSection(0, sections)
        return
      }
      if (event.key === 'End') {
        goToSection(sections.length - 1, sections)
        return
      }

      const direction =
        event.key === 'ArrowUp' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)
          ? -1
          : 1
      goToSection(currentIndex + direction, sections)
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
}: {
  brandName: string
  supportUrl: string
  supportEmail: string
}) {
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
            Стабильный VPN для работы, общения, поездок и ежедневного доступа к
            нужным сервисам.
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

  function selectPlan(planId: string) {
    onChange(planId)
    setOpen(false)
  }

  function moveSelection(direction: number) {
    const currentIndex = Math.max(
      0,
      plans.findIndex((plan) => plan.id === selectedPlan.id),
    )
    const nextIndex = clamp(currentIndex + direction, 0, plans.length - 1)
    const nextPlan = plans[nextIndex]
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
    <div className="relative" data-plan-select ref={rootRef} onKeyDown={handleKeyDown}>
      <button
        className={clsx(
          'flex min-h-16 w-full items-center justify-between gap-4 rounded-lg border bg-[var(--surface)] px-4 py-3 text-left transition',
          'hover:border-[var(--line-strong)] hover:shadow-[0_16px_34px_rgba(16,17,20,0.1)]',
          'focus:outline-none focus:ring-4 focus:ring-[var(--accent-soft)]',
          open ? 'border-[var(--accent)] ring-4 ring-[var(--accent-soft)]' : 'border-[var(--line)]',
        )}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
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
              {selectedPlan.period} · {trafficLabel(selectedPlan)} · {selectedPlan.devices} устр.
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
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[0_24px_60px_rgba(16,17,20,0.18)]"
          role="listbox"
        >
          <div className="grid max-h-80 gap-1 overflow-y-auto">
            {plans.map((plan) => {
              const selected = plan.id === selectedPlan.id
              return (
                <button
                  className={clsx(
                    'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition',
                    selected
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-transparent hover:bg-[var(--surface-muted)]',
                  )}
                  type="button"
                  key={plan.id}
                  role="option"
                  aria-selected={selected}
                  onClick={() => selectPlan(plan.id)}
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-black">{plan.name}</span>
                      {plan.popular ? (
                        <span
                          className={clsx(
                            'rounded-full px-2 py-0.5 text-[11px] font-black',
                            selected
                              ? 'bg-white/18 text-white'
                              : 'bg-[var(--accent-soft)] text-[var(--accent-strong)]',
                          )}
                        >
                          Популярный
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={clsx(
                        'mt-1 block text-xs font-bold',
                        selected ? 'text-white/78' : 'text-[var(--muted)]',
                      )}
                    >
                      {plan.period} · {trafficLabel(plan)} · {plan.devices} устр.
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-base font-black">{formatPrice(plan.priceRub)}</span>
                    {selected ? (
                      <span className="grid size-7 place-items-center rounded-full bg-white text-[var(--accent)]">
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
                Открыть подписку
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
  const saved = window.localStorage.getItem('vpn-theme')
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
