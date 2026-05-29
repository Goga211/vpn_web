import {
  BrandStrip,
  CtaBlock,
  Hero,
  Highlights,
  HomeFaq,
  HowItWorks,
  OverviewGrid,
  Scenarios,
} from '../components/Sections'
import { PricingSection } from '../components/Pricing'

export function HomePage() {
  return (
    <>
      <Hero />
      <div id="features">
        <OverviewGrid />
      </div>
      <HowItWorks />
      <Scenarios />
      <Highlights />
      <div id="pricing">
        <PricingSection />
      </div>
      <BrandStrip />
      <div id="faq">
        <HomeFaq />
      </div>
      <CtaBlock />
    </>
  )
}
