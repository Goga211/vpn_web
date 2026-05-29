import { Link, NavLink } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useSite } from '../siteContext'

const logoLightSrc = `${import.meta.env.BASE_URL}assets/logo-light.svg`
const logoDarkSrc = `${import.meta.env.BASE_URL}assets/logo-dark.svg`

const sectionLinks = [
  { label: 'Возможности', hash: '#features' },
  { label: 'Тарифы', hash: '#pricing' },
  { label: 'FAQ', hash: '#faq' },
]

export function SiteHeader() {
  const { config, theme, toggleTheme } = useSite()
  const ThemeIcon = theme === 'dark' ? Sun : Moon
  const logoSrc = theme === 'dark' ? logoDarkSrc : logoLightSrc

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand-mark">
          <img src={logoSrc} width={28} height={28} alt="" />
          <span>{config.brandName}</span>
        </Link>

        <nav className="nav-primary" aria-label="Основная навигация">
          {sectionLinks.map((item) => (
            <Link key={item.hash} to={{ pathname: '/', hash: item.hash }} className="nav-link">
              {item.label}
            </Link>
          ))}
          <NavLink
            to="/checkout"
            className={({ isActive }) => 'nav-link' + (isActive ? ' is-active' : '')}
          >
            Оформить
          </NavLink>
        </nav>

        <div className="header-actions">
          <button
            className="icon-button"
            type="button"
            onClick={toggleTheme}
            aria-label="Переключить тему"
            title="Тема"
          >
            <ThemeIcon aria-hidden="true" size={18} />
          </button>
          <Link to="/checkout" className="btn btn-primary btn-sm">
            Попробовать
          </Link>
        </div>
      </div>
    </header>
  )
}

export function SiteFooter() {
  const { config, theme } = useSite()
  const logoSrc = theme === 'dark' ? logoDarkSrc : logoLightSrc

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-col">
          <Link to="/" className="brand-mark" style={{ marginBottom: 12 }}>
            <img src={logoSrc} width={28} height={28} alt="" />
            <span>{config.brandName}</span>
          </Link>
          <p style={{ maxWidth: '36ch', lineHeight: 1.55 }}>
            Цифровая подписка для работы, общения, поездок и ежедневных задач — без лишней настройки.
          </p>
        </div>
        <div className="footer-col">
          <h4>Сервис</h4>
          <Link to={{ pathname: '/', hash: '#features' }}>Возможности</Link>
          <Link to={{ pathname: '/', hash: '#pricing' }}>Тарифы</Link>
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
