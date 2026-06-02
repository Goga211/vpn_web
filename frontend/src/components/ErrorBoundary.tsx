import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { defaultConfig } from '../siteData'

type Props = { children: ReactNode }
type State = { hasError: boolean }

// Глобальный предохранитель. Без него любой бросок при рендере дерева React
// размонтирует всё приложение, и пользователь (часто внутри Mini App) видит
// пустой серый экран без единой подсказки. Здесь мы перехватываем такой сбой и
// показываем понятное сообщение с кнопкой перезагрузки и ссылкой на поддержку.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Пишем в консоль WebView — это единственный способ диагностировать сбой на
    // конкретном устройстве пользователя.
    console.error('Сбой интерфейса:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          boxSizing: 'border-box',
          background: '#131210',
          color: '#f4f2ec',
          fontFamily:
            "'Manrope Variable', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '420px' }}>
          <h1 style={{ fontSize: '22px', margin: '0 0 12px', fontWeight: 700 }}>
            Что-то пошло не так
          </h1>
          <p style={{ fontSize: '15px', lineHeight: 1.5, margin: '0 0 24px', opacity: 0.8 }}>
            Не удалось загрузить страницу. Попробуйте обновить — обычно это помогает.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              appearance: 'none',
              border: 'none',
              borderRadius: '999px',
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              background: '#f4f2ec',
              color: '#131210',
            }}
          >
            Обновить страницу
          </button>
          <p style={{ fontSize: '13px', marginTop: '20px', opacity: 0.6 }}>
            Если не помогло —{' '}
            <a
              href={defaultConfig.supportTelegramUrl}
              style={{ color: '#f4f2ec', textDecoration: 'underline' }}
            >
              напишите в поддержку
            </a>
            .
          </p>
        </div>
      </div>
    )
  }
}
