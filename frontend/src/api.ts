import type {
  ApiErrorPayload,
  Checkout,
  CheckoutPayload,
  CheckoutResult,
} from './types'

export class CheckoutApiError extends Error {
  checkout?: Checkout
  code?: string

  constructor(message: string, checkout?: Checkout, code?: string) {
    super(message)
    this.name = 'CheckoutApiError'
    this.checkout = checkout
    this.code = code
  }
}

export async function getJSON<T>(url: string): Promise<T> {
  const response = await fetch(apiURL(url), {
    headers: { Accept: 'application/json' },
  })
  const data = (await response.json().catch(() => ({}))) as ApiErrorPayload

  if (!response.ok) {
    throw new Error(data.error?.message || 'Ошибка запроса')
  }

  return data as T
}

export async function createCheckout(
  payload: CheckoutPayload,
): Promise<CheckoutResult> {
  const response = await fetch(apiURL('/api/checkout'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const data = (await response.json().catch(() => ({}))) as
    | (CheckoutResult & ApiErrorPayload)
    | ApiErrorPayload

  if (!response.ok) {
    throw new CheckoutApiError(
      data.error?.message || 'Не удалось выпустить доступ',
      data.checkout,
      data.error?.code,
    )
  }

  return data as CheckoutResult
}

function apiURL(path: string) {
  if (!path.startsWith('/api') || typeof window === 'undefined') {
    return path
  }

  const liveServerPorts = new Set(['5500', '5501', '5502', '5503', '5504', '5505'])
  const localHostnames = new Set(['localhost', '127.0.0.1'])

  if (localHostnames.has(window.location.hostname) && liveServerPorts.has(window.location.port)) {
    return `http://localhost:8080${path}`
  }

  return path
}
