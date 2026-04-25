import { AnimatedBackground } from "@/components/landing/animated-background"
import { RoomForm } from "@/components/room/room-form"

export const metadata = {
  title: "Play | Neon Drift Arena",
  description: "Create or join a room to start playing Neon Drift Arena",
}

export default function PlayPage() {
  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />
      <RoomForm />
    </main>
  )
}
