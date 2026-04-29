"use client"

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import {
  BatteryCharging,
  Bomb,
  Flame,
  Gauge,
  HeartPlus,
  HeartPulse,
  Magnet,
  Percent,
  Shield,
  Snowflake,
} from "lucide-react"

type Powerup = {
  name: string
  role: string
  description: string
  color: string
  Icon: LucideIcon
}

const powerups: Powerup[] = [
  {
    name: "Energy",
    role: "Score",
    description: "Quick points that keep your total climbing between fights.",
    color: "#00ffff",
    Icon: BatteryCharging,
  },
  {
    name: "Boost",
    role: "Mobility",
    description: "A short speed burst for escapes, chases, and storm rotations.",
    color: "#ffff00",
    Icon: Gauge,
  },
  {
    name: "Shield",
    role: "Defense",
    description: "Blocks hits briefly so you can force a risky play.",
    color: "#00ff88",
    Icon: Shield,
  },
  {
    name: "Freeze",
    role: "Control",
    description: "Locks down opponents and hunters long enough to reposition.",
    color: "#7dd3ff",
    Icon: Snowflake,
  },
  {
    name: "Burn",
    role: "Pressure",
    description: "Tags enemies with damage over time and softens the Warden.",
    color: "#ff5a2f",
    Icon: Flame,
  },
  {
    name: "Bomb",
    role: "Area",
    description: "Drops a delayed blast that punishes crowded lanes.",
    color: "#ffffff",
    Icon: Bomb,
  },
  {
    name: "Heal",
    role: "Recovery",
    description: "Restores health without raising your maximum health.",
    color: "#5cff8d",
    Icon: HeartPulse,
  },
  {
    name: "Max Health",
    role: "Scaling",
    description: "Permanently raises your health cap for the current match.",
    color: "#ffcf5a",
    Icon: HeartPlus,
  },
  {
    name: "Magnet",
    role: "Gather",
    description: "Pulls nearby pickups toward you for a fast collection run.",
    color: "#b56cff",
    Icon: Magnet,
  },
  {
    name: "Overdrive",
    role: "Multiplier",
    description: "Temporarily boosts pickup, combat, and boss reward points.",
    color: "#ffd166",
    Icon: Percent,
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42 },
  },
}

export function Powerups() {
  return (
    <section className="px-4 py-24" id="powerups">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p className="mb-3 font-mono text-sm uppercase tracking-[0.24em] text-primary">
              Arena Powerups
            </p>
            <h2 className="max-w-2xl text-3xl font-bold text-balance sm:text-4xl">
              Grab the right orb at the right time
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground md:text-right">
            Powerups shape each round. Some help you survive, some help you score, and the rare ones can flip a fight.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          {powerups.map((powerup) => (
            <motion.div
              key={powerup.name}
              variants={itemVariants}
              className="group relative overflow-hidden rounded-lg border border-border bg-card/45 p-5 transition-colors duration-300 hover:border-primary/50"
            >
              <div
                className="absolute inset-x-0 top-0 h-1 opacity-80"
                style={{ backgroundColor: powerup.color }}
              />
              <div className="mb-5 flex items-center justify-between gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-lg border bg-secondary/60"
                  style={{
                    borderColor: `${powerup.color}66`,
                    boxShadow: `0 0 18px ${powerup.color}33`,
                  }}
                >
                  <powerup.Icon className="h-5 w-5" style={{ color: powerup.color }} />
                </div>
                <span className="rounded-md border border-border bg-secondary/50 px-2 py-1 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
                  {powerup.role}
                </span>
              </div>

              <h3 className="mb-2 text-base font-semibold text-foreground">{powerup.name}</h3>
              <p className="text-sm leading-6 text-muted-foreground">{powerup.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
