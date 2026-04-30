import { AnimatedBackground } from "@/components/landing/animated-background"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { ModesAndMaps } from "@/components/landing/modes-and-maps"
import { Powerups } from "@/components/landing/powerups"
import { HowToPlay } from "@/components/landing/how-to-play"
import { Footer } from "@/components/landing/footer"

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />
      <Hero />
      <Features />
      <ModesAndMaps />
      <Powerups />
      <HowToPlay />
      <Footer />
    </main>
  )
}
