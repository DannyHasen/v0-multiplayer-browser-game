"use client"

import { motion } from "framer-motion"
import { 
  Zap, 
  Users, 
  Globe, 
  Smartphone,
  Timer,
  Sparkles,
} from "lucide-react"

const features = [
  {
    icon: Users,
    title: "Real-Time Multiplayer",
    description: "Battle against 2-8 players in the same arena with instant synchronization and smooth gameplay.",
    color: "text-primary",
    glow: "neon-glow-cyan",
  },
  {
    icon: Timer,
    title: "Quick 3-Minute Matches",
    description: "Jump into fast-paced action. Perfect for a quick break or extended play sessions.",
    color: "text-accent",
    glow: "neon-glow-magenta",
  },
  {
    icon: Globe,
    title: "Browser-Based",
    description: "No downloads, no installs. Play instantly in any modern browser on desktop or mobile.",
    color: "text-primary",
    glow: "neon-glow-cyan",
  },
  {
    icon: Smartphone,
    title: "Cross-Device Play",
    description: "Touch controls for mobile, keyboard for desktop. Play on any device, anywhere.",
    color: "text-accent",
    glow: "neon-glow-magenta",
  },
  {
    icon: Zap,
    title: "Special Abilities",
    description: "Dash through obstacles and unleash shockwaves to knock back opponents.",
    color: "text-primary",
    glow: "neon-glow-cyan",
  },
  {
    icon: Sparkles,
    title: "Room Codes",
    description: "Create private rooms with shareable codes. Invite friends for exclusive matches.",
    color: "text-accent",
    glow: "neon-glow-magenta",
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
}

export function Features() {
  return (
    <section className="py-24 px-4" id="features">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-balance">
            Built for <span className="text-primary">Speed</span> and{" "}
            <span className="text-accent">Fun</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
            Everything you need for intense multiplayer action, right in your browser.
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative p-6 rounded-xl bg-card/50 border border-border hover:border-primary/50 transition-all duration-300"
            >
              {/* Icon */}
              <div className={`inline-flex p-3 rounded-lg bg-secondary/50 ${feature.glow} mb-4`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold mb-2 text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>

              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-primary/5 to-accent/5" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
