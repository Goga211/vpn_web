import { ArrowRight, Check, ChevronDown, Crown, Rocket, Sparkles, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Plan } from '../types'
import { useSite } from '../siteContext'
import {
  TRIAL_PLAN_ID,
  formatPrice,
  qualityLabel,
  speedLabel,
  trafficLabel,
} from '../siteData'
import { BrandStrip, CtaBlock } from '../components/Sections'
import clsx from 'clsx'

const planIcons: Record<string, LucideIcon> = {
  trial: Sparkles,
  month: Zap,
  halfyear: Crown,
  year: Rocket,
}

const pricingFaqs = [
  {
    question: 'Можно ли сменить тариф после оформления?',
    answer:
      'Да, обратитесь в поддержку — мы пересчитаем оставшийся период и предложим переход на нужный план.',
  },
  {
    question: 'Что входит в пробный период?',
    answer:
      'Пробный тариф — это 7 дней доступа, 100 ГБ трафика и стандартное качество канала. Этого достаточно, чтобы попробовать сервис в реальной жизни.',
  },
  {
    question: 'Когда заработают платные тарифы?',
    answer:
      'Оплата подключается отдельно. Пока активен только пробный план — следите за обновлениями или подпишитесь на канал в Telegram.',
  },
  {
    question: 'Как считается срок подписки?',
    answer:
      'Срок начинается с момента активации и идёт независимо от объёма трафика. На безлимитных тарифах ограничения по трафику нет.',
  },
]

export function PricingPage() {
  const { plans } = useSite()

  return (
    <>
      <section className="page-hero bg-mesh">
        <div className="container-narrow">
          <div data-reveal>
            <p className="eyebrow">Тарифы</p>
            <h1 className="hero-title">Подписка по вашему ритму</h1>
            <p className="hero-sub">
              Один пробный период и три платных тарифа. Выберите срок — остальное автоматически.
            </p>
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="container-shell">
          <div className="plan-grid">
            {plans.map((plan, index) => {
              const unavailable = plan.id !== TRIAL_PLAN_ID
              const Icon = planIcons[plan.id] || Sparkles
              const isFree = plan.priceRub === 0
              return (
                <div
                  key={plan.id}
                  className={clsx(
                    'plan-card',
                    plan.popular && 'is-popular',
                    unavailable && 'is-unavailable',
                  )}
                  data-reveal
                  data-reveal-delay={index}
                >
                  <div className="plan-card-icon">
                    <Icon aria-hidden="true" />
                  </div>
                  <div className="plan-card-info">
                    <p className="plan-card-name">{plan.period}</p>
                    <p className="plan-card-headline">{plan.name}</p>
                    <div className={clsx('plan-card-price', isFree && 'is-free')}>
                      {isFree ? 'Бесплатно' : formatPrice(plan.priceRub)}
                      {!isFree ? <small>/ период</small> : null}
                    </div>
                    {plan.oldPriceRub ? (
                      <p className="plan-card-price-old">{formatPrice(plan.oldPriceRub)}</p>
                    ) : (
                      <p className="plan-card-price-old is-placeholder" aria-hidden="true">
                        &nbsp;
                      </p>
                    )}
                  </div>
                  <ul className="plan-card-features">
                    <li>
                      <Check aria-hidden="true" />
                      <span>{plan.period} доступа</span>
                    </li>
                    <li>
                      <Check aria-hidden="true" />
                      <span>{trafficLabel(plan)}</span>
                    </li>
                    <li>
                      <Check aria-hidden="true" />
                      <span>{qualityLabel(plan)}</span>
                    </li>
                    <li>
                      <Check aria-hidden="true" />
                      <span>{speedLabel(plan)}</span>
                    </li>
                    <li>
                      <Check aria-hidden="true" />
                      <span>Моментальная активация</span>
                    </li>
                  </ul>
                  <p className="plan-card-highlight">{plan.highlight}</p>
                  {unavailable ? (
                    <button type="button" className="btn btn-secondary plan-card-cta" disabled>
                      Скоро
                    </button>
                  ) : (
                    <Link to="/checkout" className="btn btn-primary plan-card-cta">
                      Оформить
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="section section-divider">
        <div className="container-shell">
          <div data-reveal>
            <p className="eyebrow">Сравнение</p>
            <h2 className="section-title">Что входит в каждый тариф</h2>
          </div>
          <div className="pricing-table" data-reveal>
            <div
              className="pricing-table-row is-head"
              style={{ gridTemplateColumns: `1.4fr repeat(${plans.length}, 1fr)` }}
            >
              <span>Что включено</span>
              {plans.map((plan) => (
                <span key={plan.id}>{plan.name}</span>
              ))}
            </div>
            {[
              { label: 'Период', val: (p: Plan) => p.period },
              { label: 'Цена', val: (p: Plan) => formatPrice(p.priceRub) },
              { label: 'Трафик', val: (p: Plan) => trafficLabel(p) },
              { label: 'Качество канала', val: (p: Plan) => qualityLabel(p) },
              { label: 'Скорость', val: (p: Plan) => speedLabel(p) },
            ].map((row) => (
              <div
                className="pricing-table-row"
                key={row.label}
                style={{ gridTemplateColumns: `1.4fr repeat(${plans.length}, 1fr)` }}
              >
                <span style={{ color: 'var(--muted)' }}>{row.label}</span>
                {plans.map((plan) => (
                  <span key={plan.id}>{row.val(plan)}</span>
                ))}
              </div>
            ))}
            <div
              className="pricing-table-row"
              style={{ gridTemplateColumns: `1.4fr repeat(${plans.length}, 1fr)` }}
            >
              <span style={{ color: 'var(--muted)' }}>Моментальная активация</span>
              {plans.map((plan) => (
                <span key={plan.id} style={{ color: 'var(--accent)' }}>
                  <Check size={16} aria-hidden="true" style={{ display: 'inline' }} />
                </span>
              ))}
            </div>
            <div
              className="pricing-table-row"
              style={{ gridTemplateColumns: `1.4fr repeat(${plans.length}, 1fr)` }}
            >
              <span style={{ color: 'var(--muted)' }}>Поддержка в Telegram</span>
              {plans.map((plan) => (
                <span key={plan.id} style={{ color: 'var(--accent)' }}>
                  <Check size={16} aria-hidden="true" style={{ display: 'inline' }} />
                </span>
              ))}
            </div>
          </div>

          <div className="pricing-cards-mobile">
            {plans.map((plan) => (
              <div key={plan.id} className="pricing-mobile-card">
                <h3>{plan.name}</h3>
                <p className="price">{formatPrice(plan.priceRub)}</p>
                <ul>
                  <li>
                    <Check aria-hidden="true" />
                    {plan.period}
                  </li>
                  <li>
                    <Check aria-hidden="true" />
                    {trafficLabel(plan)}
                  </li>
                  <li>
                    <Check aria-hidden="true" />
                    {qualityLabel(plan)}
                  </li>
                  <li>
                    <Check aria-hidden="true" />
                    {speedLabel(plan)}
                  </li>
                  <li>
                    <Check aria-hidden="true" />
                    Моментальная активация
                  </li>
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-divider">
        <div className="container-narrow">
          <div data-reveal>
            <p className="eyebrow">FAQ</p>
            <h2 className="section-title">Вопросы по тарифам</h2>
          </div>
          <div className="faq-grid">
            {pricingFaqs.map((faq) => (
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

      <BrandStrip />
      <CtaBlock title="Выбрали тариф?" text="Активируйте пробный доступ за минуту — оформление займёт несколько секунд." />
    </>
  )
}
