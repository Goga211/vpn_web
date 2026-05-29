import { Bolt, Headphones, Lock, ShieldCheck, Sparkles } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { CheckoutSection } from '../components/Checkout'

export function CheckoutPage() {
  const [searchParams] = useSearchParams()
  const planFromQuery = searchParams.get('plan') || undefined

  return (
    <>
      <section className="page-hero bg-mesh" style={{ paddingBottom: 24 }}>
        <div className="container-narrow">
          <div data-reveal>
            <p className="eyebrow">Оформление</p>
            <h1 className="hero-title">Получите доступ за минуту</h1>
            <p className="hero-sub">
              Оставьте Telegram или email — личная ссылка появится сразу после оформления пробного периода.
            </p>
            <div className="checkout-trust-row">
              <span className="checkout-trust-badge">
                <Lock aria-hidden="true" />
                Безопасное оформление
              </span>
              <span className="checkout-trust-badge">
                <Sparkles aria-hidden="true" />
                Без привязки карты
              </span>
              <span className="checkout-trust-badge">
                <Bolt aria-hidden="true" />
                Активация за минуту
              </span>
            </div>
          </div>
        </div>
      </section>

      <CheckoutSection initialPlanId={planFromQuery} />

      <section className="section-sm section-divider">
        <div className="container-shell">
          <div className="checkout-security-row" data-reveal>
            <article className="security-card">
              <div className="security-card-icon">
                <ShieldCheck aria-hidden="true" size={20} />
              </div>
              <div>
                <strong>Защищённая передача</strong>
                <span>Контакты передаются по защищённому каналу, никому не пересылаются.</span>
              </div>
            </article>
            <article className="security-card">
              <div className="security-card-icon">
                <Sparkles aria-hidden="true" size={20} />
              </div>
              <div>
                <strong>Никаких карт сейчас</strong>
                <span>Пробный период активируется без оплаты — оставьте только контакт.</span>
              </div>
            </article>
            <article className="security-card">
              <div className="security-card-icon">
                <Headphones aria-hidden="true" size={20} />
              </div>
              <div>
                <strong>Поддержка под рукой</strong>
                <span>Если активация не прошла — поддержка в Telegram разберётся быстро.</span>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  )
}
