import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowRight, Menu, Moon, Sun, X } from 'lucide-react'
import { useSite } from '../siteContext'

const navItems = [
  { label: 'Главная', to: '/' },
  { label: 'Возможности', to: '/features' },
  { label: 'Тарифы', to: '/pricing' },
  { label: 'Оформить', to: '/checkout' },
]

export function SiteHeader() {
  const { config, theme, toggleTheme } = useSite()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const ThemeIcon = theme === 'dark' ? Sun : Moon

  // Закрываем мобильное меню при смене маршрута. Корректировка состояния во время
  // рендера — рекомендованный React способ (без каскадных ререндеров от setState
  // в useEffect), он же используется в CheckoutSection.
  const [lastPath, setLastPath] = useState(location.pathname)
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname)
    setMenuOpen(false)
  }

  // lock body scroll + Escape to close while the drawer is open
  useEffect(() => {
    if (!menuOpen) return
    document.body.classList.add('no-scroll')
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('no-scroll')
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand-mark">
          <span>{config.brandName}</span>
        </Link>

        <nav className="nav-primary" aria-label="Основная навигация">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => 'nav-link' + (isActive ? ' is-active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <button
            className="icon-button"
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            title="Тема"
          >
            <ThemeIcon aria-hidden="true" size={18} />
          </button>
          <Link to="/checkout" className="btn btn-primary btn-sm header-cta-desktop">
            Попробовать бесплатно
          </Link>
          <button
            className="icon-button menu-toggle"
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            {menuOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <>
          <div className="mobile-nav-backdrop" onClick={() => setMenuOpen(false)} />
          <nav id="mobile-nav" className="mobile-nav" aria-label="Мобильная навигация">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => 'mobile-nav-link' + (isActive ? ' is-active' : '')}
              >
                {item.label}
                <ArrowRight aria-hidden="true" size={16} />
              </NavLink>
            ))}
            <Link to="/checkout" className="btn btn-primary btn-lg mobile-nav-cta">
              Попробовать бесплатно
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </nav>
        </>
      ) : null}
    </header>
  )
}

export function SiteFooter() {
  const { config } = useSite()

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-col">
          <Link to="/" className="brand-mark" style={{ marginBottom: 12 }}>
            <span>{config.brandName}</span>
          </Link>
          <p style={{ maxWidth: '36ch', lineHeight: 1.55 }}>
            Цифровая подписка для работы, общения, поездок и ежедневных задач — без лишней настройки.
          </p>
        </div>
        <div className="footer-col">
          <h4>Сервис</h4>
          <Link to="/features">Возможности</Link>
          <Link to="/pricing">Тарифы</Link>
          <Link to="/checkout">Оформить</Link>
        </div>
        <div className="footer-col">
          <h4>Связь</h4>
          <a href={config.supportTelegramUrl} target="_blank" rel="noreferrer">
            Поддержка в Telegram
          </a>
          <a href={`mailto:${config.supportEmail}`}>{config.supportEmail}</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} {config.brandName}</span>
        <span>Все права защищены</span>
      </div>
    </footer>
  )
}
