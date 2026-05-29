import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  AtSign,
  Check,
  ChevronDown,
  Copy,
  Mail,
  MessageCircle,
  ShieldCheck,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { CheckoutApiError, createCheckout } from '../api'
import type { Checkout, Payment, Plan } from '../types'
import { useSite } from '../siteContext'
import { getTelegramWebApp } from '../hooks'
import {
  TRIAL_PLAN_ID,
  formatPrice,
  getConfigNotice,
  statusLabel,
  trafficLabel,
} from '../siteData'

type FormStatus = { kind: 'idle' | 'success' | 'error'; message: string }
type AccessDialog =
  | { type: 'success'; checkout: Checkout; payment?: Payment }
  | { type: 'failure'; checkout?: Checkout; message: string }

const includedItems: Array<{ label: string; render?: (plan: Plan) => string }> = [
  { label: 'Период доступа', render: (p) => p.period },
  { label: 'Трафик', render: (p) => trafficLabel(p) },
  { label: 'Устройств', render: (p) => `до ${p.devices}` },
  { label: 'Моментальная активация' },
  { label: 'Поддержка в Telegram' },
]

const checkoutFaqs = [
  {
    q: 'Сколько занимает оформление?',
    a: 'Меньше минуты. После отправки формы личная ссылка появляется сразу на сайте.',
  },
  {
    q: 'Где появится ссылка на доступ?',
    a: 'В модальном окне после успешного оформления и продублируется в Telegram, если вы его указали.',
  },
  {
    q: 'Можно ли поменять тариф позже?',
    a: 'Да, поддержка пересчитает оставшийся период и переведёт на нужный план.',
  },
]

