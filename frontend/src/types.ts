export type SiteConfig = {
  brandName: string
  supportTelegramUrl: string
  supportEmail: string
  paymentProvider: string
  checkoutEnabled: boolean
  provisioningEnabled: boolean
}

export type Plan = {
  id: string
  name: string
  period: string
  months: number
  priceRub: number
  oldPriceRub?: number
  trafficLimitGb: number
  devices: number
  popular?: boolean
  highlight: string
  provisionDuration: string
}

export type Checkout = {
  id: string
  planName: string
  priceRub: number
  status: string
  subscriptionUrl?: string
}

export type Payment = {
  provider: string
  status: string
  message?: string
}

export type CheckoutPayload = {
  planId: string
  telegram: string
  email: string
  consent: boolean
}

export type CheckoutResult = {
  checkout: Checkout
  payment?: Payment
}

export type ApiErrorPayload = {
  error?: {
    code?: string
    message?: string
  }
  checkout?: Checkout
}
