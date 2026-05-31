import {
  BrandStrip,
  CtaBlock,
  Hero,
  Highlights,
  HomeFaq,
  HowItWorks,
  OverviewGrid,
  Platforms,
  PricingTeaser,
  Testimonials,
} from '../components/Sections'

export function HomePage() {
  return (
    <>
      <Hero />
      <OverviewGrid />
      <HowItWorks />
      <Highlights />
      <Testimonials />
      <PricingTeaser />
      <Platforms />
      <BrandStrip />
      <HomeFaq />
      <CtaBlock />
    </>
  )
}
