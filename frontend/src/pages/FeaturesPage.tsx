import {
  BadgeCheck,
  Check,
  Globe,
  Headphones,
  LayoutGrid,
  Plane,
  ShieldCheck,
  SquarePen,
  Tv2,
  Zap,
  MessagesSquare,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { BrandStrip, CtaBlock, HowItWorks, Platforms } from '../components/Sections'

const featureRows: Array<{
  eyebrow: string
  title: string
  text: string
  bullets: string[]
  icon: LucideIcon
  reversed?: boolean
  tone: string
}> = [
  {
    eyebrow: 'Скорость',
    title: 'От заявки до доступа — одна минута',
    text: 'Все этапы проходят прямо на сайте: выбор тарифа, контакты, активация и личная ссылка. Никаких ожиданий и менеджеров.',
    bullets: [
      'Личная страница подписки появляется моментально',
      'Поддержка возьмёт ручную выдачу, если автоматика недоступна',
      'История оформлений сохраняется на сайте',
    ],
    icon: Zap,
    tone: 'tone-violet',
  },
  {
    eyebrow: 'Прозрачность',
    title: 'Тарифы без скрытых правил',
    text: 'Срок, объём данных и приоритет канала зашиты в карточку тарифа — берётся ровно то, что обещано.',
    bullets: [
      'Лимиты публикуются открытым списком',
      'Тариф нельзя случайно сменить — все шаги под контролем',
      'Платные планы появятся после подключения оплаты',
    ],
    icon: BadgeCheck,
    reversed: true,
    tone: 'tone-aurora',
  },
  {
    eyebrow: 'Поддержка',
    title: 'Живая поддержка в Telegram',
    text: 'Если активация не прошла или возникли вопросы — поддержка находит оформление и помогает довести до конца.',
    bullets: [
      'Среднее время ответа меньше 10 минут',
      'Ручная выдача доступа при необходимости',
      'Помощь с настройкой соединения',
    ],
    icon: Headphones,
    tone: 'tone-ocean',
  },
]

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

const benefitItems: Array<{ icon: LucideIcon; title: string; text: string; tone: string }> = [
  {
    icon: ShieldCheck,
    title: 'Надёжная инфраструктура',
    text: 'Аптайм 99.9%, географически распределённые узлы и постоянный мониторинг качества.',
    tone: 'tone-aurora',
  },
  {
    icon: Globe,
    title: 'Премиум-инфраструктура',
    text: 'Распределённые узлы, технологии последнего поколения и постоянный мониторинг качества.',
    tone: 'tone-ocean',
  },
  {
    icon: LayoutGrid,
    title: 'Простой личный кабинет',
    text: 'Все оформления и активные подписки видны на сайте — без отдельных приложений.',
    tone: 'tone-violet',
  },
];

export function FeaturesPage() {
  return (
    <>
      <section className="page-hero bg-mesh">
        <div className="container-narrow">
          <div data-reveal>
            <p className="eyebrow">Возможности</p>
            <h1 className="hero-title">Один доступ для всех сценариев</h1>
            <p className="hero-sub">
              Сервис закрывает работу, общение, видео, путешествия и привычные подписки —
              быстро и без лишней настройки.
            </p>
          </div>
        </div>
      </section>

      <section className="section section-divider">
        <div className="container-shell">
          {featureRows.map((row) => (
            <div
              className={'feature-row' + (row.reversed ? ' is-reversed' : '')}
              key={row.title}
              data-reveal
            >
              <div>
                <p className="feature-row-eyebrow">{row.eyebrow}</p>
                <h3>{row.title}</h3>
                <p>{row.text}</p>
                <ul className="feature-row-list">
                  {row.bullets.map((bullet) => (
                    <li key={bullet}>
                      <Check aria-hidden="true" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="feature-row-visual">
                <div className={`feature-row-visual-icon ${row.tone}`}>
                  <row.icon aria-hidden="true" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

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
              <article className="service-card" key={s.title} data-reveal data-reveal-delay={index + 1}>
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

      <section className="section section-divider">
        <div className="container-shell">
          <div data-reveal>
            <p className="eyebrow">Что внутри</p>
            <h2 className="section-title">Каждая деталь продумана</h2>
            <p className="section-subtitle">
              Команда строит сервис вокруг трёх принципов: скорость, прозрачность и надёжность.
            </p>
          </div>
          <div className="overview-grid">
            {benefitItems.map((item, index) => (
              <article className="overview-card" key={item.title} data-reveal data-reveal-delay={index + 1}>
                <div className={`feature-icon ${item.tone}`}>
                  <item.icon aria-hidden="true" size={22} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Platforms />
      <HowItWorks />
      <BrandStrip />
      <CtaBlock title="Готовы попробовать?" />
    </>
  )
}
