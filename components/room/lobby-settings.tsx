"use client"

import { useCallback, useMemo, memo } from "react"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { LucideIcon } from "lucide-react"
import { Activity, Crosshair, Flame, Gauge, Leaf, Map as MapIcon, Settings, Shield, Skull, Snowflake, Target, Trophy } from "lucide-react"
import type { DifficultyLevel, GameMode, MapTheme, RoomSettings } from "@/types/game"
import { DIFFICULTY_LEVELS, GAME_MODES, MAP_THEMES, MATCH } from "@/lib/game/constants"

interface LobbySettingsProps {
  settings: RoomSettings
  onSettingsChange: (settings: Partial<RoomSettings>) => void
  isHost: boolean
}

export const LobbySettings = memo(function LobbySettings({ settings, onSettingsChange, isHost }: LobbySettingsProps) {
  const handleDurationChange = useCallback((value: number[]) => {
    onSettingsChange({ matchDuration: value[0] })
  }, [onSettingsChange])

  const handleMaxPlayersChange = useCallback((value: string) => {
    onSettingsChange({ maxPlayers: parseInt(value, 10) })
  }, [onSettingsChange])

  const handleThemeChange = useCallback((value: MapTheme) => {
    onSettingsChange({ mapTheme: value })
  }, [onSettingsChange])

  const handleDifficultyChange = useCallback((value: DifficultyLevel) => {
    onSettingsChange({ difficulty: value })
  }, [onSettingsChange])

  const handleGameModeChange = useCallback((value: GameMode) => {
    onSettingsChange({ gameMode: value })
  }, [onSettingsChange])
  
  // Memoize the slider value to prevent re-renders
  const sliderValue = useMemo(() => [settings.matchDuration], [settings.matchDuration])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    return `${mins} min`
  }

  const gameModeIcons: Record<GameMode, LucideIcon> = {
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

  return (
    <div className="space-y-6 p-4 rounded-lg bg-card/50 border border-border">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Settings className="w-5 h-5 text-primary" />
        <span>Match Settings</span>
        {!isHost && (
          <span className="text-xs text-muted-foreground ml-2">(Host only)</span>
        )}
      </div>

      {/* Match Duration */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Match Duration</Label>
          <span className="text-sm text-primary font-mono">
            {formatDuration(settings.matchDuration)}
          </span>
        </div>
        <Slider
          value={sliderValue}
          onValueChange={handleDurationChange}
          min={MATCH.MIN_DURATION}
          max={MATCH.MAX_DURATION}
          step={30}
          disabled={!isHost}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 min</span>
          <span>5 min</span>
        </div>
      </div>

      {/* Game Mode */}
      <div className="space-y-3">
        <Label>Game Mode</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.keys(GAME_MODES) as GameMode[]).map((mode) => {
            const Icon = gameModeIcons[mode]
            return (
              <button
                key={mode}
                onClick={() => isHost && handleGameModeChange(mode)}
                disabled={!isHost}
                className={`
                  min-h-[92px] rounded-lg border p-3 text-left transition-all
                  ${settings.gameMode === mode
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card/50 hover:border-primary/50"
                  }
                  ${!isHost && "opacity-50 cursor-not-allowed"}
                `}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">{GAME_MODES[mode].name}</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {GAME_MODES[mode].description}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Difficulty */}
      <div className="space-y-3">
        <Label>Difficulty</Label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(DIFFICULTY_LEVELS) as DifficultyLevel[]).map((difficulty) => {
            const Icon = difficultyIcons[difficulty]
            return (
              <button
                key={difficulty}
                onClick={() => isHost && handleDifficultyChange(difficulty)}
                disabled={!isHost}
                className={`
                  rounded-lg border p-3 text-left transition-all
                  ${settings.difficulty === difficulty
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card/50 hover:border-primary/50"
                  }
                  ${!isHost && "opacity-50 cursor-not-allowed"}
                `}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">{DIFFICULTY_LEVELS[difficulty].name}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {DIFFICULTY_LEVELS[difficulty].description}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Max Players */}
      <div className="space-y-3">
        <Label>Max Players</Label>
        <Select
          value={settings.maxPlayers.toString()}
          onValueChange={handleMaxPlayersChange}
          disabled={!isHost}
        >
          <SelectTrigger className="bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2, 3, 4, 5, 6, 7, 8].map((num) => (
              <SelectItem key={num} value={num.toString()}>
                {num} Players
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Map Theme */}
      <div className="space-y-3">
        <Label>Arena Map</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.keys(MAP_THEMES) as MapTheme[]).map((theme) => {
            const Icon = mapIcons[theme]
            return (
              <button
                key={theme}
                onClick={() => isHost && handleThemeChange(theme)}
                disabled={!isHost}
                className={`
                  rounded-lg border p-3 text-left transition-all
                  ${settings.mapTheme === theme
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card/50 hover:border-primary/50"
                  }
                  ${!isHost && "opacity-50 cursor-not-allowed"}
                `}
                style={{
                  boxShadow: settings.mapTheme === theme
                    ? `0 0 15px ${MAP_THEMES[theme].gridGlow}40`
                    : undefined,
                }}
              >
                <div
                  className="mb-3 h-8 w-full rounded"
                  style={{
                    background: `linear-gradient(135deg, ${MAP_THEMES[theme].background}, ${MAP_THEMES[theme].gridGlow}40)`,
                  }}
                />
                <div className="mb-1 flex items-center gap-2">
                  <Icon className="h-4 w-4" style={{ color: MAP_THEMES[theme].gridGlow }} />
                  <span className="text-sm font-semibold">{MAP_THEMES[theme].name}</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {MAP_THEMES[theme].description}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
})
