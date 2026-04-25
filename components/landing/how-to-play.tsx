"use client"

import { motion } from "framer-motion"
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  Keyboard,
  Hand,
} from "lucide-react"

const steps = [
  {
    number: "01",
    title: "Create or Join",
    description: "Enter your nickname, pick a neon color, then create a room or join with a code.",
  },
  {
    number: "02",
    title: "Ready Up",
    description: "Wait in the lobby for players. When everyone is ready, the host starts the match.",
  },
  {
    number: "03",
    title: "Drift & Score",
    description: "Control your hovercraft, collect energy orbs, avoid hazards, and tag opponents.",
  },
  {
    number: "04",
    title: "Win the Arena",
    description: "The player with the highest score when time runs out wins the match.",
  },
]

const controls = {
  keyboard: [
    { keys: ["W", "A", "S", "D"], label: "Move" },
    { keys: ["Space"], label: "Dash" },
    { keys: ["E"], label: "Shockwave" },
  ],
  touch: [
    { label: "Virtual Joystick", description: "Bottom left" },
    { label: "Dash Button", description: "Bottom right" },
    { label: "Ability Button", description: "Bottom right" },
  ],
}

export function HowToPlay() {
  return (
    <section className="py-24 px-4" id="how-to-play">
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
            How to <span className="text-primary">Play</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
            Get into the action in seconds. No tutorials, no complicated mechanics.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-border to-transparent z-0" />
              )}
              
              <div className="relative z-10 p-6 rounded-xl bg-card/30 border border-border">
                <div className="text-4xl font-bold text-primary/30 mb-3 font-mono">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {/* Keyboard controls */}
          <div className="p-6 rounded-xl bg-card/50 border border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-secondary/50 neon-glow-cyan">
                <Keyboard className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Keyboard Controls</h3>
            </div>

            <div className="space-y-4">
              {/* Movement keys visual */}
              <div className="flex items-center gap-6">
                <div className="grid grid-cols-3 gap-1">
                  <div />
                  <div className="w-10 h-10 rounded border border-primary/50 bg-secondary/50 flex items-center justify-center text-primary font-mono text-sm">
                    W
                  </div>
                  <div />
                  <div className="w-10 h-10 rounded border border-primary/50 bg-secondary/50 flex items-center justify-center text-primary font-mono text-sm">
                    A
                  </div>
                  <div className="w-10 h-10 rounded border border-primary/50 bg-secondary/50 flex items-center justify-center text-primary font-mono text-sm">
                    S
                  </div>
                  <div className="w-10 h-10 rounded border border-primary/50 bg-secondary/50 flex items-center justify-center text-primary font-mono text-sm">
                    D
                  </div>
                </div>
                <div>
                  <div className="font-medium">Move</div>
                  <div className="text-sm text-muted-foreground">Arrow keys also work</div>
                </div>
              </div>

              {/* Space bar */}
              <div className="flex items-center gap-6">
                <div className="w-24 h-10 rounded border border-accent/50 bg-secondary/50 flex items-center justify-center text-accent font-mono text-sm">
                  Space
                </div>
                <div>
                  <div className="font-medium">Dash</div>
                  <div className="text-sm text-muted-foreground">3 second cooldown</div>
                </div>
              </div>

              {/* E key */}
              <div className="flex items-center gap-6">
                <div className="w-10 h-10 rounded border border-accent/50 bg-secondary/50 flex items-center justify-center text-accent font-mono text-sm">
                  E
                </div>
                <div>
                  <div className="font-medium">Shockwave</div>
                  <div className="text-sm text-muted-foreground">5 second cooldown</div>
                </div>
              </div>
            </div>
          </div>

          {/* Touch controls */}
          <div className="p-6 rounded-xl bg-card/50 border border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-secondary/50 neon-glow-magenta">
                <Hand className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-lg font-semibold">Touch Controls</h3>
            </div>

            <div className="space-y-4">
              {/* Virtual joystick */}
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-full border-2 border-primary/50 bg-secondary/30 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-primary/50" />
                </div>
                <div>
                  <div className="font-medium">Virtual Joystick</div>
                  <div className="text-sm text-muted-foreground">Bottom left corner</div>
                </div>
              </div>

              {/* Dash button */}
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-full border-2 border-accent/50 bg-secondary/30 flex items-center justify-center text-accent font-bold">
                  DASH
                </div>
                <div>
                  <div className="font-medium">Dash Button</div>
                  <div className="text-sm text-muted-foreground">Bottom right corner</div>
                </div>
              </div>

              {/* Ability button */}
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-full border-2 border-accent/50 bg-secondary/30 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-accent animate-pulse" />
                </div>
                <div>
                  <div className="font-medium">Ability Button</div>
                  <div className="text-sm text-muted-foreground">Bottom right corner</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
