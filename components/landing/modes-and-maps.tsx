"use client"

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import { Activity, Crosshair, Flame, Gauge, Leaf, Map as MapIcon, Shield, Skull, Snowflake, Target, Trophy } from "lucide-react"
import type { DifficultyLevel, GameMode, MapTheme } from "@/types/game"
import { DIFFICULTY_LEVELS, GAME_MODES, MAP_THEMES } from "@/lib/game/constants"

const modeIcons: Record<GameMode, LucideIcon> = {
  score: Trophy,
  warden: Crosshair,
  survival: Shield,
  control: Activity,
}

const difficultyIcons: Record<DifficultyLevel, LucideIcon> = {
  casual: Shield,
  standard: Gauge,
  hardcore: Skull,
}

const mapIcons: Record<MapTheme, LucideIcon> = {
  cyber: MapIcon,
  neon: Activity,
  void: Target,
  frost: Snowflake,
  foundry: Flame,
  garden: Leaf,
}

export function ModesAndMaps() {
  return (
    <section className="px-4 py-24" id="modes">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold text-balance sm:text-4xl">
            More Than One Way to <span className="text-primary">Win</span>
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground text-balance">
            Pick a ruleset, choose how brutal the match should feel, then drop into an arena with its own routing problems.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Game Modes</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {(Object.keys(GAME_MODES) as GameMode[]).map((mode) => {
                const Icon = modeIcons[mode]
                return (
                  <div key={mode} className="rounded-lg border border-border bg-card/50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">{GAME_MODES[mode].name}</h4>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{GAME_MODES[mode].description}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Arena Maps</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(MAP_THEMES) as MapTheme[]).map((theme) => {
                const Icon = mapIcons[theme]
                return (
                  <div key={theme} className="rounded-lg border border-border bg-card/50 p-4">
                    <div
                      className="mb-3 h-2 rounded-full"
                      style={{ background: `linear-gradient(90deg, ${MAP_THEMES[theme].gridGlow}, ${MAP_THEMES[theme].accentColor})` }}
                    />
                    <div className="mb-2 flex items-center gap-2">
                      <Icon className="h-5 w-5" style={{ color: MAP_THEMES[theme].gridGlow }} />
                      <h4 className="font-semibold">{MAP_THEMES[theme].name}</h4>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{MAP_THEMES[theme].description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {(Object.keys(DIFFICULTY_LEVELS) as DifficultyLevel[]).map((difficulty) => {
            const Icon = difficultyIcons[difficulty]
            return (
              <div key={difficulty} className="rounded-lg border border-border bg-card/45 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-5 w-5 text-accent" />
                  <h4 className="font-semibold">{DIFFICULTY_LEVELS[difficulty].name}</h4>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{DIFFICULTY_LEVELS[difficulty].description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
