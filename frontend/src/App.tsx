import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { SiteProvider } from './siteContext'
import { SiteFooter, SiteHeader } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { CheckoutPage } from './pages/CheckoutPage'
import { useHashScroll, useScrollReveal, useTelegramInit } from './hooks'

function AppShell() {
  useScrollReveal()
  useHashScroll()
  useTelegramInit()
  return (
    <>
      <SiteHeader />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      <SiteFooter />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <SiteProvider>
        <AppShell />
      </SiteProvider>
    </BrowserRouter>
  )
}

export default App