export function CheckoutSection({ initialPlanId }: { initialPlanId?: string }) {
  const { config, plans } = useSite()
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId || TRIAL_PLAN_ID)
  const [telegram, setTelegram] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formStatus, setFormStatus] = useState<FormStatus>({ kind: 'idle', message: '' })
  const [dialog, setDialog] = useState<AccessDialog | null>(null)

  // Синхронизируем выбранный тариф с тарифом из URL при навигации, не теряя данные
  // формы. Корректировка состояния во время рендера — рекомендованный React способ,
  // он не вызывает каскадных ререндеров (в отличие от setState внутри useEffect).
  const [lastInitialPlanId, setLastInitialPlanId] = useState(initialPlanId)
  if (initialPlanId && initialPlanId !== lastInitialPlanId) {
    setLastInitialPlanId(initialPlanId)
    setSelectedPlanId(initialPlanId)
  }

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0]
  const configNotice = getConfigNotice(config)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedPlan) {
      setFormStatus({ kind: 'error', message: 'Тарифы ещё загружаются.' })
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
        message: 'Оставьте Telegram или email для профиля и восстановления доступа.',
      })
      return
    }

    setSubmitting(true)
    setFormStatus({ kind: 'idle', message: 'Оформляем пробный доступ…' })

    try {
      const result = await createCheckout({
        planId: selectedPlan.id,
        telegram: telegram.trim(),
        email: email.trim(),
        consent,
        initData: getTelegramWebApp()?.initData ?? '',
      })
      setFormStatus({ kind: 'success', message: 'Готово: пробный доступ активирован.' })
      setDialog({ type: 'success', checkout: result.checkout, payment: result.payment })
      setTelegram('')
      setEmail('')
      setConsent(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось выпустить доступ'
      if (error instanceof CheckoutApiError && error.checkout) {
        setDialog({ type: 'failure', checkout: error.checkout, message })
      }
      setFormStatus({ kind: 'error', message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="section" style={{ paddingTop: 32 }}>
      <div className="container-shell">
        <div className="checkout-shell">
          <aside className="checkout-receipt-rich" aria-label="Выбранный тариф" data-reveal>
            <div className="receipt-top">
              <span>Ваш заказ</span>
              <span className="receipt-status">
                <Check size={12} aria-hidden="true" />
                готов
              </span>
            </div>
            <div className="receipt-headline">
              <strong>{selectedPlan?.name || '—'}</strong>
              <span>
                {selectedPlan ? `${selectedPlan.period} · ${trafficLabel(selectedPlan)}` : ''}
              </span>
            </div>
            <div className="receipt-price">
              {selectedPlan ? formatPrice(selectedPlan.priceRub) : '—'}
            </div>

            <div className="receipt-divider" />

            <div className="receipt-includes">
              <p className="receipt-includes-title">Что входит</p>
              {includedItems.map((item) => (
                <div className="receipt-include-row" key={item.label}>
                  <span className="check">
                    <Check aria-hidden="true" />
                  </span>
                  <span>
                    {item.label}
                    {selectedPlan && item.render ? (
                      <span style={{ color: 'rgba(245,245,247,0.6)' }}> · {item.render(selectedPlan)}</span>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>

            <div className="receipt-secure">
              <ShieldCheck aria-hidden="true" />
              <span>Защищённый канал передачи данных</span>
            </div>
          </aside>

          <div data-reveal>
            <form className="checkout-form-rich" onSubmit={handleSubmit}>
              {configNotice ? <div className="notice">{configNotice}</div> : null}

              <div className="checkout-form-rich-head">
                <h2>Контактные данные</h2>
                <p>Оставьте Telegram или email — мы пришлём подтверждение и ссылку на доступ.</p>
              </div>

              <div className="field-group">
                <div>
                  <span className="field-label">Тариф</span>
                  <PlanSelect
                    plans={plans}
                    value={selectedPlanId}
                    onChange={setSelectedPlanId}
                  />
                </div>

                <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr' }}>
                  <label>
                    <span className="field-label">Telegram</span>
                    <div className="field-with-icon">
                      <input
                        className="field-input"
                        value={telegram}
                        onChange={(e) => setTelegram(e.currentTarget.value)}
                        type="text"
                        name="telegram"
                        placeholder="@username"
                        autoComplete="username"
                      />
                      <MessageCircle aria-hidden="true" />
                    </div>
                  </label>
                  <label>
                    <span className="field-label">Email</span>
                    <div className="field-with-icon">
                      <input
                        className="field-input"
                        value={email}
                        onChange={(e) => setEmail(e.currentTarget.value)}
                        type="email"
                        name="email"
                        placeholder="name@example.com"
                        autoComplete="email"
                      />
                      <AtSign aria-hidden="true" />
                    </div>
                  </label>
                </div>

                <label className="consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.currentTarget.checked)}
                    required
                  />
                  <span>
                    Согласен на оформление доступа и обработку данных для выдачи подписки.
                  </span>
                </label>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                  disabled={submitting}
                >
                  <span>{submitting ? 'Оформляем…' : 'Получить доступ'}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>

                <p
                  className={clsx(
                    'form-status',
                    formStatus.kind === 'error' && 'is-error',
                    formStatus.kind === 'success' && 'is-success',
                    formStatus.kind === 'idle' && 'is-idle',
                  )}
                  role="status"
                  aria-live="polite"
                >
                  {formStatus.message}
                </p>
              </div>

              <div className="checkout-divider" />

              <div className="checkout-timeline">
                <p className="checkout-timeline-title">Что произойдёт</p>
                <div className="timeline-item">
                  <span className="timeline-step">1</span>
                  <div className="timeline-content">
                    <strong>Принимаем заявку</strong>
                    <span>Проверяем тариф и контактные данные.</span>
                  </div>
                </div>
                <div className="timeline-item">
                  <span className="timeline-step">2</span>
                  <div className="timeline-content">
                    <strong>Создаём подписку</strong>
                    <span>Выпускаем личную страницу подписки на ваш тариф.</span>
                  </div>
                </div>
                <div className="timeline-item">
                  <span className="timeline-step">3</span>
                  <div className="timeline-content">
                    <strong>Открываем доступ</strong>
                    <span>Ссылка появляется на сайте сразу после оформления.</span>
                  </div>
                </div>
              </div>

              <div className="checkout-divider" />

              <div className="checkout-mini-faq">
                <p className="checkout-timeline-title">Частые вопросы</p>
                {checkoutFaqs.map((faq) => (
                  <details key={faq.q}>
                    <summary>
                      {faq.q}
                      <ChevronDown size={16} aria-hidden="true" />
                    </summary>
                    <div className="answer">{faq.a}</div>
                  </details>
                ))}
              </div>
            </form>
          </div>
        </div>
      </div>

      <AccessModal
        dialog={dialog}
        supportUrl={config.supportTelegramUrl}
        onClose={() => setDialog(null)}
      />
    </section>
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
  const selectedPlan = plans.find((p) => p.id === value) || plans[0]

  useEffect(() => {
    if (!open) return
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!selectedPlan) return null

  return (
    <div className="plan-select" ref={rootRef}>
      <button
        className="plan-select-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          <strong>
            {selectedPlan.name} · {formatPrice(selectedPlan.priceRub)}
          </strong>
          <span>
            {selectedPlan.period} · {trafficLabel(selectedPlan)}
          </span>
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', color: 'var(--muted)' }}
        />
      </button>
      {open ? (
        <div className="plan-select-menu" role="listbox">
          {plans.map((plan) => {
            const isSelected = plan.id === value
            const unavailable = plan.id !== TRIAL_PLAN_ID
            return (
              <button
                key={plan.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={unavailable}
                className="plan-select-option"
                onClick={() => {
                  if (!unavailable) {
                    onChange(plan.id)
                    setOpen(false)
                  }
                }}
              >
                <span>
                  <strong>{plan.name}</strong>
                  <span>
                    {plan.period} · {trafficLabel(plan)}
                  </span>
                </span>
                <span style={{ fontWeight: 500, fontSize: 14 }}>
                  {unavailable ? 'Скоро' : formatPrice(plan.priceRub)}
                </span>
              </button>
            )
          })}
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
      className="dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="access-dialog-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="dialog">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <h2 id="access-dialog-title">
            {success ? 'Доступ готов' : 'Выдача не прошла'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="icon-button"
            aria-label="Закрыть"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <p>{message}</p>

        {checkout ? (
          <div className="dialog-meta">
            <div>
              <span>Тариф</span>
              <span>{checkout.planName} ({formatPrice(checkout.priceRub)})</span>
            </div>
            <div>
              <span>Статус</span>
              <span>{statusLabel(checkout.status)}</span>
            </div>
          </div>
        ) : null}

        {success && checkout?.subscriptionUrl ? (
          <div className="dialog-link">
            <p>Страница подписки</p>
            <a href={checkout.subscriptionUrl} target="_blank" rel="noreferrer">
              {checkout.subscriptionUrl}
            </a>
          </div>
        ) : null}

        <div className="dialog-actions">
          {success && checkout?.subscriptionUrl ? (
            <>
              <button type="button" className="btn btn-secondary" onClick={copySubscription}>
                <Copy size={14} aria-hidden="true" />
                Скопировать
              </button>
              <a
                className="btn btn-primary"
                href={checkout.subscriptionUrl}
                target="_blank"
                rel="noreferrer"
              >
                Открыть подписку
                <ArrowRight size={14} aria-hidden="true" />
              </a>
            </>
          ) : (
            <a className="btn btn-primary" href={supportUrl} target="_blank" rel="noreferrer">
              <Mail size={14} aria-hidden="true" />
              Написать в поддержку
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

