import { AnimatedBackground } from "@/components/landing/animated-background"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { HowToPlay } from "@/components/landing/how-to-play"
import { Footer } from "@/components/landing/footer"

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />
      <Hero />
      <Features />
      <HowToPlay />
      <Footer />
    </main>
  )
}
