import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Gauge,
  Globe,
  MessagesSquare,
  Plane,
  ShieldCheck,
  Sparkles,
  SquarePen,
  Tv2,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSite } from '../siteContext'

export function Hero() {
  const { config } = useSite()
  return (
    <section className="hero bg-mesh">
      <div className="container-shell">
        <div data-reveal>
          <span className="hero-pill">
            <span className="pill-badge">NEW</span>
            Пробный период — 30 дней без оплаты
          </span>
          <h1 className="hero-title">
            Подписка, которая <span className="accent">просто работает</span>
          </h1>
          <p className="hero-sub">
            {config.brandName} — цифровой доступ для повседневных задач. Без долгих настроек и сюрпризов.
          </p>
          <div className="hero-actions">
            <Link to="/checkout" className="btn btn-primary btn-lg">
              Получить доступ
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link to="/#features" className="btn btn-ghost btn-lg">
              Что внутри
            </Link>
          </div>
        </div>

        <div className="hero-product" data-reveal>
          <div className="hero-product-card">
            <div>
              <p className="card-eyebrow">Текущий план</p>
              <p className="card-headline">30 дней пробного периода</p>
              <span className="card-status">
                <BadgeCheck size={14} aria-hidden="true" />
                Доступ активен
              </span>
            </div>
            <div className="card-side">
              <div className="card-tile">
                <strong>30</strong>
                <span>дней</span>
              </div>
              <div className="card-tile">
                <strong>100</strong>
                <span>ГБ</span>
              </div>
              <div className="card-tile">
                <strong>HD</strong>
                <span>стрим без буферизации</span>
              </div>
              <div className="card-tile">
                <strong>24/7</strong>
                <span>живая поддержка</span>
              </div>
            </div>
          </div>
        </div>

        <div className="stats-bar" data-reveal>
          <div className="stat-cell">
            <div className="stat-value">1 мин</div>
            <div className="stat-label">от заявки до доступа</div>
          </div>
          <div className="stat-cell">
            <div className="stat-value">99.9%</div>
            <div className="stat-label">аптайм инфраструктуры</div>
          </div>
          <div className="stat-cell">
            <div className="stat-value">24/7</div>
            <div className="stat-label">живая поддержка</div>
          </div>
          <div className="stat-cell">
            <div className="stat-value">∞</div>
            <div className="stat-label">без ограничений по скорости</div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function HowItWorks() {
  return (
    <section className="section section-divider">
      <div className="container-shell">
        <div data-reveal className="center-block">
          <p className="eyebrow">Как работает</p>
          <h2 className="section-title" style={{ marginInline: 'auto' }}>Три шага до подписки</h2>
          <p className="section-subtitle" style={{ marginInline: 'auto' }}>
            Никаких личных кабинетов, верификации и долгих ожиданий — путь прозрачный от начала до конца.
          </p>
        </div>
        <div className="steps-grid">
          <article className="step-card" data-step="01" data-reveal data-reveal-delay="1">
            <h3>Выбор тарифа</h3>
            <p>Откройте раздел «Тарифы» и выберите подходящий срок подписки.</p>
          </article>
          <article className="step-card" data-step="02" data-reveal data-reveal-delay="2">
            <h3>Оформление</h3>
            <p>Оставьте Telegram или email — мы создадим личную страницу подписки.</p>
          </article>
          <article className="step-card" data-step="03" data-reveal data-reveal-delay="3">
            <h3>Готово</h3>
            <p>Ссылка появляется сразу же — можно подключаться и пользоваться.</p>
          </article>
        </div>
      </div>
    </section>
  )
}

export function Highlights() {
  return (
    <section className="section section-divider">
      <div className="container-shell">
        <div data-reveal className="center-block">
          <p className="eyebrow">Главные цифры</p>
          <h2 className="section-title" style={{ marginInline: 'auto' }}>Сервис, проверенный в работе</h2>
          <p className="section-subtitle" style={{ marginInline: 'auto' }}>
            За цифрами стоит реальная инфраструктура и команда — следим за качеством каждый день.
          </p>
        </div>
        <div className="highlight-grid">
          <article className="highlight-card highlight-vibrant" data-reveal data-reveal-delay="1">
            <div className="highlight-icon">
              <Gauge aria-hidden="true" />
            </div>
            <div className="highlight-value">99.9%</div>
            <p className="highlight-title">Аптайм инфраструктуры</p>
            <p className="highlight-text">Распределённые узлы и постоянный мониторинг качества каналов.</p>
          </article>
          <article className="highlight-card highlight-aurora" data-reveal data-reveal-delay="2">
            <div className="highlight-icon">
              <Sparkles aria-hidden="true" />
            </div>
            <div className="highlight-value">&lt; 1 мин</div>
            <p className="highlight-title">От заявки до подключения</p>
            <p className="highlight-text">Активация автоматическая — личная ссылка появляется сразу.</p>
          </article>
          <article className="highlight-card highlight-ocean" data-reveal data-reveal-delay="3">
            <div className="highlight-icon">
              <BadgeCheck aria-hidden="true" />
            </div>
            <div className="highlight-value">24 / 7</div>
            <p className="highlight-title">Живая поддержка в Telegram</p>
            <p className="highlight-text">Если автоматическая выдача не прошла — поддержка возьмёт ручную выдачу.</p>
          </article>
        </div>
      </div>
    </section>
  )
}

export function BrandStrip() {
  return (
    <section className="section-sm">
      <div className="container-shell">
        <div className="brand-strip" data-reveal>
          <p className="brand-strip-eyebrow">Привычные сервисы продолжают работать</p>
          <div className="brand-strip-row">
            <span>Сервисы</span>
            <span>Мессенджеры</span>
            <span>Стриминг</span>
            <span>AI-инструменты</span>
            <span>Облака</span>
            <span>Подписки</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export function CtaBlock({
  title = 'Готовы попробовать?',
  text = 'Активируйте пробный период за минуту — без оплаты и обязательств.',
  primaryLabel = 'Получить доступ',
  secondaryLabel = 'Посмотреть тарифы',
  secondaryTo = '/#pricing',
}: {
  title?: string
  text?: string
  primaryLabel?: string
  secondaryLabel?: string
  secondaryTo?: string
}) {
  return (
    <section className="section">
      <div className="container-shell">
        <div className="cta-block" data-reveal>
          <h2>{title}</h2>
          <p>{text}</p>
          <div className="cta-actions">
            <Link to="/checkout" className="btn btn-primary btn-lg">
              {primaryLabel}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link to={secondaryTo} className="btn btn-secondary btn-lg">
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

const overviewItems = [
  {
    icon: Zap,
    title: 'Моментальная активация',
    text: 'Личная страница подписки появляется на сайте сразу после оформления.',
    to: '/checkout',
    tone: 'tone-violet',
  },
  {
    icon: ShieldCheck,
    title: 'Прозрачные лимиты',
    text: 'Срок и объём данных берутся из тарифа автоматически — без скрытых правил.',
    to: '/#pricing',
    tone: 'tone-aurora',
  },
  {
    icon: Globe,
    title: 'Для всех задач',
    text: 'Работа, общение, видео, путешествия — один доступ закрывает все сценарии.',
    to: '/checkout',
    tone: 'tone-ocean',
  },
]

export function OverviewGrid() {
  return (
    <section className="section section-divider feature-section">
      <div className="container-shell">
        <div data-reveal>
          <p className="eyebrow">Главное</p>
          <h2 className="section-title">Подписка без лишних шагов</h2>
          <p className="section-subtitle">
            Сайт держит весь путь оформления в одном месте: выбор тарифа, контакты, активация и личная ссылка.
          </p>
        </div>
        <div className="overview-grid">
          {overviewItems.map((item, index) => (
            <Link
              to={item.to}
              key={item.title}
              className="overview-card"
              data-reveal
              data-reveal-delay={index + 1}
            >
              <div className={`feature-icon ${item.tone}`}>
                <item.icon aria-hidden="true" size={22} />
              </div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <span className="arrow-link">
                Подробнее
                <ArrowRight size={14} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

const scenarios: Array<{ tag: string; title: string; text: string; icon: LucideIcon }> = [
  {
    tag: 'Медиа',
    title: 'Видео и стриминг',
    text: 'Стабильный доступ к видео, прямым трансляциям и обучающим платформам в любое время.',
    icon: Tv2,
  },
  {
    tag: 'Общение',
    title: 'Соцсети и мессенджеры',
    text: 'Привычные сервисы на телефоне и десктопе работают без лишних настроек.',
    icon: MessagesSquare,
  },
  {
    tag: 'Работа',
    title: 'Рабочие инструменты',
    text: 'Почта, AI-сервисы, облака, таск-трекеры и ежедневные кабинеты — на месте.',
    icon: SquarePen,
  },
  {
    tag: 'Путешествия',
    title: 'В дороге',
    text: 'Подписки, личные кабинеты и привычные сайты — там же, где и дома.',
    icon: Plane,
  },
]

export function Scenarios() {
  return (
    <section className="section section-divider feature-section">
      <div className="container-shell">
        <div data-reveal>
          <p className="eyebrow">Сценарии</p>
          <h2 className="section-title">Закрывает повседневные задачи</h2>
          <p className="section-subtitle">
            Видео, общение, работа и поездки — везде работает одинаково надёжно.
          </p>
        </div>
        <div className="services-grid">
          {scenarios.map((s, index) => (
            <article className="service-card" key={s.title} data-reveal data-reveal-delay={Math.min(index + 1, 4)}>
              <div className="service-art" aria-hidden="true">
                <s.icon />
              </div>
              <span className="service-tag">{s.tag}</span>
              <div style={{ marginTop: 'auto' }}>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

const homeFaqs = [
  {
    question: 'Что нужно для подключения?',
    answer: 'Только Telegram или email — личная ссылка приходит сразу же после оформления.',
  },
  {
    question: 'Можно ли попробовать бесплатно?',
    answer: 'Да, 30 дней пробного периода без оплаты — без привязки карты и обязательств.',
  },
  {
    question: 'Какая скорость и качество канала?',
    answer: 'На пробном — стабильный стандартный канал, на платных — приоритет и расширенные узлы. Качество указано в карточке каждого тарифа.',
  },
  {
    question: 'Когда заработают платные тарифы?',
    answer: 'Оплата подключается отдельно. Пока активен только пробный план — следите за обновлениями или подпишитесь на канал в Telegram.',
  },
  {
    question: 'Можно ли сменить тариф после оформления?',
    answer: 'Да, обратитесь в поддержку — мы пересчитаем оставшийся период и предложим переход на нужный план.',
  },
]

export function HomeFaq() {
  return (
    <section className="section section-divider">
      <div className="container-narrow">
        <div data-reveal>
          <p className="eyebrow">FAQ</p>
          <h2 className="section-title">Коротко о важном</h2>
        </div>
        <div className="faq-grid">
          {homeFaqs.map((faq) => (
            <details className="faq-item" key={faq.question}>
              <summary>
                {faq.question}
                <ChevronDown size={18} aria-hidden="true" />
              </summary>
              <div className="faq-item-content">{faq.answer}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
