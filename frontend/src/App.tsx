import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { SiteProvider } from './siteContext'
import { SiteFooter, SiteHeader } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { PricingPage } from './pages/PricingPage'
import { FeaturesPage } from './pages/FeaturesPage'
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
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
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
