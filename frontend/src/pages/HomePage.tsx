import {
  BrandStrip,
  CtaBlock,
  Hero,
  Highlights,
  HomeFaq,
  HowItWorks,
  OverviewGrid,
} from '../components/Sections'

export function HomePage() {
  return (
    <>
      <Hero />
      <OverviewGrid />
      <HowItWorks />
      <Highlights />
      <BrandStrip />
      <HomeFaq />
      <CtaBlock />
    </>
  )
}
